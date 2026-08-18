# StableSense Backend

Lite VPS service that accumulates a proprietary historical dataset and serves
the AI narrative endpoint. It is the only part of StableSense that runs on an
operator-controlled IP: everything else is served to visitors directly from
the browser.

## What it does

- **`jobs/fetch.js`** (cron, every 10 min): pulls per-coin daily chain history
  from DefiLlama, spot prices + 24h change/volume from CoinGecko, and the
  aggregate stablecoin market cap. Rows are upserted into SQLite. The first
  run backfills the full daily history; later runs append only the newest day.
- **`jobs/stress.js`** (cron, every 10 min, after fetch): reads stored snapshots,
  runs the same `generateAlerts` / `computePegStress` logic as the dashboard, and
  writes `stress_series`, `labels`, and canonical `alert_events` (open/resolved).
  Event IDs are deterministic from coin, observation window, rule, and chains.
- **`jobs/ai.js`** (cron, checked every 30 min, self-gated on `AI_CADENCE_MIN`): builds a compact
  data brief from the accumulated snapshots and asks an OpenAI-compatible
  model for a short narrative. Falls back to `OPENAI_FALLBACK_MODEL` if the
  primary model errors. Freeform output is tolerated, JSON preferred. The
  crontab entry is only a cheap check; the model is called at most once per
  `AI_CADENCE_MIN` (default 120 minutes).
- **`server.js`**: Fastify API on `127.0.0.1:8787`.
  - `GET /api/healthz` - liveness, last market sync, last AI run, alert event count
  - `GET /api/ai` - latest narrative `{ intelligence: { headline, narrative, implications, model, ts, nextUpdateAt, cadenceMin } }`
  - `GET /api/history?coin=USDT[&chain=Ethereum][&days=30]` - daily supply series from the stored dataset
  - `GET /api/alerts?[coin=DAI][&days=30][&state=open|resolved|all]` - canonical alert lifecycle
  - `GET /api/labels` / `GET /api/stress` - stored labels and stress series

## Requirements

- Node.js >= 20 (better-sqlite3 ships prebuilds for Node 20/22/24)
- Ubuntu/Debian VPS (developed against Hostinger KVM2)

## Setup

```bash
cd backend
npm install
cp .env.example .env        # fill OPENAI_* values; never commit .env
npm run fetch               # backfills the dataset, creates data/stablesense.db
npm run stress              # writes stress series and canonical alert events
npm run ai                  # generates the first narrative (needs a valid key)
npm start                   # serves the API on 127.0.0.1:8787
```

Environment (`backend/.env`, git-ignored):

| Variable | Purpose |
|---|---|
| `PORT` | Fastify listen port (default 8787) |
| `DATA_DIR` | Where the SQLite DB lives (default `backend/data`) |
| `OPENAI_BASE_URL` | OpenAI-compatible endpoint root, e.g. `https://api.openai.com/v1` |
| `OPENAI_API_KEY` | Model API key (server-side only, never in the frontend) |
| `OPENAI_MODEL` | Primary model, e.g. `gpt-4o-mini` |
| `OPENAI_FALLBACK_MODEL` | Model used if the primary call fails |
| `AI_CADENCE_MIN` | Minimum minutes between narratives (default 120; self-gated) |

## Deploy

Copy `deploy/` files to the VPS:

```bash
sudo mkdir -p /opt/stablesense
sudo chown www-data:www-data /opt/stablesense
# place this repo (frontend + backend) at /opt/stablesense
sudo mkdir -p /var/log/stablesense /opt/stablesense/backups

# backend service
sudo cp backend/deploy/stablesense-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now stablesense-backend

# nginx: edit server_name, then
sudo cp backend/deploy/nginx.conf /etc/nginx/sites-available/stablesense
sudo ln -s /etc/nginx/sites-available/stablesense /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain   # TLS

# cron jobs (as the service user)
crontab -e      # paste the lines from deploy/crontab.txt
```

`nginx.conf` serves `dist/` and reverse-proxies `/api` to Fastify on the same
origin, so there is zero CORS. Slashless `/research` 301s to `/research/` before
the SPA fallback. The frontend reads `/api/healthz`, `/api/ai`, and `/api/alerts`
on the same origin.

## Notes

- WAL mode is on; the daily backup uses `sqlite3 .backup` which is
  WAL-safe (no plain `cp` of the db file).
- The frontend never talks to the model. The key exists only in `backend/.env`.
- No visitor traffic touches this service except the light `/api/ai`, `/api/alerts`, and `/api/healthz` reads.
