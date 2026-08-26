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

  return {
    status: 'ok',
    database: 'up',
  };
}
