import type { SaveServiceInput } from '../../api/contracts/catalogs';
import type { ServiceRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { prepareServiceSave, sortServices } from '../services/catalogs';
import { requirePermission } from '../services/require-permission';
import { cloneForRead, getMockState } from '../state';

export class MockServiceRepository implements ServiceRepository {
  async list() {
    const permission = requirePermission('catalogs.manage');
    if (!permission.ok) {
      return permission;
    }

    return ok(cloneForRead(sortServices(getMockState().services)));
  }

  async save(input: SaveServiceInput) {
    const permission = requirePermission('catalogs.manage');
    if (!permission.ok) {
      return permission;
    }

    const state = getMockState();
    const prepared = prepareServiceSave(state.services, input);
    if (!prepared.ok) {
      return prepared;
    }

    const service = prepared.value;
    const index = state.services.findIndex((entry) => entry.id === service.id);
    if (index >= 0) {
      state.services[index] = service;
    } else {
      state.services.push(service);
    }

    return ok(cloneForRead(service));
  }
}

export const mockServiceRepository = new MockServiceRepository();
