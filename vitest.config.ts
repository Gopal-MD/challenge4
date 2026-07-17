import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:3001'),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    // Use happy-dom instead of jsdom — it's faster and doesn't have
    // the ESM/CJS conflict from @csstools/* that affects @testing-library/jest-dom v6.
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Playwright E2E specs must be run via `npx playwright test`, NOT vitest
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/routeTree.gen.ts',
        'src/start.ts',
        'src/router.tsx',
        'src/routes/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40,
      },
    },
  },
});
