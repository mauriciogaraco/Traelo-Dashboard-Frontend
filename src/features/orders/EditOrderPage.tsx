import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Switch } from '@/components/ui/Switch';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { BusinessGroupsEditor } from './BusinessGroupsEditor';
import { emptyGroup, makeId, type GroupDraft, type ItemDraft } from './orderDraftTypes';
import {
  useAssignOrderMutation,
  useGetOrderQuery,
  useUpdateOrderMutation,
} from './ordersApi';

export function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetOrderQuery(id ?? '', { skip: !id });
  const { data: businessesData } = useListBusinessesQuery({ active: true, pageSize: 100 });
  const businesses = useMemo(() => businessesData?.data ?? [], [businessesData]);
  const { data: deliverersData } = useListDeliverersQuery({ active: true, pageSize: 100 });
  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: d.phone ?? undefined,
  }));

  const [initialized, setInitialized] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [chargePlatformFee, setChargePlatformFee] = useState(true);
  const [platformFeeOverride, setPlatformFeeOverride] = useState('');
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupDraft[]>([emptyGroup()]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || initialized) return;
    const order = data.data;
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone);
    setCustomerAddress(order.customerAddress);
    setAddressReference(order.addressReference ?? '');
    setDeliveryFee(String(order.deliveryFee));
    setChargePlatformFee(order.platformFee > 0);
    setPlatformFeeOverride(String(order.platformFee));
    setDelivererId(order.delivererId);
    setGroups(
      order.businesses.map((ob) => ({
        key: makeId(),
        businessId: ob.businessId,
        items: ob.items.map(
          (item): ItemDraft => ({
            key: makeId(),
            productName: item.productName,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
          }),
        ),
      })),
    );
    setInitialized(true);
  }, [data, initialized]);

  const [updateOrder, { isLoading: isSaving }] = useUpdateOrderMutation();
  const [assignOrder, { isLoading: isAssigning }] = useAssignOrderMutation();
  const isSubmitting = isSaving || isAssigning;

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
      prev.map((g) =>
        g.key === groupKey
          ? { ...g, items: [...g.items, { key: makeId(), productName: '', quantity: '1', unitPrice: '' }] }
          : g,
      ),
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
    if (!id || !data) return;

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setFormError('Completá cliente, teléfono y dirección.');
      return;
    }
    if (deliveryFee === '' || Number.isNaN(feeNumber) || feeNumber < 0) {
      setFormError('La mensajería debe ser un número válido.');
      return;
    }
    let platformFeeOverrideValue: number | undefined;
    if (!chargePlatformFee) {
      platformFeeOverrideValue = 0;
    } else if (platformFeeOverride !== '') {
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
      await updateOrder({
        id,
        body: {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          addressReference: addressReference.trim() || undefined,
          deliveryFee: feeNumber,
          platformFeeOverride: platformFeeOverrideValue,
          businesses: cleanedGroups.map((g) => ({ businessId: g.businessId as string, items: g.items })),
        },
      }).unwrap();

      if (delivererId && delivererId !== data.data.delivererId) {
        await assignOrder({ id, delivererId }).unwrap();
      }

      navigate(`/orders/${id}`, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err as Parameters<typeof getErrorMessage>[0]));
    }
  }

  if (isLoading || !initialized) {
    return <p className="text-slate-400">Cargando…</p>;
  }
  if (error || !data) {
    return <p className="text-red-600">No se pudo cargar el pedido.</p>;
  }
  if (data.data.status === 'COMPLETED' || data.data.status === 'CANCELLED') {
    return <p className="text-red-600">Este pedido ya no se puede editar.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to={`/orders/${id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Pedido #{data.data.orderNumber}
      </Link>

      <h1 className="text-xl font-semibold text-slate-900">Editar pedido #{data.data.orderNumber}</h1>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
            label="Mensajero"
            value={delivererId}
            onChange={setDelivererId}
            options={delivererOptions}
            placeholder="Sin asignar"
          />
        </div>

        <BusinessGroupsEditor
          groups={groups}
          businesses={businesses}
          updateGroup={updateGroup}
          updateItem={updateItem}
          addGroup={addGroup}
          removeGroup={removeGroup}
          addItem={addItem}
          removeItem={removeItem}
        />

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
          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
            <Switch
              checked={chargePlatformFee}
              onChange={setChargePlatformFee}
              label="Cobrar Servicio Tráelo"
            />
            {chargePlatformFee ? (
              <FormField
                label="Servicio Tráelo (CUP)"
                type="number"
                min={0}
                step="0.01"
                placeholder="Se calcula automático"
                value={platformFeeOverride}
                onChange={(e) => setPlatformFeeOverride(e.target.value)}
              />
            ) : (
              <p className="text-xs text-slate-500">
                Este pedido no cobra Servicio Tráelo — se guarda en 0 CUP.
              </p>
            )}
          </div>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-3">
          <Link to={`/orders/${id}`}>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" isLoading={isSubmitting}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
