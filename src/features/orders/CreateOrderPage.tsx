import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useAssignOrderMutation, useCreateOrderMutation } from './ordersApi';
import { parseOrderText } from './orderTextParser';

interface ItemDraft {
  key: string;
  productName: string;
  quantity: string;
  unitPrice: string;
}

interface GroupDraft {
  key: string;
  businessId: string | null;
  items: ItemDraft[];
}

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

function emptyItem(): ItemDraft {
  return { key: makeId(), productName: '', quantity: '1', unitPrice: '' };
}

function emptyGroup(): GroupDraft {
  return { key: makeId(), businessId: null, items: [emptyItem()] };
}

export function CreateOrderPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'manual' | 'paste'>('manual');
  const [pasteText, setPasteText] = useState('');
  const [unmatchedLines, setUnmatchedLines] = useState<string[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [platformFeeOverride, setPlatformFeeOverride] = useState('');
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupDraft[]>([emptyGroup()]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: businessesData } = useListBusinessesQuery({ active: true, pageSize: 100 });
  const businesses = useMemo(() => businessesData?.data ?? [], [businessesData]);
  const { data: deliverersData } = useListDeliverersQuery({ active: true, pageSize: 100 });
  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: d.phone ?? undefined,
  }));

  const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
  const [assignOrder, { isLoading: isAssigning }] = useAssignOrderMutation();
  const isSubmitting = isCreating || isAssigning;

  function handleParse() {
    const draft = parseOrderText(pasteText, businesses);
    if (draft.customerName) setCustomerName(draft.customerName);
    if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
    if (draft.customerAddress) setCustomerAddress(draft.customerAddress);
    if (draft.addressReference) setAddressReference(draft.addressReference);
    if (draft.deliveryFee !== null) setDeliveryFee(String(draft.deliveryFee));
    if (draft.platformFeeOverride !== null) setPlatformFeeOverride(String(draft.platformFeeOverride));
    if (draft.businessGroups.length > 0) {
      setGroups(
        draft.businessGroups.map((g) => ({
          key: makeId(),
          businessId: g.businessId,
          items:
            g.items.length > 0
              ? g.items.map((item) => ({
                  key: makeId(),
                  productName: item.productName,
                  quantity: String(item.quantity),
                  unitPrice: String(item.unitPrice),
                }))
              : [emptyItem()],
        })),
      );
    }
    setUnmatchedLines(draft.unmatchedLines);
    setMode('manual');
  }

  function updateGroup(key: string, patch: Partial<GroupDraft>) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  function updateItem(groupKey: string, itemKey: string, patch: Partial<ItemDraft>) {
    setGroups((prev) =>
      prev.map((g) =>
        g.key !== groupKey
          ? g
          : { ...g, items: g.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)) },
      ),
    );
  }

  function addGroup() {
    setGroups((prev) => [...prev, emptyGroup()]);
  }

  function removeGroup(key: string) {
    setGroups((prev) => (prev.length > 1 ? prev.filter((g) => g.key !== key) : prev));
  }

  function addItem(groupKey: string) {
    setGroups((prev) =>
      prev.map((g) => (g.key === groupKey ? { ...g, items: [...g.items, emptyItem()] } : g)),
    );
  }

  function removeItem(groupKey: string, itemKey: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.key !== groupKey || g.items.length <= 1
          ? g
          : { ...g, items: g.items.filter((it) => it.key !== itemKey) },
      ),
    );
  }

  const subtotal = groups.reduce(
    (acc, g) =>
      acc + g.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    0,
  );
  const feeNumber = Number(deliveryFee) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setFormError('Completá cliente, teléfono y dirección.');
      return;
    }
    if (deliveryFee === '' || Number.isNaN(feeNumber) || feeNumber < 0) {
      setFormError('La mensajería debe ser un número válido.');
      return;
    }
    let platformFeeOverrideValue: number | undefined;
    if (platformFeeOverride !== '') {
      const parsed = Number(platformFeeOverride);
      if (Number.isNaN(parsed) || parsed < 0) {
        setFormError('El Servicio Tráelo debe ser un número válido.');
        return;
      }
      platformFeeOverrideValue = parsed;
    }

    const cleanedGroups = groups
      .map((g) => ({
        businessId: g.businessId,
        items: g.items
          .filter((it) => it.productName.trim() && it.unitPrice !== '')
          .map((it) => ({
            productName: it.productName.trim(),
            quantity: Math.max(1, Math.trunc(Number(it.quantity)) || 1),
            unitPrice: Number(it.unitPrice) || 0,
          })),
      }))
      .filter((g) => g.items.length > 0);

    if (cleanedGroups.length === 0) {
      setFormError('Agregá al menos un producto.');
      return;
    }
    if (cleanedGroups.some((g) => !g.businessId)) {
      setFormError('Elegí el negocio de cada grupo de productos.');
      return;
    }
    const businessIds = cleanedGroups.map((g) => g.businessId);
    if (new Set(businessIds).size !== businessIds.length) {
      setFormError('No podés repetir el mismo negocio en el pedido.');
      return;
    }

    try {
      const created = await createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        addressReference: addressReference.trim() || undefined,
        deliveryFee: feeNumber,
        platformFeeOverride: platformFeeOverrideValue,
        businesses: cleanedGroups.map((g) => ({ businessId: g.businessId as string, items: g.items })),
      }).unwrap();

      if (delivererId) {
        await assignOrder({ id: created.data.id, delivererId }).unwrap();
      }

      navigate(`/orders/${created.data.id}`, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err as Parameters<typeof getErrorMessage>[0]));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Pedidos
      </Link>

      <h1 className="text-xl font-semibold text-slate-900">Nuevo pedido</h1>

      <div className="flex gap-1 border-b border-slate-200">
        {(['manual', 'paste'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {m === 'manual' ? 'Manual' : 'Pegar texto'}
          </button>
        ))}
      </div>

      {mode === 'paste' && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pegá el pedido tal como lo recibiste (WhatsApp, notas, etc). El sistema intenta
            separar cliente, teléfono, dirección, mensajería y los productos por negocio — vas a
            poder revisar y corregir todo antes de guardar.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder={
              'Cliente: María Pérez\nTel: 5555 1234\nDirección: Calle 23 #456\n\nLa Marina\n2x Pizza familiar - 500\n\nMensajería: 250'
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={handleParse} disabled={!pasteText.trim()}>
              Interpretar texto
            </Button>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {unmatchedLines.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">No se pudieron interpretar estas líneas:</p>
              <ul className="mt-1 list-inside list-disc">
                {unmatchedLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <p className="mt-1 text-amber-700">Agregalas a mano si hace falta.</p>
            </div>
          )}

          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <FormField
              label="Cliente"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <FormField
              label="Teléfono"
              name="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
            <FormField
              label="Dirección"
              name="customerAddress"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
            <FormField
              label="Referencia (opcional)"
              name="addressReference"
              value={addressReference}
              onChange={(e) => setAddressReference(e.target.value)}
            />
            <FormField
              label="Mensajería (CUP)"
              name="deliveryFee"
              type="number"
              min={0}
              step="0.01"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
            />
            <SearchableSelect
              label="Mensajero (opcional)"
              value={delivererId}
              onChange={setDelivererId}
              options={delivererOptions}
              placeholder="Asignar después"
            />
          </div>

          <div className="flex flex-col gap-4">
            {groups.map((group) => {
              const usedElsewhere = groups
                .filter((g) => g.key !== group.key)
                .map((g) => g.businessId)
                .filter(Boolean);
              const businessOptions = businesses
                .filter((b) => !usedElsewhere.includes(b.id))
                .map((b) => ({ value: b.id, label: b.name }));
              const groupSubtotal = group.items.reduce(
                (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
                0,
              );

              return (
                <div
                  key={group.key}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="w-64">
                      <SearchableSelect
                        label="Negocio"
                        value={group.businessId}
                        onChange={(value) => updateGroup(group.key, { businessId: value })}
                        options={businessOptions}
                        placeholder="Elegir negocio…"
                      />
                    </div>
                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGroup(group.key)}
                        className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                      >
                        <Trash2 className="h-4 w-4" />
                        Quitar negocio
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <div key={item.key} className="flex items-center gap-2">
                        <input
                          value={item.productName}
                          onChange={(e) =>
                            updateItem(group.key, item.key, { productName: e.target.value })
                          }
                          placeholder="Producto"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(group.key, item.key, { quantity: e.target.value })
                          }
                          placeholder="Cant."
                          className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(group.key, item.key, { unitPrice: e.target.value })
                          }
                          placeholder="Precio"
                          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(group.key, item.key)}
                          disabled={group.items.length <= 1}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => addItem(group.key)}>
                      <Plus className="h-4 w-4" />
                      Agregar producto
                    </Button>
                    <p className="text-sm text-slate-500">
                      Subtotal: <span className="font-medium text-slate-900">{groupSubtotal} CUP</span>
                    </p>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="secondary" onClick={addGroup} className="self-start">
              <Plus className="h-4 w-4" />
              Agregar negocio
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:max-w-sm sm:self-end">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal productos</dt>
                <dd className="font-medium text-slate-900">{subtotal} CUP</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Mensajería</dt>
                <dd className="font-medium text-slate-900">{feeNumber} CUP</dd>
              </div>
            </dl>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <FormField
                label="Servicio Tráelo (opcional)"
                type="number"
                min={0}
                step="0.01"
                placeholder="Se calcula automático"
                value={platformFeeOverride}
                onChange={(e) => setPlatformFeeOverride(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">
                Dejalo vacío para que el sistema lo calcule solo. Poné 0 si no se cobró en este
                pedido.
              </p>
            </div>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-3">
            <Link to="/orders">
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>
              Crear pedido
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
