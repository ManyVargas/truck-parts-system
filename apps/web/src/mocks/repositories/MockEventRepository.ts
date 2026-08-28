import type { EventRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

export class MockEventRepository implements EventRepository {
  async list() {
    return ok(getMockState().events);
  }
}

export const mockEventRepository = new MockEventRepository();
