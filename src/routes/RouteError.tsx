import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { isChunkLoadError, reloadOnceForNewVersion } from '@/lib/chunkReload';

/**
 * Pantalla de error de las rutas. Si el fallo es de una versión nueva (un archivo de pantalla que ya no existe),
 * recarga sola una vez; si no, muestra un aviso claro con un botón para recargar en vez de una pantalla en blanco.
 */
export function RouteError() {
  const error = useRouteError();
  const stale = isChunkLoadError(error);

  useEffect(() => {
    if (stale) reloadOnceForNewVersion();
  }, [stale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {stale ? 'Hay una versión nueva' : 'Algo salió mal'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {stale
            ? 'Actualizamos el panel mientras lo tenías abierto. Recarga la página para continuar.'
            : 'No se pudo mostrar esta pantalla. Recarga la página; si sigue pasando, avísanos.'}
        </p>
        <Button type="button" className="mt-4" onClick={() => window.location.reload()}>
          Recargar
        </Button>
      </div>
    </div>
  );
}
