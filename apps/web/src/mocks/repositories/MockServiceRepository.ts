import type { Service } from '../../api/contracts/entities';
import type { ServiceRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { cloneForRead, getMockState } from '../state';

export class MockServiceRepository implements ServiceRepository {
  async list() {
    return ok(cloneForRead(getMockState().services));
  }

  async save(service: Service) {
    return ok(cloneForRead(service));
  }
}

export const mockServiceRepository = new MockServiceRepository();
