/**
 * Planilhas (CSV) para abrir no Excel ou no Google Planilhas.
 * Padrão brasileiro: separador ";" e vírgula decimal, para o Excel em português abrir certo.
 */
import { EXERCISE_BY_ID } from './exercises';
import type { DietLog } from './diet';
import type { Workout } from './types';

interface Person {
  name: string;
  workouts: Workout[];
  dietLog?: DietLog;
}

const cell = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : v;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (xs: (string | number | null | undefined)[]) => xs.map(cell).join(';');
const local = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return { date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
};

/** Uma linha por série. */
export function workoutsCsv(people: Person[]): string {
  const lines = [row(['Pessoa', 'Data', 'Início', 'Duração (min)', 'Exercício', 'Tipo', 'Carga (kg)', 'Reps / minutos', 'RIR', 'Aquecimento', 'Distância (km)', 'Deload'])];
  for (const p of people) {
    for (const w of [...p.workouts].filter((x) => x.finishedAt).sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
      const { date, time } = local(w.startedAt);
      const mins = Math.round((new Date(w.finishedAt!).getTime() - new Date(w.startedAt).getTime()) / 60000);
      for (const s of w.sets) {
        const ex = EXERCISE_BY_ID[s.exerciseId];
        const cardio = ex?.kind === 'cardio';
        lines.push(
          row([p.name, date, time, mins, ex?.name ?? s.exerciseId, cardio ? 'cardio' : 'força', cardio ? null : s.weight, s.reps, s.rir, s.warmup ? 'sim' : 'não', s.distance ?? null, w.deload ? 'sim' : 'não']),
        );
      }
    }
  }
  return lines.join('\r\n');
}

/** Uma linha por alimento ou copo de água. */
export function dietCsv(people: Person[]): string {
  const lines = [row(['Pessoa', 'Data', 'Hora', 'Alimento', 'Proteína (g)', 'Calorias (kcal)', 'Carboidrato (g)', 'Gordura (g)', 'Água (ml)'])];
  for (const p of people) {
    for (const day of Object.keys(p.dietLog ?? {}).sort()) {
      const [y, m, d] = day.split('-');
      for (const e of p.dietLog![day]) {
        lines.push(row([p.name, `${d}/${m}/${y}`, local(e.at).time, e.label, e.proteina, e.kcal, e.carbs ?? null, e.fat ?? null, e.agua]));
      }
    }
  }
  return lines.join('\r\n');
}
