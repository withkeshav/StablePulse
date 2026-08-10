# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

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

[Unreleased]: https://github.com/withkeshav/StablePulse/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/withkeshav/StablePulse/releases/tag/v2.0.0
