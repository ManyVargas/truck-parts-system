import { err, ok, type Result } from '../../shared/auth/types';
import type {
  AuthIdentity,
  PublicProfileResponse,
  PublicUser,
  SessionProjection,
} from '../contracts/auth';
import type { UpdateOwnProfileInput, UpdateOwnProfileResult } from '../contracts/profile';
import { httpClient, HttpError, toAppError } from './http-client';

const AUTH_PATH = '/api/auth';
const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };
export type LoginRequest = { username: string; password: string };
export type LoginResponse = AuthIdentity;

async function request<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    return err(toAppError(error));
  }
}

function toPublicUser(profile: PublicProfileResponse): PublicUser {
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    role: profile.role,
    active: profile.active,
    mustChangePassword: profile.mustChangePassword,
    phone: profile.phone ?? undefined,
    email: profile.email ?? undefined,
  };
}

export async function loginWithHttp(credentials: LoginRequest): Promise<Result<AuthIdentity>> {
  const result = await request(() =>
    httpClient<AuthIdentity>(`${AUTH_PATH}/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  );
  if (!result.ok && result.error.code === 'UNAUTHORIZED') {
    return err({ ...result.error, message: 'Usuario o contraseña incorrectos.' });
  }
  return result;
}

export function logoutWithHttp(): Promise<Result<void>> {
  return request(() =>
    httpClient<void>(`${AUTH_PATH}/logout`, { method: 'POST', headers: CSRF_HEADERS }),
  );
}

export function getSessionWithHttp(): Promise<Result<SessionProjection | null>> {
  return request(async () => {
    try {
      return await httpClient<SessionProjection>(`${AUTH_PATH}/session`);
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) return null;
      throw error;
    }
  });
}

export function getCurrentUserWithHttp(): Promise<Result<PublicUser | null>> {
  return request(async () =>
    toPublicUser(await httpClient<PublicProfileResponse>(`${AUTH_PATH}/me`)),
  );
}

export function requestRecoveryWithHttp(username: string): Promise<Result<void>> {
  return request(async () => {
    await httpClient(`${AUTH_PATH}/recovery-requests`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  });
}

export async function updateOwnProfileWithHttp(
  input: UpdateOwnProfileInput,
): Promise<Result<UpdateOwnProfileResult>> {
  const changesPassword =
    input.newPassword !== undefined ||
    input.currentPassword !== undefined ||
    input.confirmPassword !== undefined;
  if (changesPassword) {
    if (!input.currentPassword)
      return err({ code: 'VALIDATION', message: 'Introduzca su contraseña actual.' });
    if (!input.newPassword || Array.from(input.newPassword).length < 6) {
      return err({
        code: 'VALIDATION',
        message: 'La nueva contraseña debe tener al menos 6 caracteres.',
      });
    }
    if (input.newPassword !== input.confirmPassword)
      return err({ code: 'VALIDATION', message: 'La confirmación no coincide.' });
  }
  // Explicit mapping keeps UI-only confirmation and administrator fields out of the strict API schema.
  return request(async () =>
    toPublicUser(
      await httpClient<PublicProfileResponse>(`${AUTH_PATH}/me`, {
        method: 'PATCH',
        headers: CSRF_HEADERS,
        body: JSON.stringify({
          name: input.name,
          phone: input.phone,
          email: input.email,
          ...(changesPassword
            ? { currentPassword: input.currentPassword, password: input.newPassword }
            : {}),
        }),
      }),
    ),
  );
}
