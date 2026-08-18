# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.0] - 2026-08-18

### Fixed
- **Truthful freshness:** the dashboard no longer treats browser `Date.now()` as market time. The strip shows Checked (this fetch), Market observed (upstream snapshot), and Historical snapshot (SQLite), with Current / Delayed / Stale / Unavailable state. A missing optional backend snapshot does not mark a successful live fetch as Unavailable; DefiLlama's daily supply age (for example 8h) is on cadence, not a failed check.
- **Alert event time:** alerts use source observation timestamps and a stable event fingerprint. Reloading does not mint a new "2m ago" event.
- **DAI-style opposing flows:** matched chain deltas within 10% become one `MIGRATION` event (gross + net) and the paired child flow cards are suppressed from the primary feed.
- **Interval wording:** "in the last 24h" is used only when the two snapshots are 20-28 hours apart; otherwise the copy names the actual gap and confidence drops.
- **Mobile Home:** metric chips under Peg Stability Index and chart grids stack full width at phone widths (Icewater desktop rules no longer override the mobile stack). Chart canvases are 280-340px tall.
- **`/research` deep link:** nginx exact `location = /research` 301s to `/research/` before SPA fallback.

### Added
- Canonical `alert_events` SQLite table and `GET /api/alerts` lifecycle feed (open / resolved). Current Alerts and Learn history share the same event IDs.
- Signal Card share stays outside the canvas (toolbar / mobile bottom sheet) with Story, Square, and Landscape export.

### Changed
- Alert rules: `CHAIN_FLOW`, `MIGRATION`, `NET_MINT`, `NET_BURN` (legacy CHAIN_SPIKE / MEGA_SUPPLY explanations still apply). Filters by severity and coin are unchanged.

### Docs
- Public docs (README, architecture, API protocol, data sources, scaling, backend README, SECURITY, issue templates) aligned to three-clock freshness, canonical `alert_events`, `/research` redirect, and source-available (not OSI) licensing. Local agent notes stay unpublished.

## [3.5.1] - 2026-08-16

### Fixed
- **Mobile Market Pulse:** hero stacks vertically with full-width stability gauge and 2-column peg chips (no clipped two-column desktop layout).
- **Mobile charts:** supply/peg and other dashboard grids force single column with `min-width: 0`, ~260px chart height, and no page-level horizontal overflow.
- **Signal Card sheet:** true mobile bottom sheet with focus trap, Escape/backdrop close, body scroll lock, and **Download Signal Card** primary action.
- **Share control:** moved out of the canvas/legend into a labeled Share toolbar (desktop + mobile).

### Changed
- **Mobile nav:** Dashboard · Assets · Research · Alerts · More (Assets opens picker; More opens instrument rail; selected asset stays labeled).
- **First-run tour:** compact banner under Market Pulse with Skip (no full-screen dimmer).
- **Chains:** learner takeaway plus per-coin Top-5 chain cards (absolute multi-coin bar chart removed from this view).
- **Research matrix:** stacked comparison cards on phones; desktop matrix retained.
- **Alerts empty state:** "No material stress detected in this refresh" with four rule cards; filters muted when zero events.
- **P2 polish:** Research Hub canonical line, desktop Share label, darker-theme helper text contrast.

### Docs
- README and architecture docs aligned to the five-item mobile nav, stacked Market Pulse/charts, Share toolbar, and Signal Card sheet.
- Changelog wording scrubbed of unpublished local tooling paths; packaging described as source-available (not open-source).

## [3.5.0] - 2026-08-16

### Added
- **Icewater Instrument shell:** fixed instrument rail, utility topbar, Glacier Blue accent tokens, Manrope + DM Serif Display, light page background (`--page-bg: #F7F5F2`).
- **In-app Research tab** with shelf links to `/research/` and an interactive depeg case study. Case data is imported from `research/data.js` (no duplicated article facts).
- **Brand assets:** SVG brand mark in chrome, optimized PNG wordmark, Signal Lens / learn-orb / case-study art on hero and Research surfaces only.
- **Signal Cards:** share sheet formats (Story / Square / Landscape) via ChartWrapper + ShareSheet.
- **Asset page hierarchy** for coin tabs (hero, metrics, peg, score, supply, chains, learn CTA).

