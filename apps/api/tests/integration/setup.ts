import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isDatabaseReachable, resetTestDatabase } from '../helpers/database.js';
import { loadTestEnvironment, requireTestDatabaseUrl } from '../helpers/environment.js';

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

export default async function setupIntegrationDatabase(): Promise<void> {
  // Keep the coordinator environment intact; workers validate their own configuration.
  const environment = { ...process.env };
  loadTestEnvironment(monorepoRoot, environment);
  const testDatabaseUrl = requireTestDatabaseUrl(environment);
  if (!(await isDatabaseReachable(testDatabaseUrl))) {
    throw new Error('PostgreSQL test database is unreachable. Check Docker and DATABASE_URL_TEST.');
  }
  // Integration tests start from committed migrations, never from leftover local state.
  resetTestDatabase(testDatabaseUrl, environment);
}
