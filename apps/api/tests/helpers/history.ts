import { prisma } from '../../src/infrastructure/database/index.js';
import { requireTestDatabaseUrl } from './environment.js';

// Test-only fixture cleanup. TRUNCATE is an administrative privilege, not an app command.
export async function clearTestHistory() {
  const expected = requireTestDatabaseUrl();
  if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== expected) {
    throw new Error('History fixture cleanup requires DATABASE_URL_TEST.');
  }
  const rows = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (rows[0]?.name !== decodeURIComponent(new URL(expected).pathname.slice(1))) {
    throw new Error('Unexpected fixture database.');
  }
  await prisma.$executeRaw`TRUNCATE TABLE "HistoryEvent"`;
}
