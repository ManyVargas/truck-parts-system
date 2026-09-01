import type { Result } from '../../shared/auth/types';
import type { Session } from '../contracts/entities';
import type { UpdateOwnProfileInput, UpdateOwnProfileResult } from '../contracts/profile';

/**
 * Future HTTP auth client — maps to POST /api/auth/login (API M10).
 * Features consume AuthRepository; this module is the swap target for MockAuthRepository.
 */
export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  session: Session;
};

export async function loginWithHttp(
  credentials: LoginRequest,
): Promise<Result<Session>> {
  void credentials;
  throw new Error('HttpAuthRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function logoutWithHttp(): Promise<Result<void>> {
  throw new Error('HttpAuthRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function updateOwnProfileWithHttp(
  input: UpdateOwnProfileInput,
): Promise<Result<UpdateOwnProfileResult>> {
  void input;
  throw new Error('HttpAuthRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
