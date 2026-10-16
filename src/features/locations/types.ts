// Contrato PROVISIONAL de localidades — pendiente de confirmar con el backend (ver auditoría
// multiciudad: ningún endpoint ni campo locationId existen todavía). Esta forma es una hipótesis
// de trabajo para el LocationContext, no un contrato real; se ajusta en cuanto el backend defina
// el suyo.
export interface LocationDTO {
  id: string;
  name: string;
  slug: string;
}
