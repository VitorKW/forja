/**
 * Programa periodizado (mesociclo de 6 ou 8 semanas).
 *
 * - Divisão pela frequência: 2–3x full body, 4x superior/inferior, 5x PPL + sup/inf, 6x PPL 2x.
 * - Cada exercício tem papel: principal (multiarticular) ou acessório.
 * - Intensidade sobe ao longo do bloco pelo RIR alvo (3 → 1, nunca falha); o volume ganha
 *   uma série na segunda metade (acumulação). A última semana é deload: ~metade das séries,
 *   RIR 4 e carga 10% menor.
 * - Força: faixa de reps dos principais cai por fase (5–6 → 4–5 → 2–4).
 * - Carga do dia: dupla progressão sobre a última sessão do exercício.
 *
 * Tudo deriva da configuração salva no perfil; nada do plano em si é guardado.
 * Não é prescrição médica: dor ou lesão pedem avaliação profissional.
 */
import { EXERCISE_BY_ID } from './exercises';
import { weekKey } from './rules';
import type { Workout } from './types';

export const GOALS = [
  { id: 'hipertrofia', label: 'Hipertrofia', hint: 'Ganhar músculo: 6 a 15 reps, perto da falha' },
  { id: 'forca', label: 'Força', hint: 'Levantar mais: poucas reps, carga alta, descanso longo' },
  { id: 'condicionamento', label: 'Condicionamento', hint: 'Fôlego e resistência: mais reps, menos descanso, cardio no fim' },
] as const;
export type Goal = (typeof GOALS)[number]['id'];

export interface ProgramConfig {
  id: string;
  goal: Goal;
  /** Treinos por semana (2 a 6). */
  days: number;
  /** Duração do bloco, contando a semana de deload. */
  weeks: 6 | 8;
  /** Segunda-feira da semana 1 (AAAA-MM-DD). */
  startWeek: string;
}

export interface Slot {
  exerciseId: string;
  role: 'principal' | 'acessorio' | 'cardio';
  sets: number;
  /** Faixa de reps (cardio: minutos). */
  reps: [number, number];
  rir: number | null;
  /** Descanso sugerido em segundos. */
  rest: number;
}

export interface Session {
  name: string;
  slots: Slot[];
}

export interface ProgramWeek {
  index: number; // 1..weeks
  phase: 'Adaptação' | 'Acumulação' | 'Intensificação' | 'Deload';
  deload: boolean;
  sessions: Session[];
}

type Base = { name: string; main: string[]; acc: string[] };

const FULL_A: Base = { name: 'Full body A', main: ['agachamento', 'supino', 'remada-curvada'], acc: ['elevacao-lateral', 'prancha'] };
const FULL_B: Base = { name: 'Full body B', main: ['stiff', 'desenvolvimento', 'puxada'], acc: ['afundo', 'triceps-polia', 'rosca'] };
const FULL_C: Base = { name: 'Full body C', main: ['leg-press', 'supino-inclinado', 'remada-baixa'], acc: ['mesa-flexora', 'face-pull', 'elevacao-pernas'] };
const UPPER_A: Base = { name: 'Superiores A', main: ['supino', 'remada-curvada', 'desenvolvimento'], acc: ['puxada', 'triceps-polia', 'rosca'] };
const LOWER_A: Base = { name: 'Inferiores A', main: ['agachamento', 'stiff'], acc: ['leg-press', 'mesa-flexora', 'panturrilha', 'prancha'] };
const UPPER_B: Base = { name: 'Superiores B', main: ['barra-fixa', 'supino-inclinado'], acc: ['remada-unilateral', 'supino-halter', 'elevacao-lateral', 'face-pull'] };
const LOWER_B: Base = { name: 'Inferiores B', main: ['terra', 'hip-thrust'], acc: ['afundo', 'cadeira-extensora', 'panturrilha', 'abdominal-polia'] };
const PUSH: Base = { name: 'Empurrar', main: ['supino', 'desenvolvimento'], acc: ['supino-inclinado', 'elevacao-lateral', 'triceps-polia', 'paralelas'] };
const PULL: Base = { name: 'Puxar', main: ['barra-fixa', 'remada-curvada'], acc: ['puxada', 'face-pull', 'rosca', 'rosca-martelo'] };
const LEGS: Base = { name: 'Pernas', main: ['agachamento', 'stiff'], acc: ['leg-press', 'mesa-flexora', 'panturrilha', 'abdominal-polia'] };

