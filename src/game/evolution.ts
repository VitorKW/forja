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

// ---------- Medidas ----------

export const MEASURES = [
  { id: 'cintura', label: 'Cintura' },
  { id: 'quadril', label: 'Quadril' },
  { id: 'braco', label: 'Braço' },
  { id: 'coxa', label: 'Coxa' },
  { id: 'peito', label: 'Peito' },
] as const;
export type MeasureId = (typeof MEASURES)[number]['id'];

/** Medidas de um dia, em cm. */
export interface Measure {
  day: string;
  cm: Partial<Record<MeasureId, number>>;
}

/** Junta as medidas de um dia às que já existiam (só troca as preenchidas). */
export function addMeasures(list: Measure[], day: string, cm: Partial<Record<MeasureId, number>>): Measure[] {
  const clean = Object.fromEntries(Object.entries(cm).filter(([, v]) => typeof v === 'number' && v >= 10 && v <= 250)) as Measure['cm'];
  if (!Object.keys(clean).length) return list;
  const old = list.find((m) => m.day === day);
  return [...list.filter((m) => m.day !== day), { day, cm: { ...old?.cm, ...clean } }].sort((a, b) => a.day.localeCompare(b.day));
}

/** Série de uma medida e a mudança desde o primeiro registro. */
export function measureSeries(list: Measure[], id: MeasureId) {
  const pts = list.filter((m) => m.cm[id] !== undefined).map((m) => ({ day: m.day, value: m.cm[id]! }));
  const change = pts.length >= 2 ? Math.round((pts[pts.length - 1].value - pts[0].value) * 10) / 10 : null;
  return { pts, change, since: pts[0]?.day ?? null };
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
