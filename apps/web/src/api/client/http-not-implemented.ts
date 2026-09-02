import { err, type Result } from '../../shared/auth/types';

/** Typed stub result for Http*Repository methods not yet backed by an API. */
export function httpNotImplemented(repository: string, method: string): Result<never> {
  return err({
    code: 'INTERNAL',
    message: `${repository}.${method} no implementado — use VITE_USE_MOCK_API=true`,
  });
}
