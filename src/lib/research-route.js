/**
 * Slashless /research must open the hub, not the SPA dashboard.
 * nginx 301s this in production; the SPA HTML also redirects as a fallback.
 */
export function researchHubLocation(pathname, search = '', hash = '') {
  if (pathname === '/research') return `/research/${search}${hash}`;
  return null;
}
