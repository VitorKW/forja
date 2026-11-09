/**
 * Coisas que dão XP fora do treino: missões diárias e incentivos recebidos do par.
 * Viram eventos de XP com data, e o computeProgress os encaixa na linha do tempo.
 */

export interface XpEvent {
  /** Momento do evento (ms desde 1970). */
  at: number;
  xp: number;
}

// ---------- Missões diárias ----------

export const HABITS = [
  { id: 'proteina', label: 'Bati a proteína do dia', short: 'Proteína' },
  { id: 'agua', label: 'Bebi 2 litros de água', short: 'Água' },
  { id: 'sono', label: 'Dormi 7 horas ou mais', short: 'Sono' },
] as const;

export type HabitId = (typeof HABITS)[number]['id'];
export const HABIT_IDS = HABITS.map((h) => h.id) as HabitId[];
export const HABIT_XP = 10;

/** Missões cumpridas por dia: chave "AAAA-MM-DD" → ids. */
export type HabitLog = Record<string, HabitId[]>;

function noonOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

export function habitEvents(log: HabitLog): XpEvent[] {
  const out: XpEvent[] = [];
  for (const [day, ids] of Object.entries(log)) {
    const valid = new Set(ids.filter((id) => HABIT_IDS.includes(id)));
    if (valid.size) out.push({ at: noonOf(day), xp: valid.size * HABIT_XP });
  }
  return out;
}

/** Dias em que as três missões foram cumpridas. */
export function fullHabitDays(log: HabitLog): number {
  return Object.values(log).filter((ids) => HABIT_IDS.every((h) => ids.includes(h))).length;
}

// ---------- Incentivos ----------

export const CHEERS = [
  { id: 'fogo', label: 'Mandou bem', icon: '🔥' },
  { id: 'forca', label: 'Bora!', icon: '💪' },
  { id: 'orgulho', label: 'Orgulho', icon: '❤️' },
] as const;
export type CheerKind = (typeof CHEERS)[number]['id'];
export const CHEER_XP = 15;

/** Incentivo recebido num treino. Fica guardado no perfil de quem recebe. */
export interface Cheer {
  id: string;
  workoutId: string;
  kind: CheerKind;
  /** Nome de quem mandou (só para mostrar). */
  from: string;
  at: string; // ISO
}

/** Só o primeiro incentivo de cada treino dá XP (para não virar fazenda de XP). */
export function cheerEvents(cheers: Cheer[]): XpEvent[] {
  const first = new Map<string, Cheer>();
  for (const c of cheers) {
    const prev = first.get(c.workoutId);
    if (!prev || c.at < prev.at) first.set(c.workoutId, c);
  }
  return [...first.values()].map((c) => ({ at: new Date(c.at).getTime(), xp: CHEER_XP }));
}
