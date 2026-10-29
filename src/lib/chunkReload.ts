// Cada vez que se publica una versión nueva del dashboard, los archivos de las pantallas (chunks) cambian de
// nombre. Una pestaña que quedó abierta con la versión anterior intenta cargar un archivo que ya no existe
// y el servidor responde con el index.html: "Failed to fetch dynamically imported module". La solución es
// recargar la página para traer la versión nueva — una sola vez, para no entrar en un bucle si el problema
// fuera otro (por ejemplo, sin conexión).

const RELOAD_KEY = 'traelo.chunkReloadAt';
const MIN_SECONDS_BETWEEN_RELOADS = 30;

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return CHUNK_ERROR_PATTERN.test(message);
}

/** Recarga la página si no se recargó hace poco. Devuelve true si la recargó. */
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < MIN_SECONDS_BETWEEN_RELOADS * 1000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Sin sessionStorage no hay forma de evitar el bucle: mejor no recargar solos.
    return false;
  }
  window.location.reload();
  return true;
}
