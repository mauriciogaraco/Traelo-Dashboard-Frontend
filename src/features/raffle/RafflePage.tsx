import { useCallback, useEffect, useRef, useState } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import {
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  Phone,
  RotateCcw,
  Sparkles,
  Ticket,
  Trophy,
} from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Confetti } from './Confetti';
import { SlotReels } from './SlotReels';
import {
  useConfirmRaffleWinnerMutation,
  useDrawRaffleMutation,
  useGetRaffleSummaryQuery,
  type RaffleDrawDTO,
} from './raffleApi';
import './raffle.css';

// El giro dura al menos 30 s aunque el backend responda enseguida: es el suspenso del sorteo.
const SPIN_MS = 30_000;

// idle → spinning (busca + gira) → locking (los rodillos se detienen) → number (número fijo)
//      → winner (nombre y teléfono) → confirmed (guardado, con confeti)
type Phase = 'idle' | 'spinning' | 'locking' | 'number' | 'winner' | 'confirmed';

const SPINNING_MESSAGES = [
  'Mezclando todos los números…',
  'Revisando cada pedido…',
  'Buscando entre los pedidos completados…',
  'La suerte está decidiendo…',
  'Ya casi…',
];

// Posiciones fijas de las lucecitas del fondo (evita valores al azar distintos en cada render).
const SPARKS = [
  { left: '8%', top: '14%', delay: '0s' },
  { left: '22%', top: '72%', delay: '1.1s' },
  { left: '36%', top: '9%', delay: '2.3s' },
  { left: '61%', top: '84%', delay: '0.6s' },
  { left: '74%', top: '16%', delay: '1.8s' },
  { left: '90%', top: '58%', delay: '2.9s' },
  { left: '48%', top: '48%', delay: '3.4s' },
  { left: '13%', top: '44%', delay: '0.3s' },
  { left: '84%', top: '86%', delay: '1.5s' },
];

