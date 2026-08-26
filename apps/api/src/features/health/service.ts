import { HealthRepository } from './repository.js';
import type { LivenessResponse, ReadinessResponse } from './types.js';

const healthRepository = new HealthRepository();

export function getLivenessStatus(): LivenessResponse {
  return { status: 'ok' };
}

export async function getReadinessStatus(): Promise<ReadinessResponse> {
  const databaseIsUp = await healthRepository.checkDatabaseConnection();

  if (!databaseIsUp) {
    return {
      status: 'error',
      database: 'down',
    };
  }

  const migrations = await healthRepository.checkMigrationsStatus();

  if (migrations !== 'up_to_date') {
    return {
      status: 'error',
      database: 'up',
      migrations,
    };
  }

  return {
    status: 'ok',
    database: 'up',
    migrations: 'up_to_date',
  };
}
