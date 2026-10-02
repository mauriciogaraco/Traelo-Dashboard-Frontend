/**
 * Sonido de la alarma de fusión de pedidos: tres pitidos con la Web Audio API (sin archivos). Los
 * navegadores solo dejan sonar audio después de que la persona interactuó con la página; si aún no,
 * falla en silencio y el aviso visual (banner y modal) sigue ahí.
 */
let audioContext: AudioContext | null = null;

export function playMergeAlarm(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioContext ??= new Ctx();
    const ctx = audioContext;
    if (ctx.state === 'suspended') void ctx.resume();
    [0, 0.32, 0.64].forEach((offset) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.24);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(ctx.currentTime + offset);
      oscillator.stop(ctx.currentTime + offset + 0.26);
    });
  } catch {
    // sin audio: queda el aviso visual
  }
}
