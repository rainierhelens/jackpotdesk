import type { GameId } from "../types";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  const C = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  if (!ctx) ctx = new C();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function env(
  ctx: AudioContext,
  start: number,
  attack: number,
  decay: number,
  peak: number,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  return g;
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  const g = env(ctx, start, 0.012, dur, peak);
  osc.connect(g);
  g.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  start: number,
  dur: number,
  peak: number,
  freq: number,
  q: number,
) {
  const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = n.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = n;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, start);
  filter.Q.value = q;
  const g = env(ctx, start, 0.018, dur * 0.92, peak);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(start);
}

export function playPackOpen(game: GameId): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  const master = ac.createGain();
  master.gain.value = 0.22;
  master.connect(ac.destination);

  noiseBurst(ac, master, t, 0.28, 0.9, 420, 0.7);
  noiseBurst(ac, master, t + 0.12, 0.18, 0.55, 1800, 1.4);
  tone(ac, master, 70, t + 0.22, 0.28, "sine", 0.85);
  tone(ac, master, 140, t + 0.22, 0.18, "triangle", 0.35);

  const chord = game === "powerball" ? [523.25, 659.25, 783.99] : [392, 493.88, 587.33];
  chord.forEach((f, i) => {
    tone(ac, master, f, t + 0.42 + i * 0.045, 0.55, "triangle", 0.28);
    tone(ac, master, f * 2, t + 0.42 + i * 0.045, 0.32, "sine", 0.08);
  });

  noiseBurst(ac, master, t + 0.7, 0.12, 0.25, 3200, 2.2);
  tone(ac, master, game === "powerball" ? 1046 : 880, t + 0.78, 0.35, "sine", 0.18);
}
