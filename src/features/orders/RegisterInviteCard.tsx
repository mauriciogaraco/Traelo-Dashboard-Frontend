import { useState } from 'react';
import { Check, Copy, MessageCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { OrderDTO } from '@/lib/types';
import { REGISTER_URL, buildRegisterInviteMessage, buildRegisterWhatsappUrl } from './registerInvite';

/**
 * Cliente nuevo: el staff marcó el pedido para pasarle la app. Aquí queda el enlace de registro para
 * copiarlo o mandárselo por WhatsApp al cliente (el mensajero tiene la misma tarjeta en su vale).
 */
export function RegisterInviteCard({ order }: { order: OrderDTO }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  if (!order.inviteToApp || order.status === 'CANCELLED') return null;

  const message = buildRegisterInviteMessage({ name: order.customerName });
  const whatsappUrl = buildRegisterWhatsappUrl(order.customerPhone, message);

  async function handleCopy() {
    setCopyError(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API no disponible');
      await navigator.clipboard.writeText(REGISTER_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Smartphone className="h-4 w-4 text-brand-600" />
        Cliente nuevo: pasarle la app
      </h2>
      <p className="text-sm text-slate-500">
        El mensajero ve este aviso en su vale. Si el cliente no tiene cuenta, mándale el enlace para que se registre.
      </p>
      <input
        readOnly
        value={REGISTER_URL}
        onFocus={(e) => e.target.select()}
        aria-label="Enlace de registro"
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
    </div>
  );
}
