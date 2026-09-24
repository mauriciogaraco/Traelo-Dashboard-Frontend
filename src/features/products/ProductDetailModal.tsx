import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/ToastProvider';
import type { AdminProductDTO } from '@/lib/types';
import { useUpdateProductMutation } from '@/features/businesses/businessesApi';

interface ProductDetailModalProps {
  product: AdminProductDTO;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { showToast } = useToast();
  const [updateProduct, { isLoading }] = useUpdateProductMutation();

  async function toggleFeatured() {
    try {
      await updateProduct({
        businessId: product.businessId,
        productId: product.id,
        body: { featured: !product.featured },
      }).unwrap();
      showToast(product.featured ? 'Quitado de destacados' : 'Marcado como destacado');
    } catch {
      showToast('No se pudo guardar el cambio', 'error');
    }
  }

  return (
    <Modal title="Detalle del producto" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <Thumbnail src={product.imageUrl} alt={product.name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-900">{product.name}</h3>
              <button
                type="button"
                onClick={toggleFeatured}
                disabled={isLoading}
                title={product.featured ? 'Quitar de destacados' : 'Marcar como destacado'}
                aria-pressed={product.featured}
                className="shrink-0 rounded-full p-1.5 text-amber-500 transition-colors hover:bg-amber-50 disabled:opacity-50"
              >
                <Star className="h-5 w-5" fill={product.featured ? 'currentColor' : 'none'} />
              </button>
            </div>
            <p className="text-sm text-slate-500">{product.businessName}</p>
          </div>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {product.featured
            ? 'Destacado: aparece en "Ofertas destacadas" en el Home de la app.'
            : 'No está destacado — no aparece en "Ofertas destacadas" del Home.'}
        </p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Precio</dt>
            <dd className="font-medium text-slate-900">
              {product.price !== null ? `${product.price} CUP` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Categoría</dt>
            <dd className="font-medium text-slate-900">{product.category ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Estado</dt>
            <dd>
              <Badge tone={product.active ? 'green' : 'slate'}>
                {product.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Disponibilidad</dt>
            <dd>
              <Badge tone={product.available ? 'green' : 'amber'}>
                {product.available ? 'Disponible' : 'Agotado'}
              </Badge>
            </dd>
          </div>
        </dl>

        {product.description && (
          <div>
            <p className="text-sm text-slate-500">Descripción</p>
            <p className="mt-1 text-sm text-slate-700">{product.description}</p>
          </div>
        )}

        <div className="mt-1 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
