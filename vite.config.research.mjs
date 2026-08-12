import { defineConfig } from 'vite';

// Separate build for the /research hub. The hub is a standalone static page
// (not a Preact route) for SEO: every section renders as real HTML so crawlers
// get the full text without executing JS. main.js is a progressive-enhancement
// layer (counter, scroll reveals, charts, chips, calculator) that sits on top.
export default defineConfig({
  root: 'research',
  base: '/research/',
  publicDir: 'public',
  build: {
    outDir: '../dist/research',
    emptyOutDir: true,
    assetsInlineLimit: 100000000, // inline CSS into the HTML for first paint
    rollupOptions: {
      input: 'research/index.html',
      output: {
        // keep the og image as a stable, hashed asset instead of inlining it
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});