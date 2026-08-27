import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function getTestDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL_TEST;
}

export function deployMigrations(databaseUrl: string): void {
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
