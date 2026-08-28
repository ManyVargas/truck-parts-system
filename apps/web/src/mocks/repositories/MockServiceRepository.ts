import type { Service } from '../../api/contracts/entities';
import type { ServiceRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

export class MockServiceRepository implements ServiceRepository {
  async list() {
    return ok(getMockState().services);
  }

  async save(service: Service) {
    return ok(service);
  }
}

export const mockServiceRepository = new MockServiceRepository();
