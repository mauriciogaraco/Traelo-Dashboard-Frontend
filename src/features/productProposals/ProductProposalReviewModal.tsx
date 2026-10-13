import { useState } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime } from '@/lib/formatDate';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { ProductProposalDTO } from '@/lib/types';
import {
  useApproveProductProposalMutation,
  useRejectProductProposalMutation,
} from './productProposalsApi';

interface ProductProposalReviewModalProps {
  proposal: ProductProposalDTO;
  onClose: () => void;
}

const STATUS_BADGE: Record<ProductProposalDTO['status'], { tone: 'amber' | 'green' | 'red' | 'slate'; label: string }> = {
  PENDING: { tone: 'amber', label: 'Pendiente' },
  APPROVED: { tone: 'green', label: 'Aprobada' },
  REJECTED: { tone: 'red', label: 'Rechazada' },
  CANCELLED: { tone: 'slate', label: 'Cancelada' },
};

function formatPrice(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value} CUP` : '—';
}

interface DiffRowProps {
  label: string;
  current: string;
  proposed: string;
  changed: boolean;
}

function DiffRow({ label, current, proposed, changed }: DiffRowProps) {
  return (
    <div className="grid grid-cols-[120px_1fr_1fr] gap-3 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className={changed ? 'text-slate-400 line-through' : 'text-slate-700'}>{current}</span>
      <span className={changed ? 'font-medium text-brand-700' : 'text-slate-700'}>{proposed}</span>
    </div>
  );
}

export function ProductProposalReviewModal({ proposal, onClose }: ProductProposalReviewModalProps) {
  const { showToast } = useToast();
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [approve, { isLoading: isApproving }] = useApproveProductProposalMutation();
  const [reject, { isLoading: isRejecting }] = useRejectProductProposalMutation();

  const current = proposal.currentProduct;
  const proposed = proposal.proposedData;
  const isPending = proposal.status === 'PENDING';
  const isEdit = proposal.type === 'EDIT';

  async function handleApprove() {
    try {
      await approve(proposal.id).unwrap();
      showToast('Propuesta aprobada: el producto ya está publicado.');
      onClose();
    } catch (err) {
      showToast(getErrorMessage(err as FetchBaseQueryError | SerializedError), 'error');
      setConfirmingApprove(false);
    }
  }

  async function handleReject() {
    if (reason.trim().length < 3) {
      setReasonError('El motivo es obligatorio (mínimo 3 caracteres)');
      return;
    }
    try {
      await reject({ proposalId: proposal.id, reason: reason.trim() }).unwrap();
      showToast('Propuesta rechazada.');
      onClose();
    } catch (err) {
      showToast(getErrorMessage(err as FetchBaseQueryError | SerializedError), 'error');
    }
  }

  const statusBadge = STATUS_BADGE[proposal.status];

  return (
    <Modal
      title={isEdit ? 'Revisar edición de producto' : 'Revisar producto nuevo'}
      onClose={onClose}
      widthClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-900">{proposal.businessName}</p>
            <p>
              Propuesto por {proposal.createdByName} · {formatDateTime(proposal.createdAt)}
            </p>
          </div>
          <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
        </div>

        <div className="flex gap-4">
          {current && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-slate-500">Imagen actual</span>
              {current.imageUrl ? (
                <a href={current.imageUrl} target="_blank" rel="noreferrer">
                  <Thumbnail src={current.imageUrl} alt="Imagen actual" size={96} />
                </a>
              ) : (
                <Thumbnail src={null} alt="Sin imagen actual" size={96} />
              )}
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-slate-500">Imagen propuesta</span>
            {proposed.imageUrl ? (
              <a href={proposed.imageUrl} target="_blank" rel="noreferrer">
                <Thumbnail src={proposed.imageUrl} alt="Imagen propuesta" size={96} />
              </a>
            ) : (
              <Thumbnail src={null} alt="Sin imagen propuesta" size={96} />
            )}
          </div>
        </div>

        <div>
          {isEdit && current ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2">
              <div className="grid grid-cols-[120px_1fr_1fr] gap-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span />
                <span>Actual (publicado)</span>
                <span>Propuesto</span>
              </div>
              <DiffRow
                label="Nombre"
                current={current.name}
                proposed={proposed.name ?? current.name}
                changed={proposed.name !== undefined && proposed.name !== current.name}
              />
              <DiffRow
                label="Descripción"
                current={current.description ?? '—'}
                proposed={proposed.description !== undefined ? proposed.description ?? '—' : current.description ?? '—'}
                changed={proposed.description !== undefined && proposed.description !== current.description}
              />
              <DiffRow
                label="Categoría"
                current={current.category ?? '—'}
                proposed={proposed.category ?? current.category ?? '—'}
                changed={proposed.category !== undefined && proposed.category !== current.category}
              />
              <DiffRow
                label="Precio"
                current={formatPrice(current.price)}
                proposed={formatPrice(proposed.price !== undefined ? proposed.price : current.price)}
                changed={proposed.price !== undefined && proposed.price !== current.price}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                <dt className="font-medium text-slate-500">Nombre</dt>
                <dd className="text-slate-900">{proposed.name}</dd>
                <dt className="font-medium text-slate-500">Descripción</dt>
                <dd className="text-slate-700">{proposed.description ?? '—'}</dd>
                <dt className="font-medium text-slate-500">Categoría</dt>
                <dd className="text-slate-700">{proposed.category ?? '—'}</dd>
                <dt className="font-medium text-slate-500">Precio</dt>
                <dd className="text-slate-700">{formatPrice(proposed.price)}</dd>
              </dl>
            </div>
          )}
        </div>

        {proposal.status === 'REJECTED' && proposal.rejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="font-medium">Motivo del rechazo:</span> {proposal.rejectionReason}
          </div>
        )}

        {!isPending && proposal.reviewedByName && (
          <p className="text-xs text-slate-400">
            Revisada por {proposal.reviewedByName}
            {proposal.reviewedAt ? ` · ${formatDateTime(proposal.reviewedAt)}` : ''}
          </p>
        )}

        {isPending && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            {rejecting && (
              <Textarea
                label="Motivo del rechazo"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError(null);
                }}
                error={reasonError ?? undefined}
                placeholder="Explicá por qué se rechaza esta propuesta…"
              />
            )}
            <div className="flex justify-end gap-3">
              {!rejecting && (
                <>
                  <Button type="button" variant="danger" onClick={() => setRejecting(true)}>
                    Rechazar
                  </Button>
                  <Button type="button" onClick={() => setConfirmingApprove(true)}>
                    Aprobar
                  </Button>
                </>
              )}
              {rejecting && (
                <>
                  <Button type="button" variant="secondary" onClick={() => setRejecting(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    isLoading={isRejecting}
                    onClick={handleReject}
                  >
                    Confirmar rechazo
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmingApprove && (
        <ConfirmDialog
          title="Aprobar propuesta"
          description={
            isEdit
              ? 'Los cambios propuestos se publicarán en el catálogo de inmediato. ¿Confirmás?'
              : 'El producto se creará y quedará publicado en el catálogo de inmediato. ¿Confirmás?'
          }
          confirmLabel="Aprobar"
          variant="primary"
          isLoading={isApproving}
          onConfirm={handleApprove}
          onCancel={() => setConfirmingApprove(false)}
        />
      )}
    </Modal>
  );
}
