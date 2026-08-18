import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { researchHubLocation } from './research-route.js';

const here = dirname(fileURLToPath(import.meta.url));
const nginxPath = resolve(here, '../../backend/deploy/nginx.conf');
const indexPath = resolve(here, '../../index.html');
const conf = readFileSync(nginxPath, 'utf8');
const indexHtml = readFileSync(indexPath, 'utf8');

function indexOf(snippet) {
  return conf.indexOf(snippet);
}

describe('research hub routing', () => {
  it('has an exact /research 301 to /research/ before the SPA fallback', () => {
    const exact = indexOf('location = /research');
    const hub = indexOf('location /research/');
    const spa = indexOf('location / {');
    expect(exact).toBeGreaterThan(-1);
    expect(hub).toBeGreaterThan(-1);
    expect(spa).toBeGreaterThan(-1);
    expect(exact).toBeLessThan(spa);
    expect(hub).toBeLessThan(spa);
    expect(conf).toMatch(/location = \/research\s*\{[^}]*return 301 \/research\//s);
  });

  it('keeps query strings on the slashless redirect', () => {
    expect(conf).toContain('return 301 /research/$is_args$args');
  });

  it('redirects slashless /research in the SPA HTML as a deploy fallback', () => {
    expect(indexHtml).toContain("location.pathname === '/research'");
    expect(indexHtml).toContain("location.replace('/research/'");
    expect(researchHubLocation('/research')).toBe('/research/');
    expect(researchHubLocation('/research', '?ref=1', '#taxonomy')).toBe('/research/?ref=1#taxonomy');
    expect(researchHubLocation('/research/')).toBeNull();
    expect(researchHubLocation('/')).toBeNull();
  });
});
