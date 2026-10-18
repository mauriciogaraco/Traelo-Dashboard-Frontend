import { useState } from 'react';
import { Check, Copy, MessageCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { OrderDTO } from '@/lib/types';
import {
  buildReviewMessage,
  buildReviewWhatsappUrl,
  reviewLinkAvailability,
  reviewLinkUrl,
} from './reviewLink';

/**
 * Enlace para que el cliente valore su entrega: el mensajero (o el equipo) se lo pasa por WhatsApp y le abre
 * directo la valoración. Importa porque los mensajeros cobran por valoraciones. La valoración exige cuenta: en un
 * pedido sin cliente vinculado el enlace no serviría y se explica cómo arreglarlo.
 */
export function ReviewLinkCard({ order }: { order: OrderDTO }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const availability = reviewLinkAvailability(order);
  if (availability === 'cancelled') return null;

  const url = reviewLinkUrl(order.id);
  const message = buildReviewMessage({ name: order.customerName, orderNumber: order.orderNumber, url });
  const whatsappUrl = buildReviewWhatsappUrl(order.customerPhone, message);

  async function handleCopy() {
    setCopyError(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API no disponible');
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Star className="h-4 w-4 text-amber-500" />
        Enlace para que el cliente valore
      </h2>

      {availability === 'needs-account' ? (
        <p className="text-sm text-slate-600">
          Este pedido se hizo <span className="font-medium">sin cuenta</span>, por eso no se puede valorar: las
          valoraciones quedan ligadas a una cuenta. Si el cliente se crea una cuenta, vincúlala a este pedido en{' '}
          <span className="font-medium">Editar pedido → Vincular cuenta</span> y el enlace le servirá.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Pásaselo al cliente para que valore su entrega. Le pide iniciar sesión con su cuenta si hace falta.
            {availability === 'not-delivered-yet' && (
              <span className="mt-1 block text-amber-700">
                Todavía no está entregado: el cliente podrá valorar cuando se marque como entregado.
              </span>
            )}
          </p>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            aria-label="Enlace de valoración"
            className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar por WhatsApp
              </a>
            )}
          </div>
          {copyError && (
            <p className="mt-2 text-sm text-red-600">No se pudo copiar automáticamente. Selecciona el enlace y cópialo a mano.</p>
          )}
        </>
      )}
    </div>
  );
}
