import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '@/app/store';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/lexend/600.css';
import '@fontsource/lexend/700.css';
import App from './App.tsx';
import { reloadOnceForNewVersion } from '@/lib/chunkReload';
import './index.css';

// Vite avisa cuando no se puede cargar el archivo de una pantalla (típico tras publicar una versión nueva con la
// pestaña abierta): se recarga una vez para traer la versión actual en vez de dejar un error en pantalla.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
