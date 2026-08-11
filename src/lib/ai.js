import { aiApiBase } from '../config.js';

/**
 * Fetch the AI narrative payload from the backend. Degrades to null when no
 * backend is configured or the request fails, so the UI always renders with
 * or without AI context. The worker/backend returns either a nested
 * `{ intelligence: { headline, narrative, implications } }` envelope or a
 * flat `{ headline, narrative, implications }` object; both are accepted.
 */
export async function fetchIntelligence({ signal } = {}) {
  if (!aiApiBase) return null;
  try {
    const res = await fetch(`${aiApiBase}/api/ai`, { signal });
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload?.intelligence) return payload.intelligence;
    if (payload?.headline) return payload;
    return null;
  } catch {
    return null;
  }
}
