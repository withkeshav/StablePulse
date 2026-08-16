# API Protocol

This document covers how the frontend gets data: browser-direct calls to DefiLlama/CoinGecko, plus the optional backend endpoints for AI and history.

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
  "fetchedAt": 1720000000000
}
```

Per-coin keys use the registry entry's `coingeckoId` / `llamaStablecoinId`. Adding a coin requires only the config entry; the data layer resolves URLs generically.

## Backend endpoints (`aiApiBase`)

The backend is optional. When present it is served same-origin behind nginx (no CORS needed).

### `GET /api/healthz`

```jsonc
{ "ok": true, "db": "ok", "lastMarketSync": 1720000000000, "lastAiRun": 1720000000000, "now": 1720000000000 }
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

Alerts are generated **client-side** by `generateAlerts(data)` in `src/lib/derive.js` using per-coin thresholds from the registry. No backend round-trip:

```jsonc
{
  "id": "peg_break-usdt-<ts>",
  "rule": "PEG_BREAK",
  "coin": "USDT",
  "severity": "critical",
  "magnitude": 60,
  "timestamp": 1700000000000,
  "rationale": "USDT is -60 bps below the $1 peg."
}
```

Rules: `PEG_BREAK`, `CHAIN_SPIKE`, `MEGA_SUPPLY`, `DOM_SHIFT`. Explanations are deterministic via `alertExplanation(alert)`. When the optional backend is running, `jobs/stress.js` also persists each cycle's alerts to the `labels` table (readable via `GET /api/labels`), so historical alert context accumulates over time.

## Errors and empty states

- Upstream 404/503 or missing data: the UI shows "Waiting for first data sync" state; `refreshIntervalSec` fallback is 900.
- Any other non-OK status or network error keeps the last-known data and shows an error banner. The app does not blank.
- The frontend applies a **20s fetch timeout** and aborts in-flight requests on refresh/unmount.
