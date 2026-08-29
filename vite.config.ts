import { defineConfig } from 'vitest/config';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Dev serves plain http by default: on localhost Chrome treats http:// as a
// secure context anyway, so document.modelContext is there and nobody has to
// click through a self-signed certificate warning.
//
// Opt back in with `HTTPS=1 npm run dev -- --host` when testing from another
// device on the LAN. That case genuinely needs it — Chrome does NOT extend the
// localhost exemption to a bare 192.168.x.x address, so over plain http WebMCP
// silently disappears and the app quietly falls back to solo mode.
const https = process.env.HTTPS === '1';

export default defineConfig({
  // GitHub Pages serves this project at /collateral/, not the domain root.
  // CI (set by GitHub Actions) is the only environment that needs that
  // prefix; local dev and preview keep using '/'.
  base: process.env.CI ? '/collateral/' : '/',
  plugins: https ? [basicSsl()] : [],
  server: {
    https,
  },
  test: {
    // jsdom, not node: state.ts reads `location.search` at module load time.
    environment: 'jsdom',
  },
});
