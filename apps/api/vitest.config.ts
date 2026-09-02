import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Integration tests share one PostgreSQL database; run files sequentially.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
