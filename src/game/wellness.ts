/**
 * Sono, disposição e ciclo menstrual: só ajustam a EXPECTATIVA (sugestão de carga e
 * avisos). Nada disso mexe em XP, moedas ou sequência.
 */
import { dayKey } from './rules';
import type { Workout } from './types';

export type Level = 1 | 2 | 3; // 1 = mal, 2 = mais ou menos, 3 = bem
export interface DayCheck {
  sleep?: Level;
  energy?: Level;
}
export type WellnessLog = Record<string, DayCheck>;

export const LEVELS: { v: Level; sleep: string; energy: string }[] = [
  { v: 3, sleep: 'Bem', energy: 'Com energia' },
  { v: 2, sleep: 'Mais ou menos', energy: 'Normal' },
  { v: 1, sleep: 'Mal', energy: 'Cansada(o)' },
];

const DAY = 86400000;
const t = (day: string) => Date.parse(`${day}T12:00:00`);
const addDays = (day: string, n: number) => dayKey(new Date(t(day) + n * DAY));
const score = (c: DayCheck | undefined) => {
  const vs = [c?.sleep, c?.energy].filter((v): v is Level => !!v);
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
};

export interface Advice {
  level: 'leve' | 'pesada';
  title: string;
  text: string;
}

/**
 * - Hoje ruim (sono e disposição em "mal"): treino leve, sem subir carga.
 * - 3 dos últimos 5 dias ruins (média ≤ 1,5): semana pesada, vale antecipar o deload.
 */
export function recoveryAdvice(log: WellnessLog, today: string): Advice | null {
  const last5 = [0, 1, 2, 3, 4].map((k) => score(log[addDays(today, -k)])).filter((s): s is number => s !== null);
  const bad = last5.filter((s) => s <= 1.5).length;
  if (last5.length >= 3 && bad >= 3)
    return {
      level: 'pesada',
      title: 'Semana pesada de recuperação',
      text: `${bad} dos últimos ${last5.length} dias com sono ou disposição baixos. Treine, mas sem buscar carga nova; se continuar assim, vale antecipar o deload.`,
    };
  const s = score(log[today]);
  if (s !== null && s <= 1.5)
    return { level: 'leve', title: 'Hoje é dia de treino leve', text: 'Dormiu mal ou está sem energia: mantenha as cargas de antes e pare 1–2 reps antes do normal (RIR +1).' };
  return null;
}

/** Texto para o resumo de domingo: noites boas e o XP médio por treino depois delas. */
export function weekSleepNote(log: WellnessLog, workouts: Workout[], xpOf: (id: string) => number, monday: string): string | null {
  const days = [0, 1, 2, 3, 4, 5, 6].map((k) => addDays(monday, k));
  const rated = days.filter((d) => log[d]?.sleep);
  if (rated.length < 3) return null;
  const good = rated.filter((d) => log[d].sleep === 3);
  const byDay = (ds: string[]) => {
    const ws = workouts.filter((w) => w.finishedAt && ds.includes(dayKey(new Date(w.finishedAt))));
    return ws.length ? ws.reduce((s, w) => s + xpOf(w.id), 0) / ws.length : null;
  };
  const xpGood = byDay(good);
  const xpOther = byDay(rated.filter((d) => log[d].sleep !== 3));
  let note = `Dormiu bem ${good.length} de ${rated.length} noites.`;
  if (xpGood !== null && xpOther !== null && xpOther > 0) {
    const diff = Math.round((xpGood / xpOther - 1) * 100);
    if (Math.abs(diff) >= 5) note += ` Treinos depois de noite boa: ${diff > 0 ? '+' : ''}${diff}% de XP.`;
  }
  return note;
}

// ---------- Ciclo menstrual (opcional, só neste celular) ----------

export interface CycleConfig {
  on: boolean;
  /** Primeiros dias de cada menstruação (AAAA-MM-DD). */
  starts: string[];
}

export type Phase = 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea' | 'pre' | 'atrasado';

export const PHASE_INFO: Record<Phase, { label: string; text: string; easy: boolean }> = {
  menstrual: { label: 'Menstruação', text: 'Normal a carga não subir agora. Treinar ajuda com cólica e humor; vá pelo corpo.', easy: true },
  folicular: { label: 'Fase folicular', text: 'Costuma ser a melhor fase para subir carga e buscar recorde.', easy: false },
  ovulatoria: { label: 'Ovulação', text: 'Energia costuma estar alta. Capriche no aquecimento.', easy: false },
  lutea: { label: 'Fase lútea', text: 'Rendimento costuma ficar estável; mais fome e calor é normal.', easy: false },
  pre: { label: 'Pré-menstrual', text: 'Inchaço e cansaço são comuns: manter a carga já é ótimo.', easy: true },
  atrasado: { label: 'Ciclo além do esperado', text: 'Registre quando a próxima menstruação começar.', easy: false },
};

/** Duração média dos últimos ciclos (21 a 40 dias); 28 sem histórico. */
export function cycleLength(starts: string[]): number {
  const s = [...starts].sort();
  const gaps = s.slice(1).map((d, k) => Math.round((t(d) - t(s[k])) / DAY)).filter((g) => g >= 21 && g <= 40).slice(-6);
  return gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
}

export function cycleInfo(cfg: CycleConfig | undefined, today: string) {
  if (!cfg?.on || !cfg.starts.length) return null;
  const last = [...cfg.starts].filter((d) => d <= today).sort().at(-1);
  if (!last) return null;
  const len = cycleLength(cfg.starts);
  const day = Math.round((t(today) - t(last)) / DAY) + 1;
  const phase: Phase =
    day <= 5 ? 'menstrual' : day > len + 7 ? 'atrasado' : day > len - 3 ? 'pre' : day >= len - 15 && day <= len - 13 ? 'ovulatoria' : day < len - 15 ? 'folicular' : 'lutea';
  return { day, length: len, phase, ...PHASE_INFO[phase], nextIn: Math.max(0, len - day + 1) };
}

// ---------- Ajuste da sugestão de carga ----------

/** Carga mais alta da última vez que fez o exercício. */
export function lastTop(workouts: Workout[], exerciseId: string): number | null {
  const done = workouts.filter((w) => w.finishedAt).sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!));
  for (const w of done) {
    const ws = w.sets.filter((s) => s.exerciseId === exerciseId && !s.warmup && s.weight > 0).map((s) => s.weight);
    if (ws.length) return Math.max(...ws);
  }
  return null;
}

/** Em dia de recuperação ruim ou fase que pede calma: não sobe a carga. */
export function easeOff<T extends { weight: number | null; reps: number; note: string }>(target: T | null, top: number | null, reason: string | null): T | null {
  if (!target || !reason || target.weight === null || top === null || target.weight <= top) return target;
  return { ...target, weight: top, note: `${reason} Mantenha ${String(top).replace('.', ',')}.` };
}
