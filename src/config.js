const DEFAULT_API_BASE = 'https://stablescope-cors.keshav-maheshwari.workers.dev';
const DEV_API_BASE = 'http://127.0.0.1:8787';

/**
 * Resolved API base URL. Priority:
 *   1. window.STABLESCOPE_CONFIG.apiBase   (runtime override, set in index.html or deploy)
 *   2. import.meta.env.STABLESCOPE_API_BASE (build-time env var)
 *   3. Default: dev uses the local wrangler, prod uses the Cloudflare Worker.
 */
function resolveApiBase() {
  const fromWindow = typeof window !== 'undefined' ? window.STABLESCOPE_CONFIG?.apiBase : undefined;
  const fromEnv = import.meta.env?.STABLESCOPE_API_BASE;
  const candidate = fromWindow || fromEnv || (import.meta.env.DEV ? DEV_API_BASE : DEFAULT_API_BASE);
  return String(candidate).replace(/\/+$/, '');
}

export const APP_VERSION = 'v2.0.0';
export const apiBase = resolveApiBase();
