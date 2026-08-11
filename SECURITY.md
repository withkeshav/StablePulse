# Security Policy

## Reporting a vulnerability

If you find a security issue in StablePulse, please report it privately instead of opening a public issue.

- **Email / contact:** [Keshav Maheshwari](https://www.withkeshav.com) via the contact form on the site, or open a private advisory using [GitHub Security Advisories](https://github.com/withkeshav/StablePulse/security/advisories/new) for this repository.
- Please include the affected version, a minimal reproduction, and the impact.
- You should receive an acknowledgement within a few days, and a fix plan within two weeks where feasible.

## Scope

In scope:

- The frontend in this repository (`src/`, `index.html`, build configuration).
- The optional backend in `backend/` (Fastify + SQLite + cron jobs).
- Configuration resolution (`window.STABLEPULSE_CONFIG`, `STABLEPULSE_AI_API_BASE`).

Out of scope:

- Upstream data sources (CoinGecko, DefiLlama) and third-party libraries; report those to their respective projects.

## Security notes

- The frontend holds no secrets. The AI model key lives only in `backend/.env` (server-side) and never reaches the browser.
- Never commit `OPENAI_*` values or any other tokens to this repository.
- The backend exposes read-only endpoints (`/api/healthz`, `/api/ai`, `/api/history`) with no write surface. Bind it to localhost behind nginx; if it must be public, rate-limit `/api/ai` (e.g. `limit_req`).
- Upstream API responses are untrusted input; the frontend renders them through guarded formatters and `derive.js` sanitization.
- Browser-direct data calls come from visitor IPs and require no credentials; do not add keyed upstream calls that would leak secrets into the bundle.
