# Architecture

StableSense is a mobile-first frontend with an optional lite backend. Live market data is fetched **directly in the browser** from DefiLlama and CoinGecko (both CORS-open and keyless). An optional VPS backend accumulates history and serves AI narratives.

## Data flow

```
Visitor's browser
  |- src/lib/api.js: DefiLlama /stablecoins, /stablecoin/{id}   (supply, chains, history)
  |- src/lib/api.js: CoinGecko  /simple/price, market_chart, tickers   (prices, charts)
  |- src/lib/derive.js: compute stress index, flows, migrations, whale watch, alerts
  |- src/lib/ai.js: /api/ai (same origin or aiApiBase)   (narrative, optional)

Backend (optional, lite VPS)
  |- jobs/fetch.js (cron, 10 min): DefiLlama + CoinGecko -> SQLite history dataset
  |- jobs/stress.js (cron, 10 min, runs after fetch): derive.js computePegStress + generateAlerts -> stress_series + labels + alert_events
  |- jobs/ai.js (cron, gated by AI_CADENCE_MIN): student-explainable narrative from snapshots + stress_series + alert_events
  |- server.js: /api/healthz, /api/ai, /api/history, /api/stress, /api/labels, /api/alerts
  |- job_runs: last fetch / stress / ai cycle (run id, ok, error, source timestamp)
```

The frontend makes its live-data calls from the visitor's own IP, so no single origin is hammered and no API keys are needed. It never depends on the backend for the core dashboard.

## Module map

| Module | Responsibility |
|---|---|
| `index.html` | Entry point, pre-paint theme bootstrap (default light), meta/favicon/manifest, runtime config global |
| `src/main.jsx` | Mounts `App` into `#app` |
| `src/config.js` | Resolves `aiApiBase` and exports `APP_VERSION` |
| `src/App.jsx` | Fetch loop, refresh/countdown state, tab routing, settings panel |
| `src/hooks/useTheme.js` | Theme state: Light default, Dark/System options |
| `src/lib/api.js` | Browser-direct data layer: DefiLlama + CoinGecko with SWR caching |
| `src/lib/ai.js` | AI narrative fetch from `aiApiBase` |
| `src/lib/freshness.js` | Three-clock data age: browser check, upstream observation, optional persisted snapshot |
| `src/lib/derive.js` | Pure display logic (framework-free, unit tested) |
| `src/lib/insights.js` | Pure Learn-tab observations from live data (framework-free, unit tested) |
| `src/utils/formatters.js` | Formatting helpers (pure, unit tested) |
| `src/utils/coin-config.js` | Stablecoin registry + active coin list (Icewater palette; no finance green) |
| `src/utils/depeg-cases.js` | Thin adapter over `research/data.js` depeg cases for the in-app Research tab (single source of truth) |
| `src/utils/asset-meta.js` | Per-coin copy/meta for asset pages |
| `src/components/Tabs/` | Views: Home, Coin, Research, Learn, Chains, Alerts, About. Learn covers the value-referenced-token taxonomy (peg mechanics, collateral types, gold/commodity, crypto-collateralized, synthetic, algorithmic, tokenized funds) plus the macroeconomic impact (Treasury demand, bank disintermediation, cross-border, depeg history, regulation); fast-decaying lessons carry a per-lesson `lastUpdated` date rendered next to the title |
| `src/components/Sections/` | Page content: signal hero, market pulse, capital flows, whale watch, summary, depeg case study |
| `src/components/ui/` | StatCard, Sparkline, ChartWrapper, ShareSheet, RefreshCountdown, SkeletonLoader, AiTicker |
| `src/components/` | Header, Sidebar (instrument rail), MobileNav, SettingsPanel, ThemeToggle, BrandMark |
| `src/styles.css` | Single stylesheet: Icewater tokens (`--page-bg`, Glacier Blue accent), light/dark themes, responsive rules |
| `backend/` | Optional Fastify + SQLite service: history, canonical alert events, AI narratives |

## Data layer (`src/lib/api.js`)

The frontend talks to upstream APIs directly. See [api-protocol.md](./api-protocol.md) for the exact endpoints and cache TTLs.

- **Light endpoints** (`/stablecoins`, `/simple/price`): 60s throttle, SWR.
- **Heavy detail** (`/stablecoin/{id}`): 1h cache-first, SWR.
- **Lazy** (`market_chart`, `tickers`): 5 min, loaded when a coin tab opens.
- localStorage + in-memory Map; stale-on-error fallback; 20s fetch timeout; inflight dedupe.

## Config resolution

`aiApiBase` resolves in this order (`src/config.js`):

1. `window.STABLESENSE_CONFIG.aiApiBase` (runtime override, set in `index.html` or before the bundle loads).
2. `import.meta.env.STABLESENSE_AI_API_BASE` (build-time env var).
3. Default: `''` (same origin; AI layer disabled when no backend is present).

