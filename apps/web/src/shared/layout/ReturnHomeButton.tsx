import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { Button } from '../ui';
import { defaultPathForRole } from './navigation';

/**
 * Escape hatch when the current screen has no role nav (standalone 404 / 401).
 * Sends the user to the home of their role — not browser history, which may be the bad URL.
 */
export function ReturnHomeButton() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Button
      className="mt-4"
      variant="secondary"
      onClick={() => navigate(defaultPathForRole(user.role), { replace: true })}
    >
      Volver al inicio
    </Button>
  );
}
