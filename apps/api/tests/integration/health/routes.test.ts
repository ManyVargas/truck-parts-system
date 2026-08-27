import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { disconnectPrisma } from '../../../src/infrastructure/database/index.js';
import { createTestApp } from '../../helpers/app.js';
import { deployMigrations, getTestDatabaseUrl } from '../../helpers/database.js';

const testDatabaseUrl = getTestDatabaseUrl();

describe.skipIf(!testDatabaseUrl)('health routes (integration)', () => {
  beforeAll(() => {
    deployMigrations(testDatabaseUrl!);
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('GET /api/health/live', () => {
    it('returns 200 with liveness payload', async () => {
      const response = await request(createTestApp()).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/health/ready', () => {
    it('returns 200 when PostgreSQL is reachable and migrations are applied', async () => {
      const response = await request(createTestApp()).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        database: 'up',
        migrations: 'up_to_date',
      });
    });
  });
});
