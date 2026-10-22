import { defineConfig } from 'vitest/config';

// Unit tests cover pure domain logic only; Playwright owns e2e/.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
