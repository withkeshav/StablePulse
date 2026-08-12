# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Learn tab: plain-language lessons on stablecoins (what they are, how pegs work, collateral types, depeg causes, how to read the dashboard) plus a glossary.
- One-time localStorage migration from legacy `stablepulse:*` keys to `stablesense:*` (theme, refresh, compact) with automatic cleanup of the old cache prefix.

### Changed

- **Brand rename to StableSense** across UI, metadata, config keys, localStorage keys, package names, backend artifacts, and docs.
- Config keys renamed: `window.STABLEPULSE_CONFIG` to `window.STABLESENSE_CONFIG`, `STABLEPULSE_AI_API_BASE` to `STABLESENSE_AI_API_BASE`.
- Mobile bottom nav now scrolls horizontally so the added Learn tab keeps 44px touch targets at 375px.
- Backend artifacts renamed end-to-end: `stablesense.db`, `stablesense-backend.service`, `/opt/stablesense`, `/var/log/stablesense`; see `backend/README.md` for the VPS migration steps.

### Removed

- Nothing.

## [2.1.0] - 2026-08-11

### Added

- Top-5 stablecoin coverage: USDT, USDC, DAI, USDe and PYUSD (registry-driven, one config entry per coin).
- Browser-direct data layer (`src/lib/api.js`): fetches DefiLlama + CoinGecko straight from the visitor's browser with SWR caching, 60s throttle, 1h cache-first detail, 20s timeout, and stale-on-error fallback.
- Lite VPS backend (`backend/`): Fastify + SQLite (WAL) history accumulation, cron jobs (`jobs/fetch.js` every 10 min, `jobs/ai.js` gated on `AI_CADENCE_MIN`), endpoints `/api/healthz`, `/api/ai`, `/api/history`.
- Deterministic client-side alert engine (`generateAlerts` in `derive.js`): PEG_BREAK, CHAIN_SPIKE, MEGA_SUPPLY, DOM_SHIFT with per-coin thresholds; explanations rendered locally (no per-alert AI round-trip).
- AI narrative ticker showing last-updated / next-update times from the backend.

### Changed

- Dropped the Cloudflare Worker `/api/dashboard` aggregator; the frontend no longer depends on a single pre-aggregated JSON payload.
- Runtime config key renamed from `apiBase` to `aiApiBase` (build-time `STABLEPULSE_AI_API_BASE`).
- Market-cap total now summed from all registered coins (DefiLlama no longer reports a global aggregate).
- README/docs updated for the hybrid topology; scaling playbook rewritten for the VPS backend.

### Fixed

- `totalMarketCap` was `undefined` under the new data layer; now computed by summing `peggedUSD` across `peggedAssets`.
- `megaSupplyUsd` thresholds for DAI, USDE, PYUSD were set above those coins' whole supply; corrected to sane relative values so MEGA_SUPPLY can fire.

## [2.0.0] - 2026-08-10

### Added

- Brand rename to **StablePulse** across UI, metadata, config keys, and docs.
- Config-driven stablecoin registry (`src/utils/coin-config.js`); adding a coin is a config-only change.
- Real auto-refresh with selectable interval and a manual **Refresh now** button.
- Background refreshes keep last-known data on screen with a "Refreshing" state (no blanking).
- Graceful degradation: errors keep last-good data with a banner; skeleton only on first load.
- Stale-while-revalidate behavior with a 20s fetch timeout and abort on unmount.
- Lazy-loaded Chart.js (Line/Bar only) so charts load on demand.
- Memoized derive and chart series computation to avoid per-second re-render cost.
- Content-visibility hints for below-fold sections.
- AI narrative and per-alert explanations rendered from whatever the worker returns (provider-agnostic).
- Theme settings: Light default, with Dark and System options.
- Security policy (`SECURITY.md`), agent conventions (`AGENTS.md`), architecture/API/scaling docs, CI workflow, and issue templates.
- Source-available license, README, changelog, and release packaging (`license`, `engines`, npm test script).

### Fixed

- "Supply History" chart was flat; now shows real history.
- `buildShareSeries` date-bucket bug (caught by new unit tests).
- Formatter placeholders consistently render a single hyphen for null/unknown values.
- Header height on notched/landscape phones: now accounts for the safe-area inset.
- Tap-highlight on mobile buttons; text-size adjustment for iOS.
- Whale-watch table overflow guard; Tron/Eth compare stacks on very small screens.

### Changed

- Default theme is Light (previously followed the OS via System).
- localStorage keys namespaced to `stablepulse:*`.
- Runtime config global renamed to `window.STABLEPULSE_CONFIG`; build-time env to `STABLEPULSE_API_BASE`.
- Unified theme handling in a single hook and a pre-paint bootstrap script.

## [1.0.0] - before 2026-08-10

Initial internal release of the intelligence dashboard (prior to open-source packaging). No public changelog kept.

[Unreleased]: https://github.com/withkeshav/StableSense/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/withkeshav/StableSense/releases/tag/v2.1.0
[2.0.0]: https://github.com/withkeshav/StableSense/releases/tag/v2.0.0