### Changed
- **Mobile:** bottom nav preserved; hamburger opens the instrument rail as a drawer.
- **Research hub depeg section** rewritten as mechanism selector / flow / matrix / takeaways (still canonical full hub at `/research/`).
- **Coin colors** remapped to Icewater blues / violet / amber / coral (no finance green).
- **Decorative washes softened:** learn orb opacity 0.05, lighter hero art, guide lines use `--blue-line`.
- Stability gauge displays `100 - stress.score` while stress math in `derive.js` stays unchanged.

### Docs
- Public docs updated for dual Research surfaces and the Icewater shell. Unpublished local tooling notes are excluded from the repository.

## [3.4.0] - 2026-08-16

### Pass 1 - Data honesty

#### Fixed
- **Remittance calculator rebuilt as author's model:** the old `4.65% + $245 fixed` formula printed ~$46,745 at $1,000,000 (a retail remittance percentage applied to a wholesale ticket with a fake fixed SWIFT fee). Replaced with named assumption schedules (RPW-like retail at $200/$500 only, SME wire 2% + $40, commercial 25 bp + $25), stacked rows for every lever (wire fee, FX markup, float, on-ramp, gas, off-ramp), float as its own line, a 6-row sourced scenario table, and a "full cash-to-cash" preset. Default amount changed to $200 (the World Bank RPW measurement point). RPW-like schedule warns above $500. Learn lesson, hub thesis, and race bar rewritten in lockstep to tell one story. Kills the $46,745-at-$1M and $710-at-$10k bugs.
- **z-score display cap:** uncapped z-scores (e.g. 1693.8sigma for a $2M move on a quiet chain) now display as `>10sigma` with the raw value in a tooltip. Added a "Share of tracked" percentage column to contextualize small-chain spikes against total flow.
- **$1 peg line + shared band:** Home Peg Monitor and coin-tab price chart now both show a dashed $1 reference line and share the same `pegBand` helper so they cannot drift apart. The coin tab previously had neither band nor line.
- **Chain Rankings sort + relabel:** table was unsorted vendor order (Manta #1 at $6M, Tron #7 at $92B). Now sorts descending by stablecoin circulating supply. Header relabeled from "Total TVL" to "Stablecoin Circulating" (the field is `totalCirculatingUSD.peggedUSD`, not TVL). Added name search with stable rank numbers. Migration Detector relabeled "(approximate)" since DefiLlama gives per-chain deltas, not directed hops.
- **Exchange-ticker dedupe:** CoinGecko feed listed BTCC twice. New `dedupeTickers` helper deduplicates by `market.identifier` and suffixes name collisions ("BTCC", "BTCC (2)").
- **Supply chart humanized ticks:** y-axis no longer renders `80,000,000,000`; uses `fmtB` ($80B). Added Log and "% from start" toggles on Home and coin supply charts. Registered `LogarithmicScale` in ChartWrapper.
- **Taxonomy aria-label:** said "Fiat-USD dominates at over 95%" while the caption said 15-16% other. Re-derived from the chart's own data (83.8% fiat-USD); aria-label now says "around 84%", consistent with the caption.

### Pass 2 - Teachable metrics

#### Added
- **Dominance chart** on the coin tab using the previously-ready-but-uncharted `buildShareSeries` helper. Shows the coin's share of tracked stablecoin supply over time with a percent axis.
- **Peg deviation in bps chart** on the coin tab. Fixed -50/+50 bps bounds prevent the auto-band exaggeration the price chart still suffers from. Dashed 0 bps reference line.
- **Mint/burn color legend** in CapitalFlows. A one-line coin-color key above the bars explains which color is which coin; per-segment `title` tooltips show the per-coin delta.
- **Empty-state alert primer:** new `AlertPrimer.jsx` replaces the bare "No active alerts." with a one-paragraph explanation of the four alert rules (PEG_BREAK, CHAIN_SPIKE, MEGA_SUPPLY, DOM_SHIFT). Wired into SignalSummary (compact) and AlertsTab (full, zero-alerts case).

### Pass 3 - Research hub editorial

#### Added
- **Yield-bearing stablecoin debate** (extends Banks section): four cited callouts (CRS IF13173/IF13174, State Street Apr 2026, BPI citing Cong/Chiu, Federal Reserve Dec 2025) covering the GENIUS Act yield prohibition and the contested macro-stability implications.
- **BPI full-journey callout** next to the remittance calculator: the Bank Policy Institute Jul 2026 finding that stablecoins showed no systematic cost advantage (0.3-9% across ten corridors; on/off-ramp FX dominated; speed followed the local rail).
- **T-bill maturity-band visual** (extends Treasury section): reserve composition by maturity for Tether and Circle from their Q1 2026 attestations. Teaches why issuers prefer short-term bills (redemption liquidity) and the Yadav/Malone interdependence point.
- **GENIUS Act rulemaking status** (extends Regulation section): a dated paragraph (not a live tracker, no review-cadence promise) summarizing status as of Aug 2026: 26 rulemakings across 6 agencies, 10 NPRMs issued, 0 final rules, full implementation Jan 18, 2027.

### Pass 4 - Insight engine (backend lock lifted)

#### Added
- **`stress_series` + `labels` SQLite tables** (`backend/lib/db.js`): INTEGER ts, WITHOUT ROWID, composite primary keys, matching the existing `snapshots` convention. Indexes on `(symbol, ts)`.
- **`backend/jobs/stress.js`:** a third cron job that reads the latest snapshots, reuses `computePegStress` and `generateAlerts` from derive.js, and writes per-coin stress index, z-score, raw delta, and normalized delta to `stress_series`, plus active alerts to `labels`. Runs every 10 minutes after fetch with a 60s sleep. Verified end-to-end against seed data.
- **`ai.js` prompt rewrite:** SYSTEM_PROMPT now asks the model to answer "why is this interesting" and "how was this computed" in student-explainable language. `buildContext` extended to read from the new `stress_series` and `labels` tables. Kept JSON-only, cadence self-gate, and fallback model. No second narrative job.
- **`/api/labels` and `/api/stress` endpoints** (`backend/server.js`): expose stored alert history and stress series so the Learn tab can read accumulated events.
- **Learn case-studies lesson:** new "Case studies: when the signal was real" lesson covering UST/Terra May 2022 and USR March 2026. USR is explicitly framed as "key compromise / unbacked mint" (an exploit), not "our index called it" (a pre-depeg signal), per synthesis section 6.6.

### Tests
- 18 new tests for the pure helpers (`pegBand`, `pegRefLine`, `pegChartOptions`, `toPercentFromFirst`, `dedupeTickers`, z-score cap, share-of-tracked). 124 total, all green.
- Backend stress job verified manually end-to-end (5 stress_series rows + 3 labels rows against seed data); no backend test harness added per the "tests target pure modules only" convention.

## [3.3.0] - 2026-08-12

### Fixed

- **USDE supply bug:** root cause was a case-sensitivity collision in `assembleLlama` - DefiLlama returns two assets with symbol "USDe" (id=146, Ethena, ~$3.95B) and "USDE" (id=264, XBANKING, ~$49K). The old case-sensitive `Set.has()` matched the XBANKING imposter. Fixed with case-insensitive match + id-priority disambiguation. Also added `dataQuality` flag, amber warning chip on StatCard, and SignalHero exclusion note.
- **Hub remittance calculator:** old formula (0.1% + $8 fixed) gave $8.05 at $50 (16%, worse than banks) and $18 at $10k (contradicted "under $10" headline). Rewritten to `networkFeeUsd: 0.10` + optional off-ramp spread checkbox; both rails shown simultaneously.
- **Hub hero $0 flicker:** fetch race could render $0. Guarded with "Loading..." initial state + partial-fetch annotation.
- **Hub forecast chart:** `parseFloat(range.replace(/[^0-9.]/g, ''))` mangled range strings. Rewritten as floating-bar bands with explicit `low`/`high` numeric fields + visual padding for narrow bands.
- **Dashboard peg chart:** auto-scaled 0-1.0, flattening peg drift. Now uses dynamic band around the series clamped to +/-2% of $1.
- **Hub depeg cards:** per-card min/max scaling made all three cards look identical. Now uses shared Y domain $0.00-$1.05, $1.00 reference line, 25 points, low-point labels, failure-mode captions.
- **Chains chart label overlap + 979px table:** added `maxRotation: 45, autoSkip: true`; mobile card-row layout already existed.
- **Dark-mode gridlines:** added `--grid-color: rgba(255,255,255,0.18)`.
- **SettingsPanel focus trap:** Tab now wraps within dialog; focus restored to settings button on close.
- **Hub Section 6 undefined buttons:** data shape mismatch fixed.

### Added

- Coin-tab anomalies section (Whale Watch per coin).
- Sidebar per-coin alert badges.
- Stat card 24h change chips.
- Outlined skeleton placeholders (replaced solid gray blocks).
- First-run tour (3 steps, localStorage-gated, dismissible).
- Chart zoom/pan (chartjs-plugin-zoom) on 90-day line charts + dbl-click reset.
- Share-as-screenshot on every chart card (Story/Square/Landscape, offscreen canvas composite, brand footer, no new deps beyond zoom plugin).
- Hub sticky reading progress bar + section-highlight TOC.
- Hub dark mode toggle.
- Hub CSV export for token comparison table.
- Mobile nav icons (SVG per tab type).
- `dataQuality` warning system for failed upstream fetches.
- Coin-config alias support (`llamaStablecoinAliases`).

### Changed

- Mobile chart sizing: dashboard `aspect-ratio: 16/7` in grid-2 under 768px; research `aspect-ratio: 16/8` on mobile.
- Coin-tab by-chain table: filters out $0 chains, sorts by supply, shows top-10.
- Share-as-screenshot uses direct `ctx.drawImage(chartCanvas)` instead of `toBase64Image()` roundtrip.

## [3.2.5] - 2026-08-12

### Added

- Research hub: "State of Stablecoins" at `/research/` - a public, fully-cited, chart-driven report on the stablecoin landscape and economic impact. Nine sections (taxonomy, scale, Treasury holdings, banks vs. stablecoins, cross-border payments, dollarization, depeg history, regulation, reality check) plus a live hero counter, remittance calculator, and deduplicated source list. Built as a separate static page (second Vite config) for SEO, not a Preact route.
- Hub cross-links from Learn's intro card, the bottom of the "Beyond the dollar" and "The bigger picture" modules, and the About tab. No nav slot added (mobile nav already at 10 items).
- Hub OG share image (`og.png`, 1200x630) with the engraved-ledger design - no headline number, per the numeric-claim-precision rule.
- Numeric-claim-precision standing rule: every prominent single-number display must state what it measures and excludes in the visible label.
- Hub build pipeline: `npm run build:research` (uses `vite.config.research.mjs`) and `npm run build:all`. nginx `/research/` location block added to `backend/deploy/nginx.conf`.
- App-wide meta tags strengthened in `index.html` (broader description mentioning the value-referenced-token definition, canonical URL, `og:url`, Twitter large-image card).

### Verified

- Four highest-stakes claims resolved against primary sources on 2026-08-12: Treasury-holder ranking (US Treasury TIC Jan 2023), GENIUS Act effective-date mechanics (Morgan Lewis + Congress.gov S.1582), SVB/USDC low ($0.8789 per CoinGecko Research), UST collapse figure (~$18B supply peak, ~$60B combined UST+LUNA loss per CoinMarketCap/Reuters/ScienceDirect). Resolutions and primary-source links live in the hub's methodology note.

## [3.2.0] - 2026-08-12

### Added

- Learn tab v3: two new modules ("Beyond the dollar", "The bigger picture") with 10 new lessons covering the value-referenced-token taxonomy (gold-backed, crypto-collateralized, synthetic, algorithmic, tokenized funds) and the macroeconomic impact (Treasury demand, bank disintermediation, cross-border payments, trust breaks, the global regulatory landscape).
- Per-lesson `lastUpdated` date field on fast-decaying content; rendered next to the lesson title. The five "bigger picture" lessons carry `2026-08-12`.
- Three new glossary terms: Reference asset, Tokenized fund, Funding rate.

### Changed

- Learn tab intro rewritten from the dollar-only frame ("a stablecoin should stay close to $1.00") to the broader value-referenced-token definition (stable relative to a reference, usually but not always USD). Tracked coins on the dashboard remain USD-pegged by design.
- First-time visitors now land in compact mode by default; an explicit prior choice in localStorage is still respected.

## [3.1.0] - 2026-08-12

### Added

- Learn tab v2: 16 lessons across 4 collapsible modules (Fundamentals, The ecosystem map, Risk & history, Regulation & outlook) plus an expanded 20-term glossary.
- Deterministic live observations (`src/lib/insights.js`): data-grounded callouts rendered inline under lessons (dominance, peg drift, chain concentration, collateral mix, alert count). Computed locally from dashboard data, no AI, no network, reproducible from the stat cards.
- Cross-links into Learn: a "What does this mean?" affordance under the Home peg-stress index, and per-rule "Learn" links inside alert cards that deep-link to the matching lesson.
- One-time localStorage migration from legacy `stablepulse:*` keys to `stablesense:*` (theme, refresh, compact) with automatic cleanup of the old cache prefix.

### Changed

- **Brand rename to StableSense** across UI, metadata, config keys, localStorage keys, package names, backend artifacts, and docs.
- Config keys renamed: `window.STABLEPULSE_CONFIG` to `window.STABLESENSE_CONFIG`, `STABLEPULSE_AI_API_BASE` to `STABLESENSE_AI_API_BASE`.
- Mobile bottom nav now scrolls horizontally so the added Learn tab keeps 44px touch targets at 375px.
- Backend artifacts renamed end-to-end: `stablesense.db`, `stablesense-backend.service`, `/opt/stablesense`, `/var/log/stablesense`; see `backend/README.md` for the VPS migration steps.
- Version aligned to 3.1.0 in `package.json` and in the `config.js` fallback string.

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
- README/docs updated for the hybrid topology; scaling guide rewritten for the VPS backend.

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
- Security policy (`SECURITY.md`), architecture/API/scaling docs, CI workflow, and issue templates.
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

Initial packaged release of the intelligence dashboard (prior to source-available packaging). No public changelog kept.

[3.6.0]: https://github.com/withkeshav/StableSense/releases/tag/v3.6.0
[3.5.1]: https://github.com/withkeshav/StableSense/releases/tag/v3.5.1
[3.4.0]: https://github.com/withkeshav/StableSense/releases/tag/v3.4.0
[3.3.0]: https://github.com/withkeshav/StableSense/releases/tag/v3.3.0
[3.2.5]: https://github.com/withkeshav/StableSense/releases/tag/v3.2.5
[3.2.0]: https://github.com/withkeshav/StableSense/releases/tag/v3.2.0
[3.1.0]: https://github.com/withkeshav/StableSense/releases/tag/v3.1.0
[2.1.0]: https://github.com/withkeshav/StableSense/releases/tag/v2.1.0
[2.0.0]: https://github.com/withkeshav/StableSense/releases/tag/v2.0.0
