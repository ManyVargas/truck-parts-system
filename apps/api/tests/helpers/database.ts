import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function getTestDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL_TEST;
}

export async function isDatabaseReachable(databaseUrl: string): Promise<boolean> {
  const probeClient = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await probeClient.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probeClient.$disconnect();
  }
}

export function deployMigrations(databaseUrl: string): void {
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
