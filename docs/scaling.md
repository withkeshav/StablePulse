# Scaling & Operations

Guidance for operating and scaling the lite VPS backend (`backend/`) plus the browser-direct data layer.

## Why browser-direct scales for free

Live market data is fetched from each visitor's own IP, so traffic is spread across many client IPs rather than hammering one origin. The backend is never in the hot path for live data, which keeps it tiny: it only accumulates history and serves the occasional AI narrative.

## Backend capacity

- SQLite (WAL) with 10-minute snapshots across 5 coins is tiny: roughly **0.5-1 MB per month**. Years of history fit in tens of MB; no database tuning needed until well past that.
- The backend handles a handful of requests per minute in normal operation (`/api/healthz`, `/api/ai`, occasional `/api/history`).
- `AI_CADENCE_MIN` (default 120) caps model spend and rate-limit pressure on the OpenAI-compatible provider.

## Operations

### Backups

- Use `sqlite3 backend/data/stablesense.db ".backup /path/to/backup.db"` (WAL-safe) on a cron, then ship the backup off-box. Do **not** `cp` the live DB file.

### Monitoring

- `GET /api/healthz` reports `lastMarketSync` and `lastAiRun`; alert if either goes stale (e.g. older than 30 min for market sync, 3x cadence for AI).
- Add a cron ping to an uptime monitor that hits `/api/healthz` and fails on non-`{"ok":true}`.
- Watch job logs for repeated upstream failures (DefiLlama/CoinGecko rate limits are the main risk).

## Growth paths

- **More coins:** registry-only change in `src/utils/coin-config.js`; snapshot rows grow a few percent. Nothing else changes.
- **More history:** the `snapshots` table is append-only per (coin, chain, ts); indexes on (coin, chain, ts) keep queries fast. At extreme size, archive partitions by month.
- **Postgres:** if SQLite is ever a bottleneck, the schema is simple and portable; only `lib/db.js` and the jobs' inserts change.
- **Multiple regions:** the backend is stateless except the DB. Run a primary writer; replicas can serve `/api/ai` reads with nightly backups shipped to them.

## Known limits

- `tickers` (~65 KB) is fetched lazily only when a coin tab opens and sliced to the top 8 exchange pairs client-side.
- Browser-direct data means each visitor pays the upstream rate limit of their own IP; the 60s throttle keeps this well within CoinGecko's free tier.
- The AI narrative is recomputed on a cadence, not on every refresh; the dashboard shows last-updated / next-update times so users know how fresh it is.
- Multi-tab dedupe is handled via inflight-request sharing + the localStorage cache; no BroadcastChannel coordination (acceptable at this scale).
