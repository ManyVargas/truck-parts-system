import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  checkDatabaseConnection: vi.fn(),
  checkMigrationsStatus: vi.fn(),
}));

vi.mock('../../../src/features/health/repository.js', () => ({
  HealthRepository: class {
    checkDatabaseConnection = repositoryMocks.checkDatabaseConnection;
    checkMigrationsStatus = repositoryMocks.checkMigrationsStatus;
  },
}));

const { createTestApp } = await import('../../helpers/app.js');

describe('health HTTP failure responses', () => {
  beforeEach(() => {
    repositoryMocks.checkDatabaseConnection.mockReset();
    repositoryMocks.checkMigrationsStatus.mockReset();
  });

  it('keeps liveness independent from the database', async () => {
    repositoryMocks.checkDatabaseConnection.mockResolvedValue(false);
    const response = await request(createTestApp()).get('/api/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(repositoryMocks.checkDatabaseConnection).not.toHaveBeenCalled();
  });

  it('returns 503 when the database is down', async () => {
    repositoryMocks.checkDatabaseConnection.mockResolvedValue(false);
    const response = await request(createTestApp()).get('/api/health/ready');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', database: 'down' });
  });

  it.each(['pending', 'unavailable'])(
    'returns 503 when migrations are %s even if PostgreSQL responds',
    async (migrations) => {
      repositoryMocks.checkDatabaseConnection.mockResolvedValue(true);
      repositoryMocks.checkMigrationsStatus.mockResolvedValue(migrations);
      const response = await request(createTestApp()).get('/api/health/ready');
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: 'error', database: 'up', migrations });
    },
  );
});