Trailing slashes are stripped. The runtime override is how deployments on arbitrary hosts point at a backend without a rebuild.

## Display logic (`src/lib/derive.js`)

All functions are pure and deterministic, which is what makes them unit-testable:

- `buildSupplySeries(detail)`: 90-day supply history series for a coin's chart.
- `rankChainFlows(detailsByCoin)`: per-chain mint/burn deltas, ranked.
- `buildMigrationPairs(flows)`: migration detector, which chains are bleeding into which.
- `computePegStress({ pricesByCoin, alerts, topChainFlow })`: 0-100 stress index from peg drift, alerts, and flow pressure.
- `buildWhaleWatchRows(detailsByCoin, limit)`: z-score based supply anomaly rows.
- `buildShareSeries(supplyByCoin, targetCoin)`: target coin share of total supply over time.
- `buildAlertSparkSeries(alert, data)`: sparkline series for an alert.
- `generateAlerts(data)`: deterministic alert engine (PEG_BREAK, CHAIN_FLOW, MIGRATION, NET_MINT, NET_BURN, DOM_SHIFT, DATA_QUALITY). Event time is the upstream observation, never browser Date.now().
- `alertEventId` / `pairOpposingFlows`: stable fingerprints and 10% opposing-flow pairing for `MIGRATION` events.

The UI never re-computes these per animation frame: chart series and derive outputs are memoized, and the refresh countdown is isolated in `RefreshCountdown` so it re-renders alone.

## Backend (`backend/`)

See [backend/README.md](../backend/README.md). Fastify + SQLite (WAL), cron jobs for history, stress/alert persistence, and AI, served same-origin behind nginx. The `alert_events` table starts empty; the UI does not invent historical events.

## Theming

- Default theme is **Light**.
- `useTheme` persists the choice to `localStorage` under `stablesense:theme` (`light` / `dark` / `system`).
- A tiny inline script in `index.html` applies the effective theme before paint to avoid a flash.
- `System` follows `prefers-color-scheme` and updates live when the OS setting changes.

## Mobile

Mobile-first layout rules:

- Under 768px the instrument rail is a drawer (topbar hamburger or **More** in the bottom nav).
- Bottom navigation is five destinations: **Dashboard**, **Assets** (opens a focused coin picker), **Research**, **Alerts**, and **More**. Selected assets stay labeled on the Assets control.
- Market Pulse and chart grids stack to a single column; chart canvases use a fixed mobile height (280-340px). Share controls sit outside the plot as labeled actions; Signal Card export uses a bottom sheet.
- Home metric chips under Peg Stability Index are `grid-template-columns: 1fr` at phone width.
- Tables become stacked cards under 480px.
- 44px minimum touch targets, safe-area insets on header and bottom nav.
- Page-level horizontal overflow is clipped; layouts are verified from about 320px through desktop widths.

## Research surfaces

Two surfaces, one data source:

1. **Canonical hub** at `/research/` (static Vite build from `research/`). Full long-form article, charts, and mechanism-led depeg section.
2. **In-app Research tab** (`ResearchTab.jsx` + `DepegCaseStudy.jsx`) for shelf browsing and interactive case study. Case facts come from `research/data.js` via `src/utils/depeg-cases.js` so lows, dates, and takeaways cannot drift.

Hub logo links to the hub home; the live dashboard is a separately labeled link, never overloaded onto the brand mark.

## Research hub build (`/research`)

The "State of Stablecoins" research hub is a separate static build, not a Preact route, so crawlers get fully-rendered HTML content (the SPA's client-rendered tabs are invisible to link-preview crawlers and slower for first paint, which works against the hub's SEO goal).

- **Source:** `research/` (`index.html`, `styles.css`, `main.js`, `data.js`, `og.svg`/`og.png` in `research/public/`). The hub has its own engraved-ledger design system (`--hub-*` tokens), deliberately distinct from the dashboard's Icewater tokens. The two properties connect through one bridge element (the "Open the live dashboard" link), not a shared palette.
- **Build:** `npm run build:research` uses a second Vite config (`vite.config.research.mjs`) with `root: 'research'`, emitting to `dist/research/`. Chart.js is the only shared dependency, lazy-loaded as a separate chunk. `npm run build:all` builds both the SPA and the hub.
- **Serving:** nginx serves `dist/research/` at `/research/` via a dedicated `location` block. An exact `location = /research` 301s slashless URLs to `/research/` before the SPA fallback (see `backend/deploy/nginx.conf`). The hub is single-page-with-anchors (`#taxonomy`, `#treasury`, etc.); distinct per-section URLs are a flagged follow-up, not the current architecture.
- **Progressive enhancement:** `main.js` (loaded with `defer`) adds the live hero counter, IntersectionObserver scroll reveals, charts, chip filters, the remittance calculator, and accordion behavior. All section content renders as real HTML without it. Respects `prefers-reduced-motion` throughout.
