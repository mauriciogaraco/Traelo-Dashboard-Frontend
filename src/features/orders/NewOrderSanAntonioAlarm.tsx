import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppSelector } from '@/app/hooks';
import { useListCitiesQuery } from '@/features/cities/citiesApi';
import type { OrderDTO } from '@/lib/types';
import { useListOrdersQuery } from './ordersApi';
import { playMergeAlarm } from './mergeAlarmSound';

/** Cada cuánto se revisa si cayó un pedido nuevo en San Antonio. */
const POLL_MS = 5 * 60_000;

const STAFF_ROLES = ['OWNER', 'ADMIN', 'EMPLOYEE'];

// Quién recibe el aviso por WhatsApp (números de Cuba: prefijo 53).
const WHATSAPP_CONTACTS = [
  { name: 'Manuel Alejandro', phone: '5358202510' },
  { name: 'Mauricio', phone: '5358365388' },
];

const cup = (value: number) => `${Math.round(value).toLocaleString('es')} CUP`;

function buildMessage(orders: OrderDTO[]): string {
  const lines = orders.map(
    (o) => `#${o.orderNumber} · ${o.customerName} · ${o.customerAddress} · ${cup(o.total)}`,
  );
  const title = orders.length === 1 ? 'Nuevo pedido en San Antonio' : `${orders.length} pedidos nuevos en San Antonio`;
  return [title, ...lines].join('\n');
}

/**
 * Alarma de pedidos nuevos en San Antonio de los Baños: cada 5 minutos revisa los pedidos de hoy de
 * esa ciudad y, si cayó alguno que no se había visto, suena y abre un diálogo con botones para
 * avisar por WhatsApp. Solo staff. La primera carga no avisa (solo recuerda lo que ya existía).
 */
export function NewOrderSanAntonioAlarm() {
  const user = useAppSelector((state) => state.auth.user);
  const isStaff = user !== undefined && user !== null && STAFF_ROLES.includes(user.role);
  const scopedCities = user?.cities ?? [];
  const canListCities = isStaff && scopedCities.length === 0;

  const { data: citiesData } = useListCitiesQuery({ active: true, pageSize: 100 }, { skip: !canListCities });
  const sanAntonioId = useMemo(() => {
    const all: { id: string; code?: string; name: string }[] = canListCities ? (citiesData?.data ?? []) : scopedCities;
    return all.find((c) => c.code === 'SAN_ANTONIO' || /san antonio/i.test(c.name))?.id;
  }, [canListCities, citiesData, scopedCities]);

  const { data } = useListOrdersQuery(
    { cityId: sanAntonioId, range: 'today', pageSize: 100 },
    { skip: !isStaff || !sanAntonioId, pollingInterval: POLL_MS },
  );

  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<OrderDTO[]>([]);

  useEffect(() => {
    if (!data) return;
    const orders = data.data;
    if (seen.current === null) {
      seen.current = new Set(orders.map((o) => o.id));
      return;
    }
    const known = seen.current;
    const added = orders.filter((o) => !known.has(o.id));
    if (added.length === 0) return;
    added.forEach((o) => known.add(o.id));
    setFresh((current) => [...current, ...added]);
    playMergeAlarm();
  }, [data]);

  if (fresh.length === 0) return null;

  function sendWhatsApp(phone: string) {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(fresh))}`, '_blank', 'noopener');
  }

  return (
    <Modal title="Nuevo pedido en San Antonio" onClose={() => setFresh([])} widthClassName="max-w-lg">
      <div className="space-y-4">
        <ul className="space-y-2 text-sm text-slate-700">
          {fresh.map((order) => (
            <li key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">
                Pedido #{order.orderNumber} · {cup(order.total)}
              </p>
              <p>
                {order.customerName} · {order.customerPhone}
              </p>
              <p className="text-slate-500">{order.customerAddress}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          {WHATSAPP_CONTACTS.map((contact) => (
            <Button key={contact.phone} variant="secondary" onClick={() => sendWhatsApp(contact.phone)}>
              <MessageCircle className="h-4 w-4" /> Enviar a {contact.name}
            </Button>
          ))}
          <Button onClick={() => setFresh([])}>Entendido</Button>
        </div>
      </div>
    </Modal>
  );
}
