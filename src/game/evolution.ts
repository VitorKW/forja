import { estimate1RM } from './rules';
import type { BodyWeight, Workout } from './types';

const DAY = 86400000;
const t = (day: string) => Date.parse(`${day}T12:00:00`);

/**
 * Peso corporal com média móvel de 7 dias (cada ponto = média das pesagens dos 7 dias
 * até ele) e a variação dessa média em 4 semanas. A balança oscila 1–2 kg por dia
 * (água, sal, intestino); a média mostra a tendência de verdade.
 */
export function weightTrend(list: BodyWeight[]) {
  const ws = [...list].sort((a, b) => a.day.localeCompare(b.day));
  const avg = ws.map((w) => {
    const end = t(w.day);
    const win = ws.filter((x) => t(x.day) <= end && t(x.day) > end - 7 * DAY);
    return Math.round((win.reduce((s, x) => s + x.kg, 0) / win.length) * 10) / 10;
  });
  const last = ws.length - 1;
  if (last < 0) return { avg, now: null, delta: null, days: 0 };
  // Compara com a média de ~4 semanas atrás (o último ponto até 28 dias antes).
  let ref = -1;
  ws.forEach((w, k) => {
    if (t(w.day) <= t(ws[last].day) - 28 * DAY) ref = k;
  });
  const delta = ref >= 0 ? Math.round((avg[last] - avg[ref]) * 10) / 10 : null;
  return { avg, now: avg[last], delta, days: ref >= 0 ? Math.round((t(ws[last].day) - t(ws[ref].day)) / DAY) : 0 };
}

export interface BestSet {
  weight: number;
  reps: number;
  day: string; // AAAA-MM-DD
  oneRM: number;
}

/** A melhor série de um exercício (maior 1RM estimado) e a carga mais pesada já usada. */
export function bestSetOf(workouts: Workout[], exerciseId: string): { best: BestSet; heaviest: number } | null {
  let best: BestSet | null = null;
  let heaviest = 0;
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    for (const s of w.sets) {
      if (s.exerciseId !== exerciseId || s.warmup || s.reps <= 0) continue;
      heaviest = Math.max(heaviest, s.weight);
      const e = estimate1RM(s.weight, s.reps) ?? 0;
      if (e > 0 && (!best || e > best.oneRM)) best = { weight: s.weight, reps: s.reps, day: w.finishedAt.slice(0, 10), oneRM: Math.round(e * 10) / 10 };
    }
  }
  return best ? { best, heaviest } : null;
}
