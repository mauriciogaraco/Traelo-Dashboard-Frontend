import { useState } from 'react';
import { Gem, History, Medal, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/lib/formatDate';
import { AmbassadorBadge } from './AmbassadorBadge';
import { AmbassadorFormModal } from './AmbassadorFormModal';
import { AdjustPointsModal, AmbassadorHistoryModal } from './AmbassadorPointsModals';
import { useListAmbassadorsQuery, useRevokeAmbassadorMutation, type AmbassadorDTO } from './ambassadorsApi';

function MilestoneProgress({ ambassador }: { ambassador: AmbassadorDTO }) {
  const inCycle = ambassador.completedReferred % 10;
  return (
    <div className="w-32">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${inCycle * 10}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {inCycle}/10 para el bono de 500
        {ambassador.milestoneBonuses > 0 ? ` · ${ambassador.milestoneBonuses} cobrado${ambassador.milestoneBonuses > 1 ? 's' : ''}` : ''}
      </p>
    </div>
  );
}

function SpecialSummary({ ambassador }: { ambassador: AmbassadorDTO }) {
  if (ambassador.tier !== 'SPECIAL') return <span className="text-slate-400">—</span>;
  const period = [
    ambassador.specialStartsAt ? `desde ${formatDate(ambassador.specialStartsAt)}` : null,
    ambassador.specialEndsAt ? `hasta ${formatDate(ambassador.specialEndsAt)}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="text-xs text-slate-600">
      <p>
        <span className="font-medium text-slate-900">{ambassador.specialPointsPerOrder} pts</span> por{' '}
        {ambassador.specialAllOrders ? 'cada pedido' : 'el primer pedido'}
      </p>
      {period && <p className="text-slate-500">{period}</p>}
      <Badge tone={ambassador.specialActive ? 'green' : 'slate'}>
        {ambassador.specialActive ? 'Vigente' : 'Vencido'}
      </Badge>
    </div>
  );
}

export function AmbassadorsPage() {
  const { data, isLoading } = useListAmbassadorsQuery();
  const [revoke, { isLoading: isRevoking }] = useRevokeAmbassadorMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AmbassadorDTO | null>(null);
  const [adjusting, setAdjusting] = useState<AmbassadorDTO | null>(null);
  const [history, setHistory] = useState<AmbassadorDTO | null>(null);
  const [removing, setRemoving] = useState<AmbassadorDTO | null>(null);

  const ambassadors = data?.data ?? [];
  const specials = ambassadors.filter((a) => a.tier === 'SPECIAL').length;
  const totalCompleted = ambassadors.reduce((sum, a) => sum + a.completedReferred, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Embajadores</h1>
          <p className="text-sm text-slate-500">
            Clientes que traen clientes. El embajador gana un bono de 500 puntos cada 10 referidos con primera compra;
            el especial, además, puntos por pedido durante un periodo.
          </p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo embajador
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Medal className="h-4 w-4 text-amber-500" /> Embajadores
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{ambassadors.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Gem className="h-4 w-4 text-cyan-600" /> Especiales
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{specials}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Referidos con primera compra</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCompleted}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Nivel</th>
              <th className="px-4 py-3 font-medium">Referidos</th>
              <th className="px-4 py-3 font-medium">Especial</th>
              <th className="px-4 py-3 font-medium">Puntos ganados</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
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
            {!isLoading && ambassadors.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Todavía no hay embajadores. Nombra al primero con “Nuevo embajador”.
                </td>
              </tr>
            )}
            {ambassadors.map((a) => (
              <tr key={a.customerId} className="align-top text-slate-700">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <AmbassadorBadge tier={a.effectiveTier} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {a.completedReferred} <span className="font-normal text-slate-500">de {a.totalReferred}</span>
                  </p>
                  <MilestoneProgress ambassador={a} />
                </td>
                <td className="px-4 py-3">
                  <SpecialSummary ambassador={a} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <p>Bonos: {a.milestonePointsEarned}</p>
                  {a.tier === 'SPECIAL' && <p>Por pedido: {a.specialPointsEarned}</p>}
                  {a.adjustedPoints !== 0 && <p>Ajustes: {a.adjustedPoints > 0 ? '+' : ''}{a.adjustedPoints}</p>}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{a.pointsBalance}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <Button type="button" variant="ghost" onClick={() => setAdjusting(a)}>
                      Puntos
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setHistory(a)}>
                      <History className="h-4 w-4" />
                      Historial
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(a)}>
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setRemoving(a)}>
                      Quitar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <AmbassadorFormModal onClose={() => setCreating(false)} />}
      {editing && <AmbassadorFormModal ambassador={editing} onClose={() => setEditing(null)} />}
      {adjusting && <AdjustPointsModal ambassador={adjusting} onClose={() => setAdjusting(null)} />}
      {history && <AmbassadorHistoryModal ambassador={history} onClose={() => setHistory(null)} />}
      {removing && (
        <ConfirmDialog
          title="Quitar embajador"
          description={`${removing.name} deja de ser embajador y pierde la medalla. Los puntos que ya ganó se quedan en su saldo (si quieres retirarlos, hazlo antes con “Puntos”).`}
          confirmLabel="Quitar"
          isLoading={isRevoking}
          onConfirm={async () => {
            await revoke(removing.customerId).unwrap();
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
