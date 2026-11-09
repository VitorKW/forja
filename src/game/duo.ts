/**
 * Modo dupla: tudo calculado a partir do histórico dos dois perfis (nada é salvo).
 * - Chefe da semana (raid): só cai com o XP dos dois somado.
 * - Sequência do casal: semanas seguidas em que os dois cumpriram a meta.
 * - Desafio da semana: um duelo amigável que muda toda semana.
 */
import { EXERCISE_BY_ID } from './exercises';
import { dayKey, nextWeek, weekKey } from './rules';
import type { Workout } from './types';

export interface DuoPlayer {
  name: string;
  workouts: Workout[];
  /** XP de cada treino (de computeProgress().results). */
  xpOf: (workoutId: string) => number;
  weeklyGoal: number;
}

export const RAID_BOSSES = [
  { name: 'Colosso de Escória', epithet: 'só cai com dois martelos', sprite: 'chefe-09' },
  { name: 'Gêmeos de Fuligem', epithet: 'um distrai, o outro ataca', sprite: 'chefe-02' },
  { name: 'Sentinela Dupla', epithet: 'guarda a porta das duas forjas', sprite: 'chefe-07' },
  { name: 'Hidra Gêmea', epithet: 'cada cabeça tem seu alvo', sprite: 'chefe-08' },
  { name: 'Dragão Bicéfalo', epithet: 'duas bocas, um só fogo', sprite: 'chefe-10' },
  { name: 'Monarcas do Aço', epithet: 'reinam enquanto vocês descansam', sprite: 'chefe-11' },
] as const;

export const RAID = { baseHp: 1200, growth: 0.1, maxGrowthSteps: 15 } as const;

export const CHALLENGES = [
  { id: 'treinos', label: 'Quem treina mais vezes', unit: 'treinos' },
  { id: 'km', label: 'Quem anda ou corre mais', unit: 'km' },
  { id: 'series', label: 'Quem faz mais séries de força', unit: 'séries' },
  { id: 'minutos', label: 'Quem faz mais minutos de cardio', unit: 'min' },
] as const;
export type ChallengeId = (typeof CHALLENGES)[number]['id'];

export interface DuoState {
  raid: {
    week: string;
    boss: (typeof RAID_BOSSES)[number];
    hp: number;
    damage: [number, number];
    defeated: boolean;
  };
  raidsWon: number;
  /** Semanas seguidas (até a passada) em que os dois cumpriram a meta. */
  coupleStreak: number;
  /** Os dois já cumpriram a meta desta semana? */
  coupleWeekDone: boolean;
  coupleWeeksTotal: number;
  challenge: { id: ChallengeId; label: string; unit: string; values: [number, number] };
  /** Desafios vencidos em semanas encerradas, por jogador (empate não conta). */
  challengeWins: [number, number];
}

/** Número da semana desde uma segunda-feira fixa (para escolher chefe e desafio). */
export function weekIndex(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const ms = new Date(y, m - 1, d).getTime() - new Date(2024, 0, 1).getTime();
  return Math.round(ms / (7 * 86400000));
}

export function raidHp(raidsWonBefore: number): number {
  return Math.round(RAID.baseHp * (1 + RAID.growth * Math.min(raidsWonBefore, RAID.maxGrowthSteps)));
}

export function challengeFor(key: string) {
  const i = ((weekIndex(key) % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length;
  return CHALLENGES[i];
}

function bossFor(key: string) {
  const i = ((weekIndex(key) % RAID_BOSSES.length) + RAID_BOSSES.length) % RAID_BOSSES.length;
  return RAID_BOSSES[i];
}

/** Valor de um jogador no desafio, para os treinos de uma semana. */
export function challengeValue(id: ChallengeId, workouts: Workout[]): number {
  let v = 0;
  for (const w of workouts) {
    if (id === 'treinos') {
      v++;
      continue;
    }
    for (const s of w.sets) {
      const ex = EXERCISE_BY_ID[s.exerciseId];
      if (!ex) continue;
      if (id === 'km' && ex.kind === 'cardio') v += Math.max(0, s.distance ?? 0);
      if (id === 'minutos' && ex.kind === 'cardio') v += Math.max(0, s.reps);
      if (id === 'series' && ex.kind === 'forca' && !s.warmup) v++;
    }
  }
  return Math.round(v * 10) / 10;
}

export function computeDuo(a: DuoPlayer, b: DuoPlayer, now: Date = new Date()): DuoState {
  const players = [a, b];
  // Treinos concluídos de cada jogador, agrupados por semana.
  const byWeek = players.map((p) => {
    const m = new Map<string, Workout[]>();
    for (const w of p.workouts) {
      if (!w.finishedAt) continue;
      const k = weekKey(new Date(w.finishedAt));
      m.set(k, [...(m.get(k) ?? []), w]);
    }
    return m;
  });
  const goalMet = (i: number, k: string) => {
    const ws = byWeek[i].get(k) ?? [];
    const days = new Set(ws.map((w) => dayKey(new Date(w.finishedAt!))));
    return ws.some((w) => w.deload) || days.size >= players[i].weeklyGoal;
  };
  const damage = (i: number, k: string) => (byWeek[i].get(k) ?? []).reduce((sum, w) => sum + players[i].xpOf(w.id), 0);

  const current = weekKey(now);
  const allWeeks = [...byWeek[0].keys(), ...byWeek[1].keys()].filter((k) => k <= current).sort();
  let raidsWon = 0;
  let coupleStreak = 0;
  let coupleWeeksTotal = 0;
  const challengeWins: [number, number] = [0, 0];

  if (allWeeks.length) {
    for (let k = allWeeks[0]; k < current; k = nextWeek(k)) {
      if (damage(0, k) + damage(1, k) >= raidHp(raidsWon)) raidsWon++;
      if (goalMet(0, k) && goalMet(1, k)) {
        coupleStreak++;
        coupleWeeksTotal++;
      } else coupleStreak = 0;
      const ch = challengeFor(k);
      const va = challengeValue(ch.id, byWeek[0].get(k) ?? []);
      const vb = challengeValue(ch.id, byWeek[1].get(k) ?? []);
      if (va > vb) challengeWins[0]++;
      else if (vb > va) challengeWins[1]++;
    }
  }

  const hp = raidHp(raidsWon);
  const dmg: [number, number] = [damage(0, current), damage(1, current)];
  const defeated = dmg[0] + dmg[1] >= hp;
  if (defeated) raidsWon++;
  const coupleWeekDone = goalMet(0, current) && goalMet(1, current);
  if (coupleWeekDone) coupleWeeksTotal++;
  const ch = challengeFor(current);

  return {
    raid: { week: current, boss: bossFor(current), hp, damage: dmg, defeated },
    raidsWon,
    coupleStreak,
    coupleWeekDone,
    coupleWeeksTotal,
    challenge: {
      id: ch.id,
      label: ch.label,
      unit: ch.unit,
      values: [challengeValue(ch.id, byWeek[0].get(current) ?? []), challengeValue(ch.id, byWeek[1].get(current) ?? [])],
    },
    challengeWins,
  };
}
