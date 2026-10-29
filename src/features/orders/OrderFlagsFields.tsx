export interface OrderFlags {
  customerConfirmed: boolean;
  orderedWithBusiness: boolean;
  inviteToApp: boolean;
}

interface OrderFlagsFieldsProps {
  value: OrderFlags;
  onChange: (next: OrderFlags) => void;
}

/**
 * Avisos del staff para el mensajero en un pedido armado a mano: el vale los muestra para que sepa
 * qué ya está hecho. No hace falta elegir mensajero: en cuanto el pedido tiene uno (por la cola o
 * asignado a mano), "Ya se confirmó" lo deja Confirmado y "Ya se encargó" lo deja Marchando.
 */
export function OrderFlagsFields({ value, onChange }: OrderFlagsFieldsProps) {
  const options: { key: keyof OrderFlags; label: string; hint: string }[] = [
    {
      key: 'customerConfirmed',
      label: 'Ya se confirmó',
      hint: 'El cliente ya confirmó. En cuanto tenga mensajero queda como Confirmado y el vale se lo avisa.',
    },
    {
      key: 'orderedWithBusiness',
      label: 'Ya se encargó',
      hint: 'Ya se le pidió al negocio. En cuanto tenga mensajero queda como Marchando y el vale le dice que solo hay que recogerlo.',
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
