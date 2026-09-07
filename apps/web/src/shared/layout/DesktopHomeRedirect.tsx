import { Navigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { useAppCapabilities } from '../config/CapabilitiesProvider';
import { defaultPathForRole } from './navigation';

/** Sends a desktop user to the first home surface available in the active release. */
export function DesktopHomeRedirect() {
  const { user } = useAuth();
  const capabilities = useAppCapabilities();

  if (!user) return null;

  return <Navigate to={defaultPathForRole(user.role, capabilities)} replace />;
}
