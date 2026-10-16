import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/router';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { LocationProvider } from '@/features/locations/LocationContext';

export default function App() {
  return (
    <ToastProvider>
      <LocationProvider>
        <RouterProvider router={router} />
      </LocationProvider>
    </ToastProvider>
  );
}
