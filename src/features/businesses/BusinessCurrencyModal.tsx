import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useGetConfigQuery } from '@/features/config/configApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { PriceCurrency } from '@/lib/types';
import { useSetBusinessProductsCurrencyMutation } from './businessesApi';

interface BusinessCurrencyModalProps {
  businessId: string;
  businessName?: string;
  /** Moneda con la que nacen hoy los productos nuevos de este negocio. */
  currentCurrency: PriceCurrency;
  onClose: () => void;
}

/**
 * Pasa TODOS los productos de un negocio a USD (o de vuelta a CUP). Lo que se cobra al cliente siempre es CUP: los
 * productos en USD se convierten con la tasa de cambio global. Con "convertir", los precios ya escritos se reescriben con
 * la tasa vigente para que el cliente siga pagando lo mismo; sin él, los números quedan igual y solo cambia su moneda.
 */
export function BusinessCurrencyModal({ businessId, businessName, currentCurrency, onClose }: BusinessCurrencyModalProps) {
  const { showToast } = useToast();
  const { data: config } = useGetConfigQuery();
  const rate = config?.data.exchangeRate ?? config?.data.familiaExchangeRate;
  const [target, setTarget] = useState<PriceCurrency>(currentCurrency === 'USD' ? 'CUP' : 'USD');
  const [convertPrices, setConvertPrices] = useState(false);
  const [setCurrency, { isLoading, error }] = useSetBusinessProductsCurrencyMutation();

  async function onConfirm() {
    const result = await setCurrency({ businessId, currency: target, convertPrices }).unwrap();
    showToast(
      `${result.data.updated} producto${result.data.updated === 1 ? '' : 's'} pasado${result.data.updated === 1 ? '' : 's'} a ${target}`,
      'success',
    );
    onClose();
  }

  return (
    <Modal title="Moneda de los productos" onClose={onClose} widthClassName="max-w-lg">
      <div className="flex flex-col gap-4 text-sm text-slate-600">
        <p>
          {businessName ? <strong className="text-slate-900">{businessName}</strong> : 'Este negocio'} tiene sus productos
          nuevos en <strong className="text-slate-900">{currentCurrency}</strong>. Lo que se cobra al cliente siempre es CUP: los
          productos en USD se convierten con la tasa de cambio
          {rate ? (
            <>
              {' '}
              (hoy <strong className="text-slate-900">1 USD = {rate} CUP</strong>)
            </>
          ) : null}
          . La mensajería, el Servicio Tráelo y el empaque siempre son CUP.
        </p>

        <FormSelect label="Pasar TODOS sus productos a" value={target} onChange={(e) => setTarget(e.target.value as PriceCurrency)}>
          <option value="USD">USD (dólares)</option>
          <option value="CUP">CUP (pesos)</option>
        </FormSelect>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={convertPrices}
            onChange={(e) => setConvertPrices(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="font-medium text-slate-900">Convertir los precios actuales con la tasa</span>
            <span className="block text-xs text-slate-500">
              {convertPrices
                ? target === 'USD'
                  ? 'Los precios (y ofertas, precio por cantidad y agregos) se dividen entre la tasa y se redondean al centavo, así el cliente paga casi lo mismo en CUP (puede variar un par de pesos por el redondeo).'
                  : 'Los precios (y ofertas, precio por cantidad y agregos) se multiplican por la tasa y se redondean al peso.'
                : 'Los números quedan como están y solo cambia su moneda. Úsalo si los precios ya están escritos en la moneda nueva.'}
            </span>
          </span>
        </label>

        {error && <p className="text-red-600">{getErrorMessage(error)}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" isLoading={isLoading} onClick={onConfirm}>
            Pasar a {target}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
