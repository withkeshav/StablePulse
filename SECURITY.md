# Security Policy

## Reporting a vulnerability

If you find a security issue in StablePulse, please report it privately instead of opening a public issue.

- **Email / contact:** [Keshav Maheshwari](https://www.withkeshav.com) via the contact form on the site, or open a private advisory using [GitHub Security Advisories](https://github.com/withkeshav/StablePulse/security/advisories/new) for this repository.
- Please include the affected version, a minimal reproduction, and the impact.
- You should receive an acknowledgement within a few days, and a fix plan within two weeks where feasible.

## Scope

In scope:

- The frontend in this repository (`src/`, `index.html`, build configuration).
- Configuration resolution (`window.STABLEPULSE_CONFIG`, `STABLEPULSE_API_BASE`).

Out of scope:

- The backend worker (Cloudflare Worker) that serves `/api/dashboard` lives in a separate repository. Report worker issues there.
- Upstream data sources (CoinGecko, DefiLlama) and third-party libraries; report those to their respective projects.

## Security notes

- The frontend holds no secrets. API keys and model credentials are configured server-side only and never reach the browser.
- Never commit `OPENAI_*` values or any other tokens to this repository.
- The default API endpoint is a public Cloudflare Worker; treat its responses as untrusted input and rely on the client-side rendering guards in `src/lib/derive.js`.
