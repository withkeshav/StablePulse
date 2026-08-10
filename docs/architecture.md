# Architecture

StablePulse is a static, mobile-first frontend. It fetches **one pre-aggregated JSON payload** from a backend (normally a Cloudflare Worker) and computes all display math client-side in pure functions.

## Data flow

```
Cloudflare Worker (cron background sync, separate repo)
  |- pulls DefiLlama chain balances + CoinGecko prices/tickers
  |- generates AI narrative (OpenAI-compatible, keys stay server-side)
  +- serves ONE cached JSON payload:  /api/dashboard
                     |
Static frontend (Cloudflare Pages / VPS / anywhere)
  +- fetches /api/dashboard -> derive.js computes display stats client-side
```

The frontend makes **one request per refresh**. It never calls CoinGecko or DefiLlama directly. See [api-protocol.md](./api-protocol.md) for the payload contract.

## Module map

| Module | Responsibility |
|---|---|
| `index.html` | Entry point, pre-paint theme bootstrap (default light), meta/favicon/manifest, runtime config global |
| `src/main.jsx` | Mounts `App` into `#app` |
| `src/config.js` | Resolves `apiBase` and exports `APP_VERSION` |
| `src/App.jsx` | Fetch loop, refresh/countdown state, tab routing, settings panel |
| `src/hooks/useTheme.js` | Theme state: Light default, Dark/System options |
| `src/lib/derive.js` | Pure display logic (framework-free, unit tested) |
| `src/utils/formatters.js` | Formatting helpers (pure, unit tested) |
| `src/utils/coin-config.js` | Stablecoin registry + active coin list |
| `src/components/Tabs/` | Views: Home, Coin, Chains, Alerts |
| `src/components/Sections/` | Page content: signal hero, market pulse, capital flows, whale watch, summary |
| `src/components/ui/` | StatCard, Sparkline, ChartWrapper, RefreshCountdown, SkeletonLoader |
| `src/components/` | Header, Sidebar, MobileNav, SettingsPanel, ThemeToggle |
| `src/styles.css` | Single stylesheet: variables, light/dark themes, responsive rules |

## Config resolution

`apiBase` resolves in this order (`src/config.js`):

1. `window.STABLEPULSE_CONFIG.apiBase` (runtime override, set in `index.html` or before the bundle loads).
2. `import.meta.env.STABLEPULSE_API_BASE` (build-time env var).
3. Default: dev uses `http://127.0.0.1:8787`, prod uses the Cloudflare Worker URL.

Trailing slashes are stripped. The runtime override is how deployments on arbitrary hosts (Pages, VPS) point at a backend without a rebuild.

## Display logic (`src/lib/derive.js`)

All functions are pure and deterministic, which is what makes them unit-testable:

- `buildSupplySeries(detail)`: 90-day supply history series for a coin's chart.
- `rankChainFlows(detailsByCoin)`: per-chain mint/burn deltas, ranked.
- `buildMigrationPairs(flows)`: migration detector, which chains are bleeding into which.
- `computePegStress({ pricesByCoin, alerts, topChainFlow })`: 0-100 stress index from peg drift, alerts, and flow pressure.
- `buildWhaleWatchRows(detailsByCoin, limit)`: z-score based supply anomaly rows.
- `buildShareSeries(supplyByCoin, targetCoin)`: target coin share of total supply over time.
- `buildAlertSparkSeries(alert, data)`: sparkline series for an alert.

The UI never re-computes these per animation frame: chart series and derive outputs are memoized, and the refresh countdown is isolated in `RefreshCountdown` so it re-renders alone.

## Theming

- Default theme is **Light**.
- `useTheme` persists the choice to `localStorage` under `stablepulse:theme` (`light` / `dark` / `system`).
- A tiny inline script in `index.html` applies the effective theme before paint to avoid a flash.
- `System` follows `prefers-color-scheme` and updates live when the OS setting changes.

## Mobile

Mobile-first is mandatory (see `AGENTS.md`):

- Sidebar hidden under 768px, bottom tab bar shown instead.
- Tables become stacked cards under 480px.
- 44px minimum touch targets, safe-area insets on header and bottom nav.
- Charts use responsive aspect ratios; the header height accounts for the notch in landscape.
