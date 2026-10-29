/** Origen de la web de clientes. */
const WEB_URL = 'https://www.traelo-market.com';

/** Enlace que abre directo la valoración del pedido en la web (pide iniciar sesión si hace falta). */
export function reviewLinkUrl(orderId: string): string {
  return `${WEB_URL}/valorar/${encodeURIComponent(orderId)}`;
}

/** Mensaje de WhatsApp para el cliente, con el enlace ya escrito. */
export function buildReviewMessage(params: { name: string; orderNumber: number; url: string }): string {
  return [
    `Hola ${params.name}, gracias por tu pedido #${params.orderNumber} en Tráelo.`,
    '',
    '¿Nos cuentas cómo te fue con tu entrega? Tu valoración ayuda a tu mensajero y a los negocios. Solo toma un momento:',
    params.url,
  ].join('\n');
}

/**
 * Enlace de WhatsApp al teléfono del cliente con el mensaje listo. null si el teléfono no tiene dígitos
 * suficientes para ser un número.
 */
export function buildReviewWhatsappUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type ReviewLinkAvailability = 'ready' | 'not-delivered-yet' | 'needs-account' | 'cancelled';

/**
 * Qué se le puede ofrecer al mensajero para este pedido. Las valoraciones exigen CUENTA (el servidor rechaza
 * las de pedidos sin cuenta): sin cliente vinculado el enlace no serviría, y se explica por qué.
 */
export function reviewLinkAvailability(order: { status: string; customerId: string | null }): ReviewLinkAvailability {
  if (order.status === 'CANCELLED') return 'cancelled';
  if (order.customerId === null) return 'needs-account';
  return order.status === 'COMPLETED' ? 'ready' : 'not-delivered-yet';
}
