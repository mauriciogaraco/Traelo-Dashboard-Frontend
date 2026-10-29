import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Switch } from '@/components/ui/Switch';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { describeDeliveryFeeSuggestion, suggestDeliveryFee } from '@/lib/deliveryFeeSuggestion';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { BusinessGroupsEditor } from './BusinessGroupsEditor';
import { OrderFlagsFields, type OrderFlags } from './OrderFlagsFields';
import { OrderFormActions } from './OrderFormActions';
import { CustomerLinkField } from './CustomerLinkField';
import { emptyGroup, emptyItem, makeId, type GroupDraft, type ItemDraft } from './orderDraftTypes';
import {
  useAssignOrderMutation,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
} from './ordersApi';
import { parseOrderText } from './orderTextParser';
import { useCustomerLookup } from './useCustomerLookup';

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
  // Mientras el staff no toque la mensajería, se rellena sola con la sugerida (ver deliveryFeeSuggestion).
  const [feeTouched, setFeeTouched] = useState(false);
  // La hora cuenta para el recargo nocturno: se refresca cada minuto con el formulario abierto.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [chargePlatformFee, setChargePlatformFee] = useState(true);
  const [platformFeeOverride, setPlatformFeeOverride] = useState('');
  const [raffleNumber, setRaffleNumber] = useState('');
  const [flags, setFlags] = useState<OrderFlags>({
    customerConfirmed: false,
    orderedWithBusiness: false,
    inviteToApp: false,
  });
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupDraft[]>([emptyGroup()]);
  const [formError, setFormError] = useState<string | null>(null);

  // "Vincular cuenta": busca si el teléfono es de un cliente registrado — si lo encuentra, el
  // pedido manual se vincula a esa cuenta y cuenta para puntos como si lo hubiera hecho el
  // propio cliente (ver orders.service.lookupCustomerByPhone en el backend).
  const [linkCustomer, setLinkCustomer] = useState(false);
  const { searchEligible, foundCustomer, isSearching: isSearchingCustomer, notFound: customerNotFound } =
    useCustomerLookup(customerPhone, linkCustomer);

  // Con una ciudad activa la lista ya viene filtrada. Con "Todas", en cuanto se elige el primer
  // negocio el pedido queda en su ciudad: los demás negocios y los mensajeros se acotan a ella
  // (el backend rechaza pedidos con negocios de ciudades distintas).
  const { data: businessesData } = useListBusinessesQuery({ active: true, pageSize: 100 });
  const allBusinesses = useMemo(() => businessesData?.data ?? [], [businessesData]);
  const orderCityId = useMemo(() => {
    const firstId = groups.find((g) => g.businessId)?.businessId;
    return allBusinesses.find((b) => b.id === firstId)?.cityId ?? undefined;
  }, [groups, allBusinesses]);
  const businesses = useMemo(
    () => (orderCityId ? allBusinesses.filter((b) => b.cityId === orderCityId) : allBusinesses),
    [allBusinesses, orderCityId],
  );
  const { data: deliverersData } = useListDeliverersQuery({
    active: true,
    pageSize: 100,
    ...(orderCityId ? { cityId: orderCityId } : {}),
  });
  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: d.phone ?? undefined,
  }));

  const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
  const [assignOrder, { isLoading: isAssigning }] = useAssignOrderMutation();
  const [updateOrderStatus, { isLoading: isAdvancing }] = useUpdateOrderStatusMutation();
  const isSubmitting = isCreating || isAssigning || isAdvancing;

  function handleParse() {
    const draft = parseOrderText(pasteText, businesses);
    if (draft.customerName) setCustomerName(draft.customerName);
    if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
    if (draft.customerAddress) setCustomerAddress(draft.customerAddress);
    if (draft.addressReference) setAddressReference(draft.addressReference);
    if (draft.deliveryFee !== null) {
      setDeliveryFee(String(draft.deliveryFee));
      setFeeTouched(true);
    }
    if (draft.platformFeeOverride !== null) {
      setPlatformFeeOverride(String(draft.platformFeeOverride));
      // Si el vale trae "Servicio Tráelo: 0", asumimos que este pedido puntual no lo cobra.
      if (draft.platformFeeOverride === 0) setChargePlatformFee(false);
    }
    if (draft.raffleNumber !== null) setRaffleNumber(String(draft.raffleNumber));
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

  // Mensajería sugerida según los negocios elegidos, la hora (La Habana) y el subtotal.
  const suggestion = useMemo(() => {
    const chosen = groups
      .map((g) => businesses.find((b) => b.id === g.businessId))
      .filter((b): b is NonNullable<typeof b> => !!b);
    return suggestDeliveryFee({
      deliveryFeeBases: chosen.map((b) => Number(b.deliveryFeeBase) || 0),
      productsSubtotal: subtotal,
      now,
    });
  }, [groups, businesses, subtotal, now]);
  const suggestedFee = suggestion?.total ?? null;
  useEffect(() => {
    if (!feeTouched && suggestedFee !== null) setDeliveryFee(String(suggestedFee));
  }, [feeTouched, suggestedFee]);

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
    let raffleNumberValue: number | undefined;
    if (raffleNumber !== '') {
      const parsed = Number(raffleNumber);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setFormError('El número del sorteo debe ser un entero positivo.');
        return;
      }
      raffleNumberValue = parsed;
    }

    const cleanedGroups = groups
      .map((g) => ({
        businessId: g.businessId,
        items: g.items
          .filter((it) => it.productName.trim() && it.unitPrice !== '')
          .map((it) => ({
            ...(it.productId ? { productId: it.productId } : {}),
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
    if (linkCustomer && !foundCustomer) {
      setFormError(
        isSearchingCustomer
          ? 'Esperá a que termine de buscar el cliente antes de crear el pedido.'
          : 'Activaste "Vincular cuenta" pero no se encontró ningún cliente con ese teléfono. Corregí el número o apagá el switch para crear el pedido sin vincular.',
      );
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
        raffleNumber: raffleNumberValue,
        ...(flags.customerConfirmed ? { customerConfirmed: true } : {}),
        ...(flags.orderedWithBusiness ? { orderedWithBusiness: true } : {}),
        ...(flags.inviteToApp ? { inviteToApp: true } : {}),
        customerId: foundCustomer?.id,
        businesses: cleanedGroups.map((g) => ({ businessId: g.businessId as string, items: g.items })),
      }).unwrap();

      if (delivererId) {
        await assignOrder({ id: created.data.id, delivererId }).unwrap();
        // Con mensajero ya elegido (queda aceptado), las marcas también mueven el estado: "ya se
        // encargó" = Marchando, "ya se confirmó" = Confirmado. Sin mensajero solo se guardan los
        // avisos: el estado cambia cuando el mensajero de la cola acepte el pedido.
        if (flags.orderedWithBusiness || flags.customerConfirmed) {
          await updateOrderStatus({
            id: created.data.id,
            status: flags.orderedWithBusiness ? 'HEADING_OUT' : 'CONFIRMED',
          }).unwrap();
        }
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
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
        <form className="flex flex-col gap-4 sm:gap-5" onSubmit={handleSubmit} noValidate>
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

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 sm:grid-cols-2 sm:gap-4">
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
            <CustomerLinkField
              phone={customerPhone}
              linked={linkCustomer}
              onLinkedChange={setLinkCustomer}
              searchEligible={searchEligible}
              isSearching={isSearchingCustomer}
              foundCustomer={foundCustomer}
              notFound={customerNotFound}
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
            <div className="flex flex-col gap-1">
              <FormField
                label="Mensajería (CUP)"
                name="deliveryFee"
                type="number"
                min={0}
                step="0.01"
                value={deliveryFee}
                onChange={(e) => {
                  setDeliveryFee(e.target.value);
                  setFeeTouched(true);
                }}
              />
              {suggestion && (
                <p className="text-xs text-slate-500">
                  Sugerida: <span className="font-medium text-slate-700">{suggestion.total} CUP</span> (
                  {describeDeliveryFeeSuggestion(suggestion)}).
                  {feeTouched && Number(deliveryFee) !== suggestion.total && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryFee(String(suggestion.total));
                          setFeeTouched(false);
                        }}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Usar la sugerida
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
            <SearchableSelect
              label="Mensajero (opcional)"
              value={delivererId}
              onChange={setDelivererId}
              options={delivererOptions}
              placeholder="Asignar después"
            />
          </div>

          <OrderFlagsFields value={flags} onChange={setFlags} willAdvanceStatus={!!delivererId} />

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

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 sm:max-w-sm sm:self-end">
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
                  label="Servicio Tráelo (opcional)"
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
              <FormField
                label="Número del sorteo (opcional)"
                type="number"
                min={1}
                step="1"
                placeholder="Ej. 5"
                value={raffleNumber}
                onChange={(e) => setRaffleNumber(e.target.value)}
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <OrderFormActions
            cancelTo="/orders"
            submitLabel="Crear pedido"
            isSubmitting={isSubmitting}
            total={subtotal + feeNumber}
          />
        </form>
      )}
    </div>
  );
}
