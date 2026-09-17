import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/router';
import { ToastProvider } from '@/components/ui/ToastProvider';

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
