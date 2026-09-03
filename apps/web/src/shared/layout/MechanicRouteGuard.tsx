import { Outlet, useLocation } from 'react-router-dom';

import { UnauthorizedPage } from '../../features/auth/UnauthorizedPage';
import { useAppCapabilities } from '../config/CapabilitiesProvider';
import { isKnownMechanicRoute, isMechanicPathAllowed } from './navigation';

/** Blocks mechanic queue/order URLs when workOrders is disabled. */
export function MechanicRouteGuard() {
  const location = useLocation();
  const capabilities = useAppCapabilities();

  if (!isKnownMechanicRoute(location.pathname)) {
    return <Outlet />;
  }

  if (!isMechanicPathAllowed(location.pathname, capabilities)) {
    return <UnauthorizedPage attemptedPath={location.pathname} />;
  }

  return <Outlet />;
}
