# API Protocol

The frontend is a **pure consumer** of a single pre-aggregated endpoint. It never calls CoinGecko or DefiLlama directly.

## Base URL

Resolved by `src/config.js` (see [architecture.md](./architecture.md)):

1. `window.STABLEPULSE_CONFIG.apiBase` (runtime)
2. `import.meta.env.STABLEPULSE_API_BASE` (build time)
3. Default: dev `http://127.0.0.1:8787`, prod the StablePulse Worker.

## GET /api/dashboard

One JSON payload, fetched by `src/App.jsx` on load and each refresh. Shape:

```jsonc
{
  "data": {
    "allStables": {
      "totalMarketCap": { "peggedUSD": 180000000000 },
      "peggedAssets": [ { "symbol": "USDT", "chainBalances": { "ethereum": 80000000000 }, "peggedUSD": 120000000000 } ]
    },
    "cgSimple": {
      "tether":     { "usd": 0.9999, "usd_24h_change": 0.01 },
      "usd-coin":   { "usd": 1.0001, "usd_24h_change": -0.01 }
    },
    "usdtDetail": { "chainBalances": { "tron": 50000000000, "ethereum": 40000000000 } },
    "usdcDetail": { "chainBalances": { "ethereum": 30000000000, "solana": 8000000000 } },
    "cgUSDTChart":  [ [1700000000000, 0.9999], [1700000064000, 1.0000] ],
    "cgUSDCChart":  [ [1700000000000, 1.0001], [1700000064000, 1.0000] ]
  },
  "alerts": [ {
    "id": "usdt-tron-1700000000",
    "coin": "USDT",
    "severity": "high",
    "rule": "chainSpike",
    "title": "USDT supply surged on Tron",
    "description": "USDT minted aggressively on Tron (+$1.2B in 24h).",
    "magnitude": 1.2e9,
    "timestamp": 1700000000000
  } ],
  "intelligence": {
    "headline": "Stablecoin flows show mild flight to Tron.",
    "narrative": "Net issuance remains positive while yields compress.",
    "implications": "Watch peg drift on Tron if inflows persist."
  },
  "lastUpdated": 1700000000000,
  "refreshIntervalSec": 300
}
```

### Frontend field usage

| Field | Consumed by |
|---|---|
| `data.allStables.peggedAssets` | Home stats, ChainsTab, per-coin asset lookup |
| `data.allStables.totalMarketCap.peggedUSD` | Home total market cap |
| `data.cgSimple[coingeckoId].usd` / `usd_24h_change` | Home + CoinTab price/change |
| `data.<coin>Detail.chainBalances` | Home chain flows, CoinTab chain rows, whale watch, migration pairs |
| `data.cg<COIN>Chart` | CoinTab supply/price history (per coin) |
| `alerts[]` | Alerts tab, stress index, sparklines, alert counts |
| `intelligence` | Home AI headline + AlertsHero narrative/implications |
| `lastUpdated` | Header status / freshness |
| `refreshIntervalSec` | Auto-refresh cadence (fallback 900) |

### Errors and empty states

- **404 / 503** or missing `data` means the worker has not completed a first background sync. The UI shows "Waiting for first background sync."
- Any other non-OK status or network error keeps the last-known data and shows an error banner. The app does not blank.
- The frontend applies a **20s fetch timeout** and aborts in-flight requests on refresh/unmount.

### Per-coin naming

Coin tabs are driven by `ACTIVE_STABLECOINS` in `src/utils/coin-config.js`. For each coin `SYMBOL`:

- Detail payload key: `` `${symbol.toLowerCase()}Detail` `` (e.g. `usdtDetail`, `usdcDetail`, `usdeDetail`).
- Chart payload key: `` `cg${SYMBOL}Chart` `` (e.g. `cgUSDTChart`).
- Price key: `cgSimple[coingeckoId]` where `coingeckoId` comes from the registry entry.

Adding a coin therefore requires the worker to serve these three key shapes.

## GET /api/alert-explain?id=<alertId>

On-demand AI explanation for a single alert. Called by `AlertCard` when the user expands an alert. Shape:

```jsonc
{
  "explanation": "Tron inflows accelerated after the Arbitrum yield spread narrowed.",
  "sources": ["chainBalanceDelta", "pegDrift"]
}
```

- The frontend renders `explanation` verbatim; `sources` is optional metadata.
- **Cache this response** in the worker (e.g. KV keyed by alert id) so repeat expansions are instant and do not hit the model each time.
- If AI is unavailable the endpoint should still return a useful message or the UI shows its fallback copy.

## CORS

The worker must return `Access-Control-Allow-Origin` for the origin serving the frontend:

- Dev: `http://localhost:5173` (or your Vite port) or `*`.
- Prod: your Cloudflare Pages / VPS domain, or `*`.

Both `/api/dashboard` and `/api/alert-explain` need the header.

## Timeouts and polling

- Frontend fetch timeout: 20s (`FETCH_TIMEOUT_MS` in `src/App.jsx`).
- Auto-refresh options: 60 / 180 / 300 / 600 / 900 seconds, persisted in `stablepulse:refresh`; the payload's `refreshIntervalSec` can override.
- The worker should serve the dashboard from a KV cache refreshed by cron so page loads are fast and never block on upstream APIs.
