import { defineConfig } from 'vitest/config';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS (self-signed) is required for document.modelContext to be available
// on a LAN IP: Chrome only treats http:// as a secure context for
// localhost/127.0.0.1, never for a bare IP address. See CLAUDE.md's
// "How to test" section.
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
  },
  test: {
    // jsdom, not node: state.ts reads `location.search` at module load time.
    environment: 'jsdom',
  },
});
