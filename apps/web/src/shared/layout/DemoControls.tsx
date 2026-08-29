import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { resetDemoData } from '../../mocks/demo-controls';
import { Button, useToast } from '../ui';

/**
 * Dev-only controls to reset mock data. Never bypasses login — session is cleared on reset.
 */
export function DemoControls() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { pushToast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const isEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_CONTROLS === 'true';

  if (!isEnabled) {
    return null;
  }

  async function handleReset() {
    setIsResetting(true);
    const result = resetDemoData();

    if (!result.ok) {
      pushToast(result.error.message, 'error');
      setIsResetting(false);
      return;
    }

    await logout();
    pushToast('Datos demo restaurados. Inicie sesión nuevamente.', 'success');
    navigate('/login', { replace: true });
    setIsResetting(false);
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleReset} disabled={isResetting}>
      {isResetting ? 'Reiniciando…' : 'Reiniciar datos demo'}
    </Button>
  );
}
