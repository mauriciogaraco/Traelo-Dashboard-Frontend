/**
 * Zona horaria del negocio: la hora de Cuba, con la que se muestran las fechas y se calculan "hoy" y la hora del
 * recargo nocturno.
 *
 * Es UTC-4 FIJO (`Etc/GMT+4`, con el signo invertido a propósito por la base de datos de zonas), no `America/Havana`:
 * esa zona retrocede una hora el primer domingo de noviembre (UTC-5), y en 2026 Cuba NO cambió el reloj. Con
 * `America/Havana` el dashboard mostraba una hora de menos. Es la misma zona que usa el servidor
 * (`BUSINESS_TIMEZONE` del backend): si algún día cambia allí, cambia aquí.
 */
export const BUSINESS_TIMEZONE = 'Etc/GMT+4';
