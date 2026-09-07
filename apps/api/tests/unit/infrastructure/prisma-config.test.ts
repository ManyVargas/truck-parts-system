import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const configFile = fileURLToPath(new URL('../../fixtures/prisma.config.ts', import.meta.url));
const commandTimeoutMs = 10_000;

describe('Prisma configuration compatibility', () => {
  it('loads a config file and validates the schema with the dependency override', () => {
    const output = execFileSync(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'validate', '--config', configFile],
      {
        encoding: 'utf8',
        timeout: commandTimeoutMs,
        // Schema validation needs a URL but does not connect to PostgreSQL.
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://localhost:5432/truck_parts_test',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    expect(output).toContain('is valid');
  });
});
