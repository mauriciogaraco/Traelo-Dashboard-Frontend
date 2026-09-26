import { useEffect, useRef, type CSSProperties } from 'react';
import clsx from 'clsx';

// El 0 final repite el inicio: permite girar de forma continua sin ningún salto visible.
const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

// Alto de cada celda de dígito, en em. DEBE coincidir con .reel-cell y .reel-window (raffle.css):
// si no, el rodillo se desalinea y el dígito queda cortado.
const CELL_EM = 1.06;

// Un rodillo se detiene 0.9 s después del anterior (izquierda → derecha) y frena en 2.6 s.
const LOCK_STAGGER_MS = 900;
const LOCK_DURATION_MS = 2600;
const MAX_BLUR_PX = 2.4;

interface SlotReelsProps {
  /** Cantidad de rodillos (dígitos). */
  count: number;
  /**
   * null = giran sin parar. Con un número, se detienen uno a uno hasta mostrarlo. El número ya se
   * conoce (lo devolvió el backend): lo único que se hace esperar es el suspenso.
   */
  target: number | null;
  /** Se llama una vez, cuando el último rodillo se detuvo. */
  onSettled: () => void;
  /** Ya terminó: se atenúan los ceros de la izquierda para que resalte el número. */
  revealed?: boolean;
  size?: 'md' | 'xl';
}

function padDigits(value: number, count: number): string {
  return String(value).padStart(count, '0').slice(-count);
}

export function SlotReels({ count, target, onSettled, revealed = false, size = 'md' }: SlotReelsProps) {
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const targetRef = useRef<number | null>(target);
  const settledRef = useRef(onSettled);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  useEffect(() => {
    settledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    // Posición continua de cada rodillo, en "dígitos": 3.5 = entre el 3 y el 4.
    const pos = Array.from({ length: count }, () => Math.random() * 10);
    // Cada rodillo gira a distinta velocidad (dígitos por segundo): se ve menos mecánico.
    const speed = Array.from({ length: count }, (_, i) => 15 + i * 1.7);
    type Lock = { from: number; to: number; t0: number };
    const locks: (Lock | null)[] = Array.from({ length: count }, () => null);
    const done: boolean[] = Array.from({ length: count }, () => false);
    let lockStart: number | null = null;
    let notified = false;
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const currentTarget = targetRef.current;
      if (currentTarget !== null && lockStart === null) lockStart = now;
      const finalDigits = currentTarget !== null ? padDigits(currentTarget, count) : null;

      for (let i = 0; i < count; i++) {
        const strip = stripRefs.current[i];
        if (!strip) continue;
        let blur = MAX_BLUR_PX;
        const lock = locks[i];

        if (done[i]) {
          blur = 0;
        } else if (lock) {
          const t = Math.min(1, (now - lock.t0) / LOCK_DURATION_MS);
          const eased = 1 - Math.pow(1 - t, 3); // frena suave, como un rodillo real
          pos[i] = lock.from + (lock.to - lock.from) * eased;
          blur = (1 - t) * MAX_BLUR_PX;
          if (t >= 1) {
            pos[i] = lock.to;
            done[i] = true;
          }
        } else {
          pos[i] = (pos[i] ?? 0) + (speed[i] ?? 15) * dt;
          if (lockStart !== null && finalDigits && now >= lockStart + i * LOCK_STAGGER_MS) {
            const from = pos[i] ?? 0;
            const finalDigit = Number(finalDigits[i]);
            // Da una vuelta completa más lo que falte para caer exactamente en el dígito final.
            const extra = (finalDigit - (from % 10) + 10) % 10;
            locks[i] = { from, to: from + 10 + extra, t0: now };
          }
        }

        strip.style.transform = `translateY(${-((pos[i] ?? 0) % 10) * CELL_EM}em)`;
        strip.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
      }

      if (!notified && done.every(Boolean)) {
        notified = true;
        settledRef.current();
      }
      if (!notified) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  const finalDigits = target !== null ? padDigits(target, count) : null;
  const leadingZeros = finalDigits ? (finalDigits.match(/^0*/)?.[0].length ?? 0) : 0;

  return (
    <div
      className={clsx('reels', size === 'xl' ? 'reels-xl' : 'reels-md')}
      style={{ '--reel-count': count } as CSSProperties}
      role="img"
      aria-label={target !== null && revealed ? `Número ${target}` : 'Número girando'}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'reel-window',
            revealed && i < leadingZeros && 'reel-window-dim',
            revealed && 'reel-window-revealed',
          )}
        >
          <div
            ref={(el) => {
              stripRefs.current[i] = el;
            }}
            className="reel-strip"
            aria-hidden="true"
          >
            {CELLS.map((digit, cell) => (
              <div key={cell} className="reel-cell">
                {digit}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
