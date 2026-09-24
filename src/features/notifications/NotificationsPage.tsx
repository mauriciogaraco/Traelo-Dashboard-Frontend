import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { formatDateTime } from '@/lib/formatDate';
import type { NotificationDestination, NotificationDTO, NotificationStatus } from '@/lib/types';
import { CreateNotificationModal } from './CreateNotificationModal';
import { useListNotificationsQuery } from './notificationsApi';

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<NotificationStatus, string> = {
  DRAFT: 'Borrador',
  SENDING: 'Enviando…',
  SENT: 'Enviada',
  PARTIALLY_SENT: 'Enviada parcialmente',
  FAILED: 'Falló',
};

const STATUS_TONE: Record<NotificationStatus, 'slate' | 'green' | 'red' | 'amber' | 'brand'> = {
  DRAFT: 'slate',
  SENDING: 'brand',
  SENT: 'green',
  PARTIALLY_SENT: 'amber',
  FAILED: 'red',
};

function destinationLabel(data: NotificationDestination): string {
  switch (data.type) {
    case 'BUSINESS':
      return 'Negocio';
    case 'PRODUCT':
      return 'Producto';
    case 'CATEGORY':
      return 'Categoría';
    default:
      return 'General';
  }
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useListNotificationsQuery({ page, pageSize: PAGE_SIZE });
  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notificaciones</h1>
          <p className="text-sm text-slate-500">Difusiones enviadas por push a los clientes de Tráelo.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva notificación
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Notificación</th>
              <th className="px-4 py-3 font-medium">Destino</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Enviadas</th>
              <th className="px-4 py-3 font-medium">Fallidas</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Todavía no enviaste ninguna notificación.
                </td>
              </tr>
            )}
            {rows.map((notification: NotificationDTO) => (
              <tr key={notification.id} className="align-top text-slate-700">
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium text-slate-900">{notification.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.body}</p>
                </td>
                <td className="px-4 py-3">{destinationLabel(notification.data)}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[notification.status]}>{STATUS_LABEL[notification.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {notification.sentAt ? formatDateTime(notification.sentAt) : formatDateTime(notification.createdAt)}
                </td>
                <td className="px-4 py-3">{notification.sentCount}</td>
                <td className="px-4 py-3">{notification.failedCount}</td>
                <td className="px-4 py-3">{notification.targetedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>

      {createOpen && <CreateNotificationModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
