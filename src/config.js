/**
 * Resolved AI/backend API base URL. Priority:
 *   1. window.STABLEPULSE_CONFIG.aiApiBase  (runtime override, set in index.html or deploy)
 *   2. import.meta.env.STABLEPULSE_AI_API_BASE (build-time env var)
 *   3. '' -> same origin (nginx serves /api/ai next to the static frontend)
 *
 * An empty base means the AI layer is disabled and the UI degrades to
 * deterministic, locally computed signals.
 */
function resolveAiApiBase() {
  const fromWindow = typeof window !== 'undefined' ? window.STABLEPULSE_CONFIG?.aiApiBase : undefined;
  const fromEnv = import.meta.env?.STABLEPULSE_AI_API_BASE;
  const candidate = fromWindow || fromEnv || '';
  return String(candidate).replace(/\/+$/, '');
}

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'v2.0.0';
export const aiApiBase = resolveAiApiBase();
