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

/** Catálogo de missões. Cada pessoa escolhe de 3 a 5 (e pode criar as suas). */
export const MISSION_CATALOG = [
  { id: 'proteina', label: 'Bati a proteína do dia', short: 'Proteína' },
  { id: 'agua', label: 'Bebi 2 litros de água', short: 'Água' },
  { id: 'sono', label: 'Dormi 7 horas ou mais', short: 'Sono' },
  { id: 'passos', label: 'Andei 8 mil passos', short: 'Passos' },
  { id: 'alongar', label: 'Alonguei 10 minutos', short: 'Alongar' },
  { id: 'doce', label: 'Fiquei sem doce', short: 'Sem doce' },
  { id: 'vegetais', label: 'Comi fruta ou verdura 3 vezes', short: 'Vegetais' },
  { id: 'leitura', label: 'Li 20 minutos', short: 'Leitura' },
  { id: 'meditar', label: 'Meditei 5 minutos', short: 'Meditar' },
  { id: 'tela', label: 'Larguei o celular 30 min antes de dormir', short: 'Sem tela' },
] as const;

/** As três de sempre: quem nunca mexeu nas missões continua com elas. */
export const DEFAULT_MISSIONS = ['proteina', 'agua', 'sono'];
export const MIN_MISSIONS = 3;
export const MAX_MISSIONS = 5;
/** Compatibilidade: as missões originais. */
export const HABITS = MISSION_CATALOG.filter((m) => DEFAULT_MISSIONS.includes(m.id));
export const HABIT_IDS = DEFAULT_MISSIONS;
export const HABIT_XP = 10;

/** Id de missão: do catálogo ou criada pela pessoa ("c-..."). */
export type HabitId = string;

export interface CustomMission {
  id: string;
  label: string;
}

export interface MissionConfig {
  active: string[];
  custom: CustomMission[];
}

/** Missões ativas com o texto de cada uma. */
export function activeMissions(cfg?: MissionConfig): { id: string; label: string }[] {
  const ids = cfg?.active?.length ? cfg.active : DEFAULT_MISSIONS;
  const custom = cfg?.custom ?? [];
  return ids
    .map((id) => MISSION_CATALOG.find((m) => m.id === id) ?? custom.find((m) => m.id === id))
    .filter((m): m is { id: string; label: string } => !!m)
    .map((m) => ({ id: m.id, label: m.label }));
}

/** Missões cumpridas por dia: chave "AAAA-MM-DD" → ids. */
export type HabitLog = Record<string, HabitId[]>;

function noonOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

/** XP das missões: 10 por missão diferente cumprida no dia, no máximo 5 por dia. */
export function habitEvents(log: HabitLog): XpEvent[] {
  const out: XpEvent[] = [];
  for (const [day, ids] of Object.entries(log)) {
    const n = Math.min(MAX_MISSIONS, new Set(ids).size);
    if (n) out.push({ at: noonOf(day), xp: n * HABIT_XP });
  }
  return out;
}

/**
 * Dias "completos" (valem moedas): 3 ou mais missões no dia. O limite é fixo para que
 * trocar as missões ativas não mude o passado.
 */
export function fullHabitDays(log: HabitLog): number {
  return Object.values(log).filter((ids) => new Set(ids).size >= MIN_MISSIONS).length;
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
