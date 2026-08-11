import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import pkg from './package.json' assert { type: 'json' };

export default defineConfig({
  plugins: [preact()],
  envPrefix: ['VITE_', 'STABLEPULSE_'],
  define: { __APP_VERSION__: JSON.stringify('v' + pkg.version) },
});
