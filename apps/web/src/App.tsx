import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './features/auth/AuthContext';
import { router } from './router';
import { ToastProvider, Toaster } from './shared/ui';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </ToastProvider>
  );
}
