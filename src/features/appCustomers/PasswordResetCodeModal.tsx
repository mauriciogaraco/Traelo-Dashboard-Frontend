import { useState } from 'react';
import { Copy, KeyRound, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { PasswordResetCodeDTO } from '@/lib/types';
import { useCreatePasswordResetCodeMutation } from './appCustomersApi';
import { buildResetMessage, buildResetWhatsappUrl } from './passwordResetCode';

interface PasswordResetCodeModalProps {
  customer: { id: string; name: string; phone: string };
  onClose: () => void;
}

/**
 * Genera el código para restablecer la contraseña de un cliente que la olvidó y lo manda por WhatsApp al
 * teléfono de ESA cuenta. El código se muestra una sola vez (en la base solo queda su hash); generar otro
 * anula el anterior.
 */
export function PasswordResetCodeModal({ customer, onClose }: PasswordResetCodeModalProps) {
  const { showToast } = useToast();
  const [createCode, { isLoading }] = useCreatePasswordResetCodeMutation();
  const [issued, setIssued] = useState<PasswordResetCodeDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    const result = await createCode(customer.id);
    if ('error' in result) {
      setError(getErrorMessage(result.error));
      return;
    }
    setIssued(result.data.data);
  }

  async function handleCopy(code: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('sin portapapeles');
      await navigator.clipboard.writeText(code);
      showToast('Código copiado', 'success');
    } catch {
      showToast('No se pudo copiar. Selecciona el código y cópialo a mano.', 'error');
    }
  }

  const message = issued
    ? buildResetMessage({ name: issued.customer.name, code: issued.code, expiresInMinutes: issued.expiresInMinutes })
    : null;
  const whatsappUrl = issued && message ? buildResetWhatsappUrl(issued.customer.phone, message) : null;

  return (
    <Modal title="Restablecer contraseña" onClose={onClose}>
      {!issued ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Vas a generar un código para que <span className="font-medium text-slate-900">{customer.name}</span> (
            {customer.phone}) elija una contraseña nueva.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Vale 60 minutos y se usa una sola vez.</li>
            <li>Si ya había un código sin usar, queda anulado.</li>
            <li>Al cambiar la contraseña se cierran todas sus sesiones.</li>
            <li>Mándalo solo al WhatsApp de esa cuenta: quien tenga el código puede entrar a ella.</li>
          </ul>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} isLoading={isLoading}>
              <KeyRound className="h-4 w-4" />
              Generar código
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Código de {issued.customer.name}</p>
            <p
              className="mt-1 select-all font-mono text-3xl font-bold tracking-widest text-slate-900"
              data-testid="reset-code"
            >
              {issued.code}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vale {issued.expiresInMinutes} minutos (hasta las{' '}
              {new Date(issued.expiresAt).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}) y se
              usa una sola vez.
            </p>
          </div>
          <p className="text-sm text-slate-600">
            Este código no se vuelve a mostrar. Envíalo al WhatsApp de la cuenta ({issued.customer.phone}).
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => handleCopy(issued.code)}>
              <Copy className="h-4 w-4" />
              Copiar código
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
            <Button onClick={onClose}>Listo</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
