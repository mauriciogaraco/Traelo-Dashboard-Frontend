import { useEffect, useRef, useState } from 'react';
import { Ban, Bell, CheckCheck, PencilLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { baseApi } from '@/lib/baseApi';
import { formatDateTime } from '@/lib/formatDate';
import {
  useGetStaffUnreadCountQuery,
  useListStaffNotificationsQuery,
  useMarkAllStaffNotificationsReadMutation,
  useMarkStaffNotificationReadMutation,
  type StaffNotificationDTO,
} from './staffInboxApi';

/** Cada cuánto se consulta si hay avisos nuevos (solo un contador: es una consulta liviana). */
const POLL_MS = 30_000;

const STAFF_ROLES = ['OWNER', 'ADMIN', 'EMPLOYEE'];

function NotificationIcon({ type }: { type: StaffNotificationDTO['type'] }) {
  return type === 'ORDER_CANCELLED_BY_DELIVERER' ? (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
      <Ban className="h-4 w-4" />
    </span>
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
      <PencilLine className="h-4 w-4" />
    </span>
  );
}

/**
 * Campana de la barra superior: avisos del equipo cuando un mensajero edita un vale o cancela un
 * pedido desde la app. Solo para el staff (OWNER/ADMIN/EMPLOYEE).
 */
export function InboxBell() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const isStaff = role !== undefined && STAFF_ROLES.includes(role);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef<number | null>(null);

  const { data: countData } = useGetStaffUnreadCountQuery(undefined, {
    skip: !isStaff,
    pollingInterval: POLL_MS,
  });
  const { data: listData, isFetching } = useListStaffNotificationsQuery(
    { page: 1, pageSize: 30 },
    { skip: !isStaff || !open, refetchOnMountOrArgChange: true },
  );
  const [markRead] = useMarkStaffNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllStaffNotificationsReadMutation();

  const unread = countData?.data.count ?? 0;

  // Llegó un aviso nuevo: alguien tocó un pedido desde la app, así que la lista de pedidos que se
  // está viendo ya quedó vieja — se vuelve a pedir sin esperar al botón de refrescar.
  useEffect(() => {
    if (countData === undefined) return;
    const previous = previousCount.current;
    previousCount.current = unread;
    if (previous !== null && unread > previous) {
      dispatch(baseApi.util.invalidateTags(['Order']));
    }
  }, [countData, unread, dispatch]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!isStaff) return null;

  const items = listData?.data ?? [];

  function handleOpenItem(item: StaffNotificationDTO) {
    if (!item.read) void markRead(item.id);
    setOpen(false);
    if (item.orderId) navigate(`/orders/${item.orderId}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread > 0 ? `Avisos (${unread} sin leer)` : 'Avisos'}
        aria-expanded={open}
        title="Avisos"
        className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Avisos"
          className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Avisos</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread === 0 || markingAll}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todo como leído
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto sm:max-h-96">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                {isFetching ? 'Cargando…' : 'No hay avisos por ahora.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenItem(item)}
                      className={clsx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                        !item.read && 'bg-brand-50/60',
                      )}
                    >
                      <NotificationIcon type={item.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                        <span className="mt-0.5 block text-sm text-slate-600">{item.body}</span>
                        <span className="mt-1 block text-xs text-slate-400">{formatDateTime(item.createdAt)}</span>
                      </span>
                      {!item.read && (
                        <span aria-label="Sin leer" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
