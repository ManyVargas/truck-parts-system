import { RouterProvider } from 'react-router-dom';

import { ToastProvider, Toaster } from './shared/ui';
import { router } from './router';

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ToastProvider>
  );
}
