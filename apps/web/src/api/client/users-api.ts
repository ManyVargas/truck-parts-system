import type { ManagedUser, SaveUserInput } from '../contracts/users';
import type { Result } from '../../shared/auth/types';

/**
 * Future HTTP users client — maps to API M11 user-management commands.
 * Features consume UserRepository; this module is the swap target for MockUserRepository.
 */
export async function listUsersWithHttp(): Promise<Result<ManagedUser[]>> {
  throw new Error('HttpUserRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function saveUserWithHttp(_input: SaveUserInput): Promise<Result<ManagedUser>> {
  throw new Error('HttpUserRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
