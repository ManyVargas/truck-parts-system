import { describe, expect, it } from 'vitest';

import { configureTestDatabase, requireTestDatabaseUrl } from '../../helpers/environment.js';

const developmentUrl = 'postgresql://localhost:5433/truck_parts_dev';
const testUrl = 'postgresql://localhost:5433/truck_parts_test';

describe('test database environment', () => {
  it('selects the separate test database for Prisma', () => {
    const environment = { DATABASE_URL: developmentUrl, DATABASE_URL_TEST: testUrl };
    configureTestDatabase(environment);
    expect(environment.DATABASE_URL).toBe(testUrl);
  });

  it('allows a test-only environment such as CI', () => {
    const environment: Record<string, string | undefined> = { DATABASE_URL_TEST: testUrl };
    configureTestDatabase(environment);
    expect(environment.DATABASE_URL).toBe(testUrl);
  });

  it('removes the development fallback when no test database is configured', () => {
    const environment = { DATABASE_URL: developmentUrl };
    expect(() => configureTestDatabase(environment)).not.toThrow();
    expect(environment.DATABASE_URL).toBeUndefined();
    expect(() => requireTestDatabaseUrl(environment)).toThrow('DATABASE_URL_TEST is required');
  });

  it.each([
    developmentUrl,
    'postgres://127.0.0.1:5433/truck_parts_dev?schema=tests',
    'postgresql://different-user@db:5432/truck_parts_%64ev',
  ])('rejects development database reuse through URL variations (%s)', (url) => {
    const environment = { DATABASE_URL: developmentUrl, DATABASE_URL_TEST: url };
    expect(() => configureTestDatabase(environment)).toThrow('different database name');
    expect(environment.DATABASE_URL).toBeUndefined();
  });

  it.each([
    '',
    '   ',
    'not-a-url',
    'https://localhost/truck_parts_test',
    'postgresql://localhost/',
  ])('rejects missing or invalid test URLs (%s)', (url) => {
    const environment = { DATABASE_URL: developmentUrl, DATABASE_URL_TEST: url };
    expect(() => configureTestDatabase(environment)).toThrow(/DATABASE_URL_TEST/);
    expect(environment.DATABASE_URL).toBeUndefined();
  });

  it('does not include credentials from a malformed URL in errors', () => {
    const environment = { DATABASE_URL_TEST: 'postgresql://user:private-password@[' };
    expect(() => configureTestDatabase(environment)).toThrow(
      'DATABASE_URL_TEST must be a valid PostgreSQL URL with a database name.',
    );
  });

  it('fails safely when the development URL cannot be compared', () => {
    const environment = { DATABASE_URL: 'invalid', DATABASE_URL_TEST: testUrl };
    expect(() => configureTestDatabase(environment)).toThrow('DATABASE_URL must be a valid');
    expect(environment.DATABASE_URL).toBeUndefined();
  });
});
