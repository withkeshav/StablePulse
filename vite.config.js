import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  envPrefix: ['VITE_', 'STABLEPULSE_'],
});
