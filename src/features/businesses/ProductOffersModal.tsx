import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { ProductDTO, ProductOfferDTO } from '@/lib/types';
import {
  useCreateProductOfferMutation,
  useListProductOffersQuery,
  useUpdateProductOfferMutation,
} from './businessesApi';

const schema = z
  .object({
    price: z
      .string()
      .min(1, 'Requerido')
      .refine((v) => Number(v) >= 0, 'Debe ser mayor o igual a 0'),
    startsAt: z.string().min(1, 'Requerido'),
    endsAt: z.string().min(1, 'Requerido'),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.startsAt < data.endsAt, {
    message: 'El inicio debe ser anterior al fin',
    path: ['endsAt'],
  });

type FormValues = z.infer<typeof schema>;

// <input type="datetime-local"> trabaja con "YYYY-MM-DDTHH:mm" en hora local del navegador.
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOfferStatus(offer: ProductOfferDTO): {
  label: string;
  tone: 'green' | 'amber' | 'slate' | 'red';
} {
  if (!offer.active) return { label: 'Desactivada', tone: 'slate' };
  const now = Date.now();
  if (new Date(offer.endsAt).getTime() < now) return { label: 'Vencida', tone: 'red' };
  if (new Date(offer.startsAt).getTime() > now) return { label: 'Programada', tone: 'amber' };
  return { label: 'Vigente', tone: 'green' };
}

interface OfferFormProps {
  businessId: string;
  productId: string;
  offer: ProductOfferDTO | null;
  onDone: () => void;
}

function OfferForm({ businessId, productId, offer, onDone }: OfferFormProps) {
  const [createOffer, { isLoading: isCreating, error: createError }] =
    useCreateProductOfferMutation();
  const [updateOffer, { isLoading: isUpdating, error: updateError }] =
    useUpdateProductOfferMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      price: offer ? String(offer.price) : '',
      startsAt: offer ? toLocalInputValue(offer.startsAt) : '',
      endsAt: offer ? toLocalInputValue(offer.endsAt) : '',
    },
  });

  async function onSubmit(values: FormValues) {
    const body = {
      businessId,
      productId,
      price: Number(values.price),
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
    };
    if (offer) {
      await updateOffer({ ...body, offerId: offer.id }).unwrap();
    } else {
      await createOffer(body).unwrap();
    }
    onDone();
  }

  const error = createError ?? updateError;

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormField
        label="Precio de oferta (CUP)"
        type="number"
        min={0}
        step="0.01"
        error={errors.price?.message}
        {...register('price')}
      />
      <FormField
        label="Inicio"
        type="datetime-local"
        error={errors.startsAt?.message}
        {...register('startsAt')}
      />
      <FormField
        label="Fin"
        type="datetime-local"
        error={errors.endsAt?.message}
        {...register('endsAt')}
      />
      {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isCreating || isUpdating}>
          {offer ? 'Guardar oferta' : 'Crear oferta'}
        </Button>
      </div>
    </form>
  );
}

interface ProductOffersModalProps {
  businessId: string;
  product: ProductDTO;
  onClose: () => void;
}

export function ProductOffersModal({ businessId, product, onClose }: ProductOffersModalProps) {
  const { showToast } = useToast();
  // undefined = viendo la lista; null = formulario de oferta nueva; objeto = editando esa oferta.
  const [formTarget, setFormTarget] = useState<ProductOfferDTO | null | undefined>(undefined);

  const { data, isLoading } = useListProductOffersQuery({ businessId, productId: product.id });
  const [updateOffer] = useUpdateProductOfferMutation();

  async function handleToggleActive(offer: ProductOfferDTO) {
    const res = await updateOffer({
      businessId,
      productId: product.id,
      offerId: offer.id,
      active: !offer.active,
    });
    if ('error' in res) {
      showToast('No se pudo actualizar la oferta', 'error');
    }
  }

  const offers = data?.data ?? [];

  return (
    <Modal title={`Ofertas de ${product.name}`} onClose={onClose} widthClassName="max-w-2xl">
      {formTarget !== undefined ? (
        <OfferForm
          businessId={businessId}
          productId={product.id}
          offer={formTarget}
          onDone={() => setFormTarget(undefined)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Precio normal: {product.price !== null ? `${product.price} CUP` : 'sin precio'}. Una
              oferta es un precio promocional temporal; no reemplaza el precio normal.
            </p>
            <Button type="button" onClick={() => setFormTarget(null)}>
              <Plus className="h-4 w-4" />
              Nueva oferta
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Vigencia</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Cargando…
                    </td>
                  </tr>
                )}
                {!isLoading && offers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Este producto no tiene ofertas.
                    </td>
                  </tr>
                )}
                {offers.map((offer) => {
                  const status = getOfferStatus(offer);
                  return (
                    <tr key={offer.id} className="text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-900">{offer.price} CUP</td>
                      <td className="px-4 py-3 text-xs">
                        {formatDateTime(offer.startsAt)}
                        <br />
                        {formatDateTime(offer.endsAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" onClick={() => setFormTarget(offer)}>
                            Editar
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => handleToggleActive(offer)}>
                            {offer.active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
