/** Origen de la web de clientes. */
const WEB_URL = 'https://www.traelo-market.com';

/** Enlace para que un cliente nuevo cree su cuenta en la web. */
export const REGISTER_URL = `${WEB_URL}/registro`;

/** Mensaje de WhatsApp para un cliente nuevo: la app y el enlace para registrarse. */
export function buildRegisterInviteMessage(params: { name: string }): string {
  return [
    `Hola ${params.name}, gracias por tu pedido en Tráelo.`,
    '',
    'Con tu cuenta puedes hacer tus próximos pedidos desde la app, ver el estado de tu entrega y ganar puntos. Regístrate aquí (toma un minuto):',
    REGISTER_URL,
  ].join('\n');
}

/**
 * Enlace de WhatsApp al teléfono del cliente con el mensaje listo. Los móviles cubanos se guardan
 * a veces sin código de país (8 dígitos que empiezan por 5): sin el 53 WhatsApp no encuentra el contacto.
 * null si el teléfono no tiene dígitos suficientes.
 */
export function buildRegisterWhatsappUrl(phone: string, message: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('5')) digits = `53${digits}`;
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
