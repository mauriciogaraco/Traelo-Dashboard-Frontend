export interface OrderFlags {
  customerConfirmed: boolean;
  orderedWithBusiness: boolean;
  inviteToApp: boolean;
}

interface OrderFlagsFieldsProps {
  value: OrderFlags;
  onChange: (next: OrderFlags) => void;
  /** Al crear: ¿hay mensajero elegido? Con mensajero, además de avisar se cambia el estado del pedido. */
  willAdvanceStatus?: boolean;
}

/**
 * Avisos del staff para el mensajero en un pedido armado a mano: el vale los muestra para que sepa
 * qué ya está hecho. Son informativos, salvo que al crear el pedido ya se elija mensajero: entonces
 * "Ya se confirmó" lo deja Confirmado y "Ya se encargó" lo deja Marchando.
 */
export function OrderFlagsFields({ value, onChange, willAdvanceStatus }: OrderFlagsFieldsProps) {
  const options: { key: keyof OrderFlags; label: string; hint: string }[] = [
    {
      key: 'customerConfirmed',
      label: 'Ya se confirmó',
      hint: willAdvanceStatus
        ? 'El cliente ya confirmó. El pedido queda como Confirmado y el vale se lo avisa al mensajero.'
        : 'El cliente ya confirmó. El vale se lo avisa al mensajero.',
    },
    {
      key: 'orderedWithBusiness',
      label: 'Ya se encargó',
      hint: willAdvanceStatus
        ? 'Ya se le pidió al negocio. El pedido queda como Marchando y el vale le dice al mensajero que solo hay que recogerlo.'
        : 'Ya se le pidió al negocio. El vale le dice al mensajero que solo hay que recogerlo.',
    },
    {
      key: 'inviteToApp',
      label: 'Cliente nuevo: pasarle la app',
      hint: 'El vale le pide al mensajero que le pase la app al cliente y le mande por WhatsApp el enlace para registrarse.',
    },
  ];

  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <legend className="px-1 text-sm font-semibold text-slate-900">Avisos para el mensajero</legend>
      <div className="mt-1 flex flex-col gap-3">
        {options.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={value[option.key]}
              onChange={(e) => onChange({ ...value, [option.key]: e.target.checked })}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-900">{option.label}</span>
              <span className="block text-xs text-slate-500">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