export function splitFor(days: number): Base[] {
  switch (Math.max(2, Math.min(6, Math.round(days)))) {
    case 2:
      return [FULL_A, FULL_B];
    case 3:
      return [FULL_A, FULL_B, FULL_C];
    case 4:
      return [UPPER_A, LOWER_A, UPPER_B, LOWER_B];
    case 5:
      return [PUSH, PULL, LEGS, UPPER_B, LOWER_B];
    default:
      return [PUSH, PULL, LEGS, { ...PUSH, name: 'Empurrar 2' }, { ...PULL, name: 'Puxar 2' }, { ...LEGS, name: 'Pernas 2' }];
  }
}

export const SPLIT_LABEL: Record<number, string> = {
  2: 'Full body 2x',
  3: 'Full body 3x',
  4: 'Superiores / inferiores',
  5: 'Empurrar, puxar, pernas + sup/inf',
  6: 'Empurrar, puxar, pernas 2x',
};

function phaseOf(week: number, total: number): ProgramWeek['phase'] {
  if (week === total) return 'Deload';
  const training = total - 1;
  if (week <= Math.ceil(training / 3)) return 'Adaptação';
  if (week <= Math.ceil((2 * training) / 3)) return 'Acumulação';
  return 'Intensificação';
}

/** RIR alvo: 3 na primeira semana até 1 na última antes do deload. */
export function rirFor(week: number, total: number, floor = 1): number {
  const training = total - 1;
  if (week >= total) return 4;
  if (training <= 1) return 2;
  return Math.max(floor, Math.round(3 - ((3 - floor) * (week - 1)) / (training - 1)));
}

function slotsFor(base: Base, goal: Goal, week: number, total: number): Slot[] {
  const deload = week === total;
  const phase = phaseOf(week, total);
  const extra = !deload && week > (total - 1) / 2 ? 1 : 0; // acumulação: +1 série na 2ª metade
  const cut = (n: number) => (deload ? Math.max(1, Math.ceil(n / 2)) : n + extra);
  const out: Slot[] = [];

  if (goal === 'forca') {
    const mainReps: [number, number] = phase === 'Adaptação' ? [5, 6] : phase === 'Acumulação' ? [4, 5] : phase === 'Intensificação' ? [2, 4] : [4, 5];
    for (const id of base.main) out.push({ exerciseId: id, role: 'principal', sets: deload ? 2 : 4, reps: mainReps, rir: rirFor(week, total), rest: 180 });
    for (const id of base.acc.slice(0, 3)) out.push({ exerciseId: id, role: 'acessorio', sets: cut(2), reps: [6, 10], rir: rirFor(week, total, 2), rest: 90 });
  } else if (goal === 'hipertrofia') {
    for (const id of base.main) out.push({ exerciseId: id, role: 'principal', sets: cut(3), reps: [6, 10], rir: rirFor(week, total), rest: 120 });
    for (const id of base.acc) out.push({ exerciseId: id, role: 'acessorio', sets: cut(3), reps: [10, 15], rir: rirFor(week, total), rest: 75 });
  } else {
    for (const id of base.main) out.push({ exerciseId: id, role: 'principal', sets: cut(3), reps: [10, 15], rir: rirFor(week, total, 2), rest: 60 });
    for (const id of base.acc.slice(0, 3)) out.push({ exerciseId: id, role: 'acessorio', sets: cut(2), reps: [12, 20], rir: rirFor(week, total, 2), rest: 45 });
    const minutes: [number, number] = deload ? [10, 10] : week > (total - 1) / 2 ? [15, 20] : [10, 15];
    out.push({ exerciseId: 'hiit', role: 'cardio', sets: 1, reps: minutes, rir: null, rest: 0 });
  }
  return out;
}

export function buildProgram(cfg: Pick<ProgramConfig, 'goal' | 'days' | 'weeks'>): ProgramWeek[] {
  const split = splitFor(cfg.days);
  return Array.from({ length: cfg.weeks }, (_, i) => {
    const index = i + 1;
    return {
      index,
      phase: phaseOf(index, cfg.weeks),
      deload: index === cfg.weeks,
      sessions: split.map((b) => ({ name: b.name, slots: slotsFor(b, cfg.goal, index, cfg.weeks) })),
    };
  });
}

