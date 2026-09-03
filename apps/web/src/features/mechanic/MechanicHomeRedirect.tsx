import { Navigate } from 'react-router-dom';

import { useAppCapabilities } from '../../shared/config/CapabilitiesProvider';

/** Sends mechanics to the queue when work orders exist, otherwise to profile. */
export function MechanicHomeRedirect() {
  const capabilities = useAppCapabilities();
  return (
    <Navigate to={capabilities.workOrders ? '/mechanic/pending' : '/mechanic/profile'} replace />
  );
}
