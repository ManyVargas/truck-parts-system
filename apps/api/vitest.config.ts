import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    // The integration config inherits sequential files for the shared test database.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
