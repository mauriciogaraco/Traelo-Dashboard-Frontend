import { useEffect, useRef } from 'react';

const COLORS = ['#ff6c37', '#ffb02e', '#ffe08a', '#ffffff', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  wobble: number;
  wobbleSpeed: number;
  color: string;
  shape: 'rect' | 'circle' | 'streamer';
  life: number;
}

interface ConfettiProps {
  /** Cambia (p. ej. un contador) cada vez que se debe lanzar una lluvia nueva. */
  burstKey: number;
}

const DURATION_MS = 9000;

export function Confetti({ burstKey }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (burstKey === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)] as T;

    const spawn = (x: number, y: number, angle: number, spread: number, power: number) => {
      const a = angle + rand(-spread, spread);
      const speed = rand(power * 0.55, power);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: rand(7, 14),
        rotation: rand(0, Math.PI * 2),
        spin: rand(-0.35, 0.35),
        wobble: rand(0, Math.PI * 2),
        wobbleSpeed: rand(0.05, 0.16),
        color: pick(COLORS),
        shape: pick(['rect', 'rect', 'circle', 'streamer'] as const),
        life: 0,
      });
    };

    const amount = reduceMotion ? 40 : 130;
    // Dos cañones desde abajo hacia el centro, tres ráfagas.
    const cannon = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (let i = 0; i < amount; i++) {
        spawn(w * 0.04, h * 0.95, -Math.PI * 0.32, 0.35, 26);
        spawn(w * 0.96, h * 0.95, -Math.PI * 0.68, 0.35, 26);
      }
    };
    // Lluvia desde arriba.
    const rain = (n: number) => {
      const w = window.innerWidth;
      for (let i = 0; i < n; i++) spawn(rand(0, w), rand(-60, -10), Math.PI / 2, 0.25, 4);
    };

    const timers: number[] = [];
    cannon();
    timers.push(window.setTimeout(cannon, 450));
    timers.push(window.setTimeout(cannon, 1000));
    for (let k = 0; k < 8; k++) timers.push(window.setTimeout(() => rain(reduceMotion ? 6 : 22), 800 + k * 450));

    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i] as Particle;
        p.life++;
        p.vy += 0.42; // gravedad
        p.vx *= 0.985; // resistencia del aire
        p.vy *= 0.985;
        p.x += p.vx + Math.sin(p.wobble) * 0.6;
        p.y += p.vy;
        p.rotation += p.spin;
        p.wobble += p.wobbleSpeed;
        if (p.y > window.innerHeight + 40) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        // Simula que el papel gira en 3D aplastándolo en un eje.
        const flip = Math.cos(p.wobble * 1.3);
        ctx.scale(1, Math.max(0.15, Math.abs(flip)));
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'streamer') {
          ctx.fillRect(-p.size * 0.15, -p.size * 1.1, p.size * 0.3, p.size * 2.2);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size / 1.6);
        }
        ctx.restore();
      }
      const elapsed = now - start;
      if (elapsed < DURATION_MS || particles.length > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [burstKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
    />
  );
}
