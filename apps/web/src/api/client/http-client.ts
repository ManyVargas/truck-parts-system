import type { AppError, AppErrorCode } from '../../shared/auth/types';

export type HttpClientOptions = RequestInit & { parseJson?: boolean };

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHORIZED: 'La sesión ha expirado. Inicie sesión nuevamente.',
  FORBIDDEN: 'No tiene permiso para realizar esta operación.',
  VALIDATION: 'Revise los datos ingresados.',
  CONFLICT: 'Los datos cambiaron. Actualice e intente nuevamente.',
  NOT_FOUND: 'No se encontró el recurso solicitado.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espere unos minutos antes de volver a intentar.',
  PAYLOAD_TOO_LARGE: 'Los datos enviados superan el tamaño permitido.',
  UNSUPPORTED_MEDIA_TYPE: 'El formato de los datos no es compatible.',
  INTERNAL: 'No se pudo completar la operación. Intente nuevamente.',
  NETWORK: 'No se pudo conectar con el servidor. Revise su conexión e intente nuevamente.',
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly appError: AppError,
  ) {
    super(appError.message);
  }
}

function mapResponseError(status: number, body: unknown): AppError {
  const fallback: AppErrorCode =
    (
      {
        400: 'VALIDATION',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        413: 'PAYLOAD_TOO_LARGE',
        415: 'UNSUPPORTED_MEDIA_TYPE',
        429: 'TOO_MANY_REQUESTS',
      } as Record<number, AppErrorCode>
    )[status] ?? 'INTERNAL';
  const envelope = body && typeof body === 'object' && 'error' in body ? body.error : null;
  const error = envelope && typeof envelope === 'object' ? envelope : {};
  const code =
    'code' in error && typeof error.code === 'string' && Object.hasOwn(ERROR_MESSAGES, error.code)
      ? (error.code as AppErrorCode)
      : fallback;
  const details =
    'details' in error &&
    error.details &&
    typeof error.details === 'object' &&
    !Array.isArray(error.details)
      ? (error.details as Record<string, unknown>)
      : undefined;
  let message = ERROR_MESSAGES[code];
  if (code === 'VALIDATION' && 'message' in error) {
    if (error.message === 'Current password is incorrect')
      message = 'La contraseña actual es incorrecta.';
    if (error.message === 'New password must differ from current password')
      message = 'La nueva contraseña debe ser diferente de la actual.';
  }
  if (details?.reason === 'PASSWORD_CHANGE_REQUIRED')
    message = 'Debe cambiar su contraseña desde Mi perfil para continuar.';
  const errorId =
    'errorId' in error && typeof error.errorId === 'string' ? error.errorId : undefined;
  if (code === 'INTERNAL' && errorId) message += ` Referencia: ${errorId}`;
  return { code, message, details, ...(errorId ? { errorId } : {}) };
}

/** Same-origin cookies are managed by the browser, never by application storage. */
export async function httpClient<T>(path: string, options: HttpClientOptions = {}): Promise<T> {
  const { parseJson = true, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new HttpError(response.status, mapResponseError(response.status, body));
  }
  if (!parseJson || response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof HttpError) return error.appError;
  const code = error instanceof TypeError ? 'NETWORK' : 'INTERNAL';
  return { code, message: ERROR_MESSAGES[code] };
}

export const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';