function weeksBetween(from: string, to: string): number {
  const [a, b, c] = from.split('-').map(Number);
  const [x, y, z] = to.split('-').map(Number);
  return Math.round((new Date(x, y - 1, z).getTime() - new Date(a, b - 1, c).getTime()) / (7 * 86400000));
}

export interface ProgramToday {
  /** Semana atual (1..weeks), ou weeks+1 se acabou. */
  week: number;
  finished: boolean;
  current?: ProgramWeek;
  /** Sessões já feitas nesta semana (índices). */
  done: number[];
  /** Próxima sessão sugerida, ou null se a semana já foi cumprida. */
  next: number | null;
}

export function programToday(cfg: ProgramConfig, workouts: Workout[], now = new Date()): ProgramToday {
  const week = weeksBetween(cfg.startWeek, weekKey(now)) + 1;
  if (week > cfg.weeks) return { week, finished: true, done: [], next: null };
  const plan = buildProgram(cfg);
  const current = plan[Math.max(0, week - 1)];
  const done = [
    ...new Set(
      workouts
        .filter((w) => w.finishedAt && w.plan?.program === cfg.id && w.plan.week === week)
        .map((w) => w.plan!.session),
    ),
  ];
  const next = current.sessions.findIndex((_, i) => !done.includes(i));
  return { week, finished: false, current, done, next: next < 0 ? null : next };
}

export interface LoadTarget {
  weight: number | null;
  reps: number;
  note: string;
}

const round25 = (n: number) => Math.round(n / 2.5) * 2.5;

/**
 * Carga do dia pela dupla progressão: bateu o topo da faixa em todas as séries de trabalho
 * com o RIR pedido? Sobe a carga (2,5 kg; 5 kg em multiarticular de pernas) e volta ao piso da
 * faixa. Senão, mesma carga e uma rep a mais. No deload, 10% a menos.
 */
export function loadTarget(workouts: Workout[], slot: Slot, deload: boolean): LoadTarget {
  const [lo, hi] = slot.reps;
  if (slot.role === 'cardio') return { weight: null, reps: hi, note: `${lo === hi ? lo : `${lo} a ${hi}`} minutos em ritmo forte` };
  const done = workouts.filter((w) => w.finishedAt).sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!));
  for (const w of done) {
    const sets = w.sets.filter((s) => s.exerciseId === slot.exerciseId && !s.warmup && s.weight > 0);
    if (!sets.length) continue;
    const top = Math.max(...sets.map((s) => s.weight));
    const work = sets.filter((s) => s.weight === top);
    const reps = Math.min(...work.map((s) => s.reps));
    if (deload) return { weight: round25(top * 0.9), reps: lo, note: 'Deload: carga 10% menor, sem chegar perto da falha.' };
    const ex = EXERCISE_BY_ID[slot.exerciseId];
    const step = ex?.primary === 'pernas' && slot.role === 'principal' ? 5 : 2.5;
    const easy = reps >= hi && work.every((s) => s.rir === null || s.rir >= (slot.rir ?? 0));
    if (easy) return { weight: top + step, reps: lo, note: `Bateu ${hi} reps da última vez: +${step} kg.` };
    if (reps < lo) return { weight: top, reps: lo, note: `Mesma carga: busque ${lo} reps.` };
    return { weight: top, reps: Math.min(hi, reps + 1), note: 'Mesma carga: uma rep a mais.' };
  }
  return { weight: null, reps: lo, note: 'Primeira vez: escolha uma carga que deixe as reps do RIR pedido.' };
}

/** Texto curto da prescrição: "3 × 6–10 · RIR 2". */
export function prescription(slot: Slot): string {
  if (slot.role === 'cardio') return `${slot.reps[0] === slot.reps[1] ? slot.reps[0] : `${slot.reps[0]}–${slot.reps[1]}`} min`;
  // Isometria: reps são blocos de 10 s.
  if (EXERCISE_BY_ID[slot.exerciseId]?.timed) return `${slot.sets} × ${slot.reps[0] * 10}–${slot.reps[1] * 10} s`;
  return `${slot.sets} × ${slot.reps[0]}–${slot.reps[1]}${slot.rir !== null ? ` · RIR ${slot.rir}` : ''}`;
}
