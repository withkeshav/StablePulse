# API Protocol

This document covers how the frontend gets data: browser-direct calls to DefiLlama/CoinGecko, plus the optional backend endpoints for AI, history, and canonical alerts.

## Base URL

- **Live market data:** hardcoded upstream URLs (DefiLlama, CoinGecko). No auth, no keys, CORS-open.
- **AI/backend:** resolved by `src/config.js` as `aiApiBase` (see [architecture.md](./architecture.md)):

  1. `window.STABLESENSE_CONFIG.aiApiBase` (runtime)
  2. `import.meta.env.STABLESENSE_AI_API_BASE` (build time)
  3. Default `''` (same origin; AI disabled unless a backend is served alongside)

## Browser-direct endpoints (`src/lib/api.js`)

| Endpoint | Purpose | Cache / TTL |
|---|---|---|
| `GET https://stablecoins.llama.fi/stablecoins` | Per-coin supply, chains, aggregate market cap | 60s throttle, SWR |
| `GET https://stablecoins.llama.fi/stablecoin/{id}` | Per-chain daily history (drives `derive.js`) | 1h cache-first, SWR |
| `GET https://api.coingecko.com/api/v3/simple/price` | Spot prices + 24h change/volume | 60s throttle, SWR |
| `GET https://api.coingecko.com/api/v3/coins/{id}/market_chart` | 90-day price history | 5 min, lazy (coin tab) |
| `GET https://api.coingecko.com/api/v3/coins/{id}/tickers` | Top exchange pairs | 5 min, lazy (coin tab) |

The frontend fetches these from the visitor's own IP. Requests are throttled, deduped inflight, cached in localStorage + an in-memory Map, and fall back to stale data on error. The **20s fetch timeout** applies to all fetches.

### Frontend data assembly

`src/lib/api.js` assembles the raw upstream responses into the shape `derive.js` expects:

```jsonc
{
  "cgSimple": { "tether": { "usd": 0.9999, "usd_24h_change": 0.01 } },
  "allStables": {
    "totalMarketCap": { "peggedUSD": 306000000000 },
    "peggedAssets": [ { "symbol": "USDT", "chainBalances": { "Ethereum": 80000000000 } } ],
    "chains": [ { "name": "Ethereum", "totalCirculatingUSD": { "peggedUSD": 1e11 } } ]
  },
  "usdtDetail": { "chainBalances": { "Ethereum": { "tokens": [ { "date": 1720000000, "circulating": { "peggedUSD": 8e10 } } ] } } },
  "usdcDetail": { ... },
  "daiDetail": { ... },
  "usdeDetail": { ... },
  "pyusdDetail": { ... },
  "intelligence": { "headline": "...", "narrative": "...", "implications": "...", "ts": 1720000000000 } | null,
  "fetchedAt": 1720000000000,
  "marketObservedAt": 1720000000000
}
```

`fetchedAt` is the browser check clock. `marketObservedAt` (or CoinGecko `last_updated_at` when present) is the upstream observation clock. See [data-sources.md](./data-sources.md) for how `src/lib/freshness.js` labels Current / Delayed / Stale / Unavailable.

Per-coin keys use the registry entry's `coingeckoId` / `llamaStablecoinId`. Adding a coin requires only the config entry; the data layer resolves URLs generically.

## Backend endpoints (`aiApiBase`)

The backend is optional. When present it is served same-origin behind nginx (no CORS needed).

### `GET /api/healthz`

```jsonc
{ "ok": true, "db": "ok", "lastMarketSync": 1720000000000, "lastSnapshotTs": 1720000000000, "lastAiRun": 1720000000000, "lastAlertEvent": 1720000000000, "alertEventCount": 0, "jobs": { "fetch": { "runId": "abc", "ok": true } }, "lastJobError": null, "now": 1720000000000 }
```

### `GET /api/ai`

Latest AI narrative, or `{ "intelligence": null }` if not generated yet:

```jsonc
{
  "intelligence": {
    "headline": "Stablecoin flows show mild flight to Tron.",
    "narrative": "Net issuance remains positive while yields compress.",
    "implications": "Watch peg drift on Tron if inflows persist.",
    "model": "gpt-4o-mini",
    "ts": 1720000000000,
    "nextUpdateAt": 1720007200000,
    "cadenceMin": 120
  }
}
```

### `GET /api/history?coin=USDT[&chain=Ethereum][&days=30]`

Daily supply series from the proprietary SQLite dataset:

```jsonc
{ "data": [ { "ts": 1720000000000, "value": 80000000000 } ] }
```

### `GET /api/stress?[coin=USDT][&days=30]`

Per-coin peg stress index over time, from the `stress_series` table (written every 10 minutes by `jobs/stress.js`). Optional coin filter and day window (default 30, max 365):

```jsonc
{
  "data": [
    { "ts": 1720000000000, "symbol": "USDT", "peg_stress_index": 6, "z_score": 1.2, "raw_delta": 50000000, "normalized_delta": 0.05 }
  ]
}
```

### `GET /api/labels?[coin=USDT][&days=30][&limit=50]`

Stored alert history from the `labels` table (written by `jobs/stress.js` from the same `generateAlerts()` the frontend uses). Optional coin filter, day window, and row limit (default 50, max 200):

```jsonc
{
  "data": [
    { "ts": 1720000000000, "symbol": "USDT", "alert_type": "PEG_BREAK", "severity": "CRITICAL", "explanation": "USDT is -60 bps below the $1 peg.", "magnitude": 60 }
  ]
}
```

## Alerts

Alerts are derived by `generateAlerts(data)` in `src/lib/derive.js` from per-coin thresholds. Event time is the upstream observation (`observedAt`), never the browser clock. When the optional backend is running, `jobs/stress.js` persists the same events to `alert_events` and the UI prefers `GET /api/alerts` as the canonical feed. If that table is empty, the UI says so and shows live derivation until the first job writes rows.

```jsonc
{
  "id": "migration-dai-<fingerprint>",
  "rule": "MIGRATION",
  "coin": "DAI",
  "severity": "WARNING",
  "magnitude": 391000000,
  "grossFlow": 391000000,
  "netSupplyDelta": 0,
  "observedAt": 1720000000000,
  "detectedAt": 1720000400000,
  "intervalLabel": "in the last 24h",
  "headline": "DAI liquidity moved: Polygon → Ethereum",
  "state": "open"
}
```

Rules: `PEG_BREAK`, `CHAIN_FLOW`, `MIGRATION`, `NET_MINT`, `NET_BURN`, `DOM_SHIFT`, `DATA_QUALITY`. Explanations are deterministic via `alertExplanation(alert)`.

### `GET /api/alerts?[coin=DAI][&days=30][&state=open|resolved|all]`

Canonical lifecycle records from `alert_events`:

```jsonc
{
  "data": [ { "id": "migration-dai-…", "rule": "MIGRATION", "state": "open" } ],
  "meta": { "persistedCount": 1, "empty": false, "canonical": true }
}
```

## Errors and empty states

- Upstream 404/503 or missing data: the UI shows "Waiting for first data sync" state; `refreshIntervalSec` fallback is 900.
- Any other non-OK status or network error keeps the last-known data and shows an error banner. The app does not blank.
- The frontend applies a **20s fetch timeout** and aborts in-flight requests on refresh/unmount.