function formatPhone(raw: string): string {
  const compact = raw.replace(/[\s-]/g, '');
  if (/^\d{8}$/.test(compact)) return `${compact.slice(0, 4)} ${compact.slice(4)}`;
  const withCode = compact.match(/^(\+\d{1,3})(\d{8})$/);
  if (withCode) return `${withCode[1]} ${withCode[2]!.slice(0, 4)} ${withCode[2]!.slice(4)}`;
  return raw;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    timeZone: 'America/Havana',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type ApiError = FetchBaseQueryError | SerializedError | undefined;

export function RafflePage() {
  const { showToast } = useToast();
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } =
    useGetRaffleSummaryQuery();
  const [drawRaffle] = useDrawRaffleMutation();
  const [confirmRaffleWinner, { isLoading: confirming }] = useConfirmRaffleWinnerMutation();

  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0); // cambia en cada sorteo: reinicia los rodillos
  const [drawn, setDrawn] = useState<RaffleDrawDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);

  // Pedidos que ya salieron y se descartaron: "volver a sortear" no los repite.
  const seenRef = useRef<string[]>([]);
  // Invalida un sorteo en curso si se reinicia o se sale de la página.
  const runRef = useRef(0);

  useEffect(() => {
    const run = runRef;
    return () => {
      run.current++;
    };
  }, []);

  // Frases que rotan mientras se busca.
  useEffect(() => {
    if (phase !== 'spinning') return;
    setMessageIndex(0);
    const timer = setInterval(() => setMessageIndex((i) => (i + 1) % SPINNING_MESSAGES.length), 4200);
    return () => clearInterval(timer);
  }, [phase, round]);

  const startDraw = useCallback(async () => {
    const run = ++runRef.current;
    setError(null);
    setDrawn(null);
    setRound((r) => r + 1);
    setPhase('spinning');
    const startedAt = performance.now();

    try {
      // La búsqueda real arranca ya; los rodillos siguen girando aunque responda enseguida.
      const result = (await drawRaffle({ excludeOrderIds: seenRef.current }).unwrap()).data;
      const remaining = SPIN_MS - (performance.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      if (runRef.current !== run) return;
      seenRef.current = [...seenRef.current, result.orderId];
      setDrawn(result);
      setPhase('locking');
    } catch (e) {
      if (runRef.current !== run) return;
      setError(getErrorMessage(e as ApiError));
      setPhase('idle');
    }
  }, [drawRaffle]);

  const handleSettled = useCallback(() => {
    setPhase((current) => (current === 'locking' ? 'number' : current));
  }, []);

  async function handleConfirm() {
    if (!drawn) return;
    setError(null);
    try {
      await confirmRaffleWinner({ orderId: drawn.orderId }).unwrap();
      setPhase('confirmed');
      setConfettiKey((k) => k + 1);
    } catch (e) {
      setError(getErrorMessage(e as ApiError));
    }
  }

  function handleNewRaffle() {
    runRef.current++;
    seenRef.current = [];
    setDrawn(null);
    setError(null);
    setPhase('idle');
  }

  async function handleCopyPhone() {
    if (!drawn) return;
    try {
      await navigator.clipboard.writeText(drawn.customerPhone);
      showToast('Teléfono copiado');
    } catch {
      showToast('No se pudo copiar el teléfono', 'error');
    }
  }

  const summary = summaryData?.data;
  // Solo decide si se puede sortear: el número de participantes NO se muestra en la pantalla.
  const eligibleCount = summary?.eligibleCount ?? 0;
  const reelCount = Math.max(4, String(drawn?.raffleNumber ?? 0).length);
  const showReels = phase !== 'idle';
  const reelsBig = phase === 'number';
  const busy = phase === 'spinning' || phase === 'locking';
  // Con el ganador a la vista se compacta el escenario: los botones de confirmar deben verse sin scroll.
  const compact = phase === 'winner' || phase === 'confirmed';
  const canStart = !summaryLoading && !summaryError && eligibleCount > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8">
      <Confetti burstKey={confettiKey} />

      <section
        className={clsx(
          'raffle-stage rounded-3xl border border-white/10 px-5 py-10 text-center shadow-2xl sm:px-12 sm:py-14 md:flex md:min-h-[clamp(30rem,calc(100dvh-11rem),58rem)] md:items-center lg:px-16',
          compact && 'md:py-8',
        )}
      >
        {SPARKS.map((spark, i) => (
          <span
            key={i}
            className="raffle-spark"
            style={{ left: spark.left, top: spark.top, animationDelay: spark.delay }}
          />
        ))}

        <div
          className={clsx(
            'mx-auto flex w-full max-w-5xl flex-col items-center gap-6',
            compact ? '@3xl:gap-4 [@media(min-height:1000px)]:@3xl:gap-8' : '@3xl:gap-8',
          )}
        >
          <span className="raffle-badge">
            <Ticket className="h-4 w-4" />
            Sorteo de Tráelo
          </span>

          <h1
            className={clsx(
              'font-display text-3xl font-extrabold leading-tight text-white @xl:text-5xl',
              compact ? '@3xl:text-5xl' : '@3xl:text-6xl @5xl:text-7xl',
            )}
          >
            Primer sorteo de <span className="raffle-title-accent">Tráelo</span>
          </h1>

          <p className="min-h-6 text-sm text-slate-300 @xl:text-base @3xl:min-h-8 @3xl:text-xl" aria-live="polite">
            {phase === 'idle' &&
              (summaryLoading
                ? 'Preparando el sorteo…'
                : summaryError
                  ? 'No se pudo cargar el sorteo.'
                  : eligibleCount > 0
                    ? 'Todo listo para el sorteo'
                    : 'Todavía no hay pedidos completados con número de sorteo.')}
            {phase === 'spinning' && SPINNING_MESSAGES[messageIndex]}
            {phase === 'locking' && '¡Tenemos número!'}
            {phase === 'number' && 'El número ganador es…'}
            {phase === 'winner' && 'Y el ganador es…'}
            {phase === 'confirmed' && '¡Felicitaciones al ganador!'}
          </p>

          {phase === 'idle' && (
            <div className="flex flex-col items-center gap-7 py-4">
              <div className="raffle-float relative flex h-36 w-36 items-center justify-center rounded-full border border-amber-300/30 bg-white/5 shadow-[0_0_70px_-10px_rgba(255,176,46,0.55)] @3xl:h-48 @3xl:w-48">
                <Trophy className="h-16 w-16 text-amber-300 @3xl:h-24 @3xl:w-24" strokeWidth={1.5} />
                <Sparkles className="absolute -right-1 -top-1 h-8 w-8 text-brand-300 @3xl:h-10 @3xl:w-10" />
              </div>
              <p className="max-w-md text-slate-400 @3xl:max-w-xl @3xl:text-lg">
                Cada pedido completado con número de sorteo es una participación. Se elige uno al azar
                entre todos.
              </p>
              <button
                type="button"
                className="raffle-cta"
                onClick={startDraw}
                disabled={!canStart}
              >
                Revelar número ganador
              </button>
            </div>
          )}

          {showReels && (
            <div className="relative flex flex-col items-center gap-2">
              {phase === 'number' && <span key={`ring-${round}`} className="raffle-ring" />}
              <SlotReels
                key={round}
                count={reelCount}
                target={drawn?.raffleNumber ?? null}
                onSettled={handleSettled}
                revealed={phase === 'number' || phase === 'winner' || phase === 'confirmed'}
                size={reelsBig ? 'xl' : phase === 'winner' || phase === 'confirmed' ? 'sm' : 'md'}
              />
              {(phase === 'number' || phase === 'winner' || phase === 'confirmed') && drawn && (
                <p className="raffle-rise font-display text-sm font-semibold uppercase tracking-[0.3em] text-amber-200/80 @3xl:text-base">
                  Número de sorteo #{drawn.raffleNumber}
                </p>
              )}
            </div>
          )}

          {busy && (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="raffle-progress" key={`progress-${round}`}>
                <span style={phase === 'locking' ? { animation: 'none', width: '100%' } : undefined} />
              </div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sorteando
              </p>
            </div>
          )}

          {phase === 'number' && (
            <button type="button" className="raffle-cta raffle-rise mt-2" onClick={() => setPhase('winner')}>
              Revelar ganador
            </button>
          )}

          {(phase === 'winner' || phase === 'confirmed') && drawn && (
            <div className="raffle-winner-card flex flex-col items-center gap-4">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200 @3xl:text-sm">
                <Crown className="h-4 w-4" />
                Ganador del sorteo
              </span>
              <p
                className={clsx(
                  'raffle-name font-display font-extrabold leading-tight text-white [overflow-wrap:anywhere]',
                  // Los nombres largos bajan un escalón para no ocupar media pantalla.
                  drawn.customerName.length > 22
                    ? 'text-3xl @xl:text-5xl @3xl:text-5xl [@media(min-height:1000px)]:@3xl:text-6xl'
                    : 'text-4xl @xl:text-6xl @3xl:text-6xl [@media(min-height:1000px)]:@3xl:text-7xl',
                )}
              >
                {drawn.customerName}
              </p>
              <div className="raffle-phone flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Phone className="h-7 w-7 text-brand-300 @xl:h-9 @xl:w-9 @3xl:h-11 @3xl:w-11" />
                <span className="font-display text-3xl font-bold tabular-nums text-amber-300 @xl:text-5xl @3xl:text-5xl [@media(min-height:1000px)]:@3xl:text-6xl">
                  {formatPhone(drawn.customerPhone)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  aria-label="Copiar teléfono"
                  className="rounded-full border border-white/20 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-slate-400 @3xl:text-base">Pedido #{drawn.orderNumber}</p>
            </div>
          )}

          {phase === 'winner' && (
            <div className="raffle-rise mt-2 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                className="raffle-cta raffle-cta-confirm"
                onClick={handleConfirm}
                disabled={confirming}
              >
                <span className="inline-flex items-center gap-2">
                  {confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Confirmar ganador
                </span>
              </button>
              <button type="button" className="raffle-ghost" onClick={startDraw} disabled={confirming}>
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Volver a sortear
                </span>
              </button>
            </div>
          )}

          {phase === 'confirmed' && (
            <div className="raffle-rise mt-2 flex flex-col items-center gap-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-5 py-2 font-display text-lg font-semibold text-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
                Ganador confirmado
              </span>
              <button type="button" className="raffle-ghost" onClick={handleNewRaffle}>
                Nuevo sorteo
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="max-w-md rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}
          {summaryError && phase === 'idle' && (
            <p role="alert" className="max-w-md rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {getErrorMessage(summaryError as ApiError)}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
            <Trophy className="h-4 w-4 text-brand-500" />
            Ganadores confirmados
          </h2>
          <span className="text-sm text-slate-500">{summary?.winners.length ?? 0}</span>
        </div>
        {/* Móvil: tarjetas (una tabla de 6 columnas obliga a hacer scroll horizontal). */}
        <ul className="divide-y divide-slate-100 sm:hidden">
          {summaryLoading && <li className="px-4 py-8 text-center text-slate-400">Cargando…</li>}
          {!summaryLoading && (summary?.winners.length ?? 0) === 0 && (
            <li className="px-4 py-8 text-center text-slate-400">Todavía no hay ganadores confirmados.</li>
          )}
          {summary?.winners.map((winner) => (
            <li key={winner.id} className="flex flex-col gap-1.5 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 font-display font-semibold text-brand-700">
                  #{winner.raffleNumber}
                </span>
                <span className="text-xs text-slate-500">{formatDateTime(winner.confirmedAt)}</span>
              </div>
              <p className="font-display text-base font-semibold text-slate-900">{winner.customerName}</p>
              <p className="tabular-nums text-slate-700">{formatPhone(winner.customerPhone)}</p>
              <p className="text-xs text-slate-500">
                Pedido #{winner.orderNumber}
                {winner.confirmedByName ? ` · confirmado por ${winner.confirmedByName}` : ''}
              </p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm lg:text-base">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">N.º sorteo</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Cliente</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Teléfono</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Pedido</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Confirmado por</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!summaryLoading && (summary?.winners.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Todavía no hay ganadores confirmados.
                  </td>
                </tr>
              )}
              {summary?.winners.map((winner) => (
                <tr key={winner.id} className="text-slate-700">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 font-display font-semibold text-brand-700">
                      #{winner.raffleNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{winner.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatPhone(winner.customerPhone)}</td>
                  <td className="whitespace-nowrap px-4 py-3">#{winner.orderNumber}</td>
                  <td className={clsx('px-4 py-3', !winner.confirmedByName && 'text-slate-400')}>
                    {winner.confirmedByName ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(winner.confirmedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
