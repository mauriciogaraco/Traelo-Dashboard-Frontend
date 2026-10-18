/** Origen de la web de clientes (el enlace del mensaje abre el paso del código). */
const WEB_URL = 'https://www.traelo-market.com';

/** Enlace que abre directo "Nueva contraseña" en la web: la persona solo escribe el código. */
export const RESET_PAGE_URL = `${WEB_URL}/recuperar?codigo=1`;

/** Mensaje de WhatsApp con el código ya escrito, para mandarlo al teléfono de la cuenta. */
export function buildResetMessage(params: { name: string; code: string; expiresInMinutes: number }): string {
  return [
    `Hola ${params.name}, este es tu código para restablecer tu contraseña de Tráelo:`,
    '',
    params.code,
    '',
    `Vale ${params.expiresInMinutes} minutos y se usa una sola vez. Escríbelo aquí y elige tu contraseña nueva: ${RESET_PAGE_URL}`,
    '',
    'Si no lo pediste tú, ignora este mensaje.',
  ].join('\n');
}

/**
 * Enlace de WhatsApp al teléfono DE LA CUENTA (nunca a otro número): así el código solo le llega a quien
 * tiene ese teléfono. Devuelve null si el teléfono no tiene dígitos suficientes.
 */
export function buildResetWhatsappUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
