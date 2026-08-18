import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const nginxPath = resolve(here, '../../backend/deploy/nginx.conf');
const conf = readFileSync(nginxPath, 'utf8');

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
});
