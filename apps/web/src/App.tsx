import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './features/auth/AuthContext';
import { router } from './router';
import { CapabilitiesProvider } from './shared/config/CapabilitiesProvider';
import { ToastProvider, Toaster } from './shared/ui';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CapabilitiesProvider>
          <RouterProvider router={router} />
          <Toaster />
        </CapabilitiesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
