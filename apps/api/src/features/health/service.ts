import type { HealthStatusResponse } from './types.js';

export function getHealthStatus(): HealthStatusResponse {
  return {
    status: 'ok',
    service: 'truck-parts-api',
  };
}
