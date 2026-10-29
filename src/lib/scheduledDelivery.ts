// "Momento de entrega" que el cliente eligió en la web (texto libre: "Lo antes posible",
// "Hoy 7:30 pm"). Solo se destaca cuando pidió una hora concreta, no el valor por defecto.
export function scheduledDeliveryLabel(scheduledFor: string | null | undefined): string | null {
  const text = scheduledFor?.trim();
  if (!text || /antes posible/i.test(text)) return null;
  return text;
}
