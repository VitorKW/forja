/**
 * Retrospectiva do mês: números e destaques calculados do histórico.
 */
import { EXERCISE_BY_ID } from './exercises';
import type { Cheer, HabitLog, XpEvent } from './extras';
import { HABIT_IDS } from './extras';
import { dayKey, estimate1RM } from './rules';
import type { Workout } from './types';
import type { JointPair } from './duo';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "AAAA-MM" de uma data. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

export function monthName(key: string): string {
  return MONTHS[Number(key.split('-')[1]) - 1];
}

function range(key: string) {
  const [y, m] = key.split('-').map(Number);
  return { start: new Date(y, m - 1, 1).getTime(), end: new Date(y, m, 1).getTime() };
}

export interface Recap {
  month: string;
  workouts: number;
  days: number;
  strengthSets: number;
  /** Carga total levantada (kg × repetições, sem aquecimento). */
  volume: number;
  cardioMin: number;
  km: number;
  xp: number;
  /** Recordes batidos no mês: exercício e o novo 1RM estimado. */
  records: { exerciseId: string; best: number }[];
  topExercise: { exerciseId: string; sets: number } | null;
  favoriteWeekday: string | null;
  missions: number;
  fullMissionDays: number;
  joint: number;
  cheers: number;
}

export interface RecapInput {
  workouts: Workout[];
  /** Todos os eventos de XP do perfil (treinos + extras). */
  xpEvents: XpEvent[];
  habits: HabitLog;
  cheers: Cheer[];
  joint: JointPair[];
}

export function computeRecap(month: string, input: RecapInput): Recap {
  const { start, end } = range(month);
  const inMonth = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start && t < end;
  };
  const done = input.workouts.filter((w) => w.finishedAt).sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!));
  const monthWs = done.filter((w) => inMonth(w.finishedAt!));

  let strengthSets = 0;
  let volume = 0;
  let cardioMin = 0;
  let km = 0;
  const setsByEx = new Map<string, number>();
  const weekdayCount = new Array(7).fill(0);
  for (const w of monthWs) {
    weekdayCount[new Date(w.finishedAt!).getDay()]++;
    for (const s of w.sets) {
      const ex = EXERCISE_BY_ID[s.exerciseId];
      if (!ex) continue;
      setsByEx.set(s.exerciseId, (setsByEx.get(s.exerciseId) ?? 0) + 1);
      if (ex.kind === 'cardio') {
        cardioMin += Math.max(0, s.reps);
        km += Math.max(0, s.distance ?? 0);
      } else if (!s.warmup) {
        strengthSets++;
        volume += Math.max(0, s.weight) * Math.max(0, s.reps);
      }
    }
  }

  // Recordes: melhor 1RM do mês acima do melhor de antes do mês.
  const before = new Map<string, number>();
  const during = new Map<string, number>();
  for (const w of done) {
    const t = new Date(w.finishedAt!).getTime();
    if (t >= end) break;
    const target = t < start ? before : during;
    for (const s of w.sets) {
      if (s.warmup || EXERCISE_BY_ID[s.exerciseId]?.kind !== 'forca') continue;
      const e = estimate1RM(s.weight, s.reps);
      if (e && e > (target.get(s.exerciseId) ?? 0)) target.set(s.exerciseId, e);
    }
  }
  const records = [...during.entries()]
    .filter(([id, best]) => (before.get(id) ?? 0) > 0 && best > before.get(id)!)
    .map(([exerciseId, best]) => ({ exerciseId, best: Math.round(best * 10) / 10 }))
    .sort((a, b) => b.best - a.best);

  const top = [...setsByEx.entries()].sort((a, b) => b[1] - a[1])[0];
  const maxDay = Math.max(...weekdayCount);
  const prefix = `${month}-`;
  const habitDays = Object.entries(input.habits).filter(([day]) => day.startsWith(prefix));

  return {
    month,
    workouts: monthWs.length,
    days: new Set(monthWs.map((w) => dayKey(new Date(w.finishedAt!)))).size,
    strengthSets,
    volume: Math.round(volume),
    cardioMin: Math.round(cardioMin),
    km: Math.round(km * 10) / 10,
    xp: input.xpEvents.reduce((s, e) => (e.at >= start && e.at < end ? s + e.xp : s), 0),
    records,
    topExercise: top ? { exerciseId: top[0], sets: top[1] } : null,
    favoriteWeekday: maxDay > 0 ? WEEKDAYS[weekdayCount.indexOf(maxDay)] : null,
    missions: habitDays.reduce((s, [, ids]) => s + ids.filter((id) => HABIT_IDS.includes(id)).length, 0),
    fullMissionDays: habitDays.filter(([, ids]) => HABIT_IDS.every((h) => ids.includes(h))).length,
    joint: input.joint.filter((p) => p.at >= start && p.at < end).length,
    cheers: input.cheers.filter((c) => inMonth(c.at)).length,
  };
}
