import { Modal } from '@/components/ui/Modal';
import type { DateRangePreset } from '@/lib/types';
import { useGetBusinessSalesDetailQuery } from './reportsApi';

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

interface BusinessDetailModalProps {
  businessId: string;
  businessName: string;
  range: Exclude<DateRangePreset, 'custom'>;
  onClose: () => void;
}

export function BusinessDetailModal({
  businessId,
  businessName,
  range,
  onClose,
}: BusinessDetailModalProps) {
  const { data, isLoading } = useGetBusinessSalesDetailQuery({ businessId, range });
  const detail = data?.data;

  return (
    <Modal title={businessName} onClose={onClose} widthClassName="max-w-lg">
      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {detail && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ventas totales</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCUP(detail.totalSales)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Comisión generada</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCUP(detail.totalCommission)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pedidos</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{detail.orderCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Venta promedio</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCUP(detail.averageSale)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Venta máxima</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCUP(detail.maxSale)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Productos más vendidos</h3>
            {detail.topProducts.length === 0 ? (
              <p className="text-sm text-slate-400">Sin datos en este periodo.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 font-medium">Cantidad</th>
                      <th className="px-3 py-2 font-medium">Ventas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.topProducts.map((product) => (
                      <tr key={`${product.productId ?? 'sin-catalogo'}-${product.productName}`}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {product.productName}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{product.quantitySold}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatCUP(product.totalSales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
