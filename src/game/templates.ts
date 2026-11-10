import { EXERCISE_BY_ID } from './exercises';
import { dayKey } from './rules';
import type { SetEntry, Template, TemplateTarget, Workout } from './types';

/** Dias com treino concluído, do mais recente para o mais antigo. */
export function trainingDays(workouts: Workout[], limit = 21): { day: string; label: string; exercises: number }[] {
  const byDay = new Map<string, Set<string>>();
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    const d = dayKey(new Date(w.finishedAt));
    const set = byDay.get(d) ?? new Set<string>();
    for (const s of w.sets) if (EXERCISE_BY_ID[s.exerciseId]) set.add(s.exerciseId);
    byDay.set(d, set);
  }
  return [...byDay.entries()]
    .filter(([, ex]) => ex.size > 0)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, limit)
    .map(([day, ex]) => {
      const [y, m, d] = day.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const wd = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      return { day, label: `${wd} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`, exercises: ex.size };
    });
}

/**
 * Junta tudo o que foi feito num dia (um ou vários treinos) numa ficha completa:
 * exercícios na ordem em que apareceram, com séries de trabalho, reps e a carga mais alta.
 */
export function templateFromDay(workouts: Workout[], day: string): Omit<Template, 'id' | 'name'> | null {
  return templateFromSets(
    workouts
      .filter((w) => w.finishedAt && dayKey(new Date(w.finishedAt)) === day)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .flatMap((w) => w.sets),
  );
}

/** Mesma coisa a partir de uma lista de séries (ex.: o treino em andamento). */
export function templateFromSets(all: SetEntry[]): Omit<Template, 'id' | 'name'> | null {
  const sets = all.filter((s) => EXERCISE_BY_ID[s.exerciseId] && !s.warmup);
  if (!sets.length) return null;
  const order: string[] = [];
  const targets: Record<string, TemplateTarget> = {};
  for (const s of sets) {
    const t = targets[s.exerciseId];
    if (!t) {
      order.push(s.exerciseId);
      targets[s.exerciseId] = { sets: 1, reps: s.reps, weight: s.weight };
    } else {
      t.sets++;
      // Fica com a série mais pesada (no empate, a de mais reps).
      if (s.weight > t.weight || (s.weight === t.weight && s.reps > t.reps)) {
        t.weight = s.weight;
        t.reps = s.reps;
      }
    }
  }
  // Cardio: uma "série" com o total de minutos do dia.
  for (const id of order) {
    if (EXERCISE_BY_ID[id].kind !== 'cardio') continue;
    const total = sets.filter((s) => s.exerciseId === id).reduce((n, s) => n + s.reps, 0);
    targets[id] = { sets: 1, reps: total, weight: 0 };
  }
  return { exercises: order, targets };
}

/** "3×10 · 40 kg", "2×45 s", "30 min". */
export function targetText(exerciseId: string, t: TemplateTarget, unit: string): string {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return '';
  if (ex.kind === 'cardio') return `${t.reps} min`;
  const reps = ex.timed ? `${t.reps * 10} s` : String(t.reps);
  const load = t.weight > 0 ? ` · ${String(t.weight).replace('.', ',')} ${unit}` : '';
  return `${t.sets}×${reps}${load}`;
}
