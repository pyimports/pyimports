// "Ding" de duas notas gerado via Web Audio API — sem depender de nenhum
// arquivo de áudio. Navegadores bloqueiam som sem interação prévia do
// usuário na página; como isso só dispara depois que o admin já está
// navegando no painel, normalmente passa sem bloqueio.
let audioCtx: AudioContext | null = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  } catch {
    // Web Audio indisponível — ignora silenciosamente
  }
}
