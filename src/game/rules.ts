/**
 * Regras do jogo — tudo aqui é função pura (mesma entrada → mesma saída, sem efeitos colaterais).
 * O progresso nunca é salvo: ele é sempre recalculado "repetindo" o histórico de treinos.
 * Assim, mudar uma regra (ou corrigir um bug) recalcula tudo de forma consistente.
 */
import { EXERCISE_BY_ID } from './exercises';
import { ACHIEVEMENTS, type AchievementId } from './achievements';
import { campaignAt, type CampaignState } from './campaign';
import { ATTRIBUTES, type Attribute, type Settings, type Workout } from './types';
import type { XpEvent } from './extras';

export const XP = {
  effectiveSet: 10,
  weakSet: 2, // aquecimento ou série com RIR > 3
  rirBonus: 3,
  workoutBonus: 30,
  recordBonus: 100,
  weeklyGoalBonus: 75,
} as const;

export const RULES = {
  primaryShare: 0.7,
  fatigueSetsPerWeek: 20,
  fatigueFactor: 0.5,
  maxSetsWithXp: 40,
  maxCardioMinutes: 300,
  streakStep: 0.1,
  maxStreakSteps: 5,
  recordMargin: 1.025,
  maxRepsFor1RM: 12,
  suspiciousWeightFactor: 1.5,
} as const;

// ---------- Níveis ----------

export function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export interface LevelInfo {
  level: number;
  into: number; // XP dentro do nível atual
  need: number; // XP necessário para passar de nível
}

/** `scale` = 0.5 para atributos (precisam de metade do XP). */
export function levelInfo(xp: number, scale = 1): LevelInfo {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpToNext(level) * scale) {
    remaining -= xpToNext(level) * scale;
    level++;
  }
  return { level, into: remaining, need: xpToNext(level) * scale };
}

export function levelTitle(level: number): string {
  if (level >= 10) return 'Mestre da Forja';
  if (level >= 5) return 'Ferreiro';
  return 'Aprendiz';
}

// ---------- Força ----------

/** 1RM estimado pela fórmula de Epley. `null` se as reps estiverem fora da faixa confiável. */
export function estimate1RM(weight: number, reps: number): number | null {
  if (weight <= 0 || reps < 1 || reps > RULES.maxRepsFor1RM) return null;
  return weight * (1 + reps / 30);
}

/** Marca a superar para quebrar o recorde (base + 2,5%). */
export function recordTarget(base: number): number {
  return base * RULES.recordMargin;
}

/** Pede confirmação se a carga for muito acima da maior já registrada no exercício. */
export function isSuspiciousWeight(workouts: Workout[], exerciseId: string, weight: number): boolean {
  let max = 0;
  for (const w of workouts) for (const s of w.sets) if (s.exerciseId === exerciseId) max = Math.max(max, s.weight);
  return max > 0 && weight > max * RULES.suspiciousWeightFactor;
}

/** XP bruto de uma sessão de cardio (antes de multiplicador). */
export function cardioXp(exerciseId: string, minutes: number, distance = 0): number {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex || ex.kind !== 'cardio') return 0;
  const mins = Math.max(0, Math.min(RULES.maxCardioMinutes, minutes));
  return mins * (ex.perMinute ?? 1) + Math.max(0, distance) * (ex.perKm ?? 0);
}

/**
 * Sugestão de carga para a próxima série, olhando a última sessão do exercício.
 * Progressão dupla simples: chegou a 12 reps (ou sobrou bastante, RIR 3+) em todas as
 * séries de trabalho? Sobe 2,5. Senão, mantém a carga e busca mais reps.
 */
export function suggestLoad(workouts: Workout[], exerciseId: string): { weight: number; reps: number; note: string } | null {
  const done = workouts.filter((w) => w.finishedAt).sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!));
  for (const w of done) {
    const sets = w.sets.filter((s) => s.exerciseId === exerciseId && !s.warmup && s.weight > 0);
    if (!sets.length) continue;
    const top = Math.max(...sets.map((s) => s.weight));
    const work = sets.filter((s) => s.weight === top);
    const reps = Math.min(...work.map((s) => s.reps));
    const easy = work.every((s) => s.reps >= 12 || (s.rir !== null && s.rir >= 3));
    if (easy) return { weight: top + 2.5, reps: Math.max(6, reps - 4), note: 'Da última vez sobrou fôlego: suba a carga.' };
    return { weight: top, reps: reps + 1, note: 'Mesma carga da última vez: tente uma rep a mais.' };
  }
  return null;
}

// ---------- Semanas ----------

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Chave da semana = data da segunda-feira (horário local). */
export function weekKey(d: Date): string {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dayKey(monday);
}

export function nextWeek(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + 7));
}

export function streakMultiplier(streak: number): number {
  return 1 + RULES.streakStep * Math.min(streak, RULES.maxStreakSteps);
}

// ---------- Simulação completa ----------

export interface RecordState {
  base: number; // 1RM estimado na última quebra de recorde (ou primeira marca)
  best: number; // melhor 1RM estimado já registrado
  beaten: number;
}

export interface WorkoutResult {
  xpTotal: number;
  attrXp: Record<Attribute, number>;
  bonuses: { label: string; xp: number }[];
  records: string[]; // exercícios com recorde quebrado
  achievements: AchievementId[];
  fatigued: Attribute[];
  multiplier: number;
  levelBefore: number;
  levelAfter: number;
  campaignBefore: CampaignState;
  campaignAfter: CampaignState;
  distance: number;
}

export interface Progress {
  totalXp: number;
  /** XP vindo de fora dos treinos (missões e incentivos). */
  bonusXp: number;
  level: LevelInfo;
  attrXp: Record<Attribute, number>;
  attrLevels: Record<Attribute, LevelInfo>;
  records: Record<string, RecordState>;
  campaign: CampaignState;
  distanceTotal: number;
  /** Semanas de constância acumuladas ao entrar na semana atual. */
  streak: number;
  multiplier: number;
  week: { key: string; days: number; goal: number; done: boolean };
  workoutsDone: number;
  achievements: Partial<Record<AchievementId, string>>; // id → data do desbloqueio
  results: Record<string, WorkoutResult>;
  /** Séries efetivas por atributo na semana atual (para o aviso de fadiga). */
  weekSets: Record<Attribute, number>;
}

/** Contadores que as conquistas consultam. */
export interface AchievementStats {
  workoutsDone: number;
  weeksCompleted: number;
  bestWeekRun: number;
  bossesDefeated: number;
  recordsBeaten: number;
  distanceTotal: number;
  attrLevels: Record<Attribute, number>;
  deloadsDone: number;
  bestRirRun: number;
}

const zeroAttrs = (): Record<Attribute, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<Attribute, number>;

/** extras: XP de missões e incentivos, encaixado na linha do tempo junto com os treinos. */
export function computeProgress(workouts: Workout[], settings: Settings, now: Date = new Date(), extras: XpEvent[] = []): Progress {
  const done = workouts
    .filter((w): w is Workout & { finishedAt: string } => !!w.finishedAt)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));

  // Pré-calcula quais semanas foram cumpridas (para semanas já encerradas).
  const weekInfo = new Map<string, { days: Set<string>; deload: boolean }>();
  for (const w of done) {
    const d = new Date(w.finishedAt);
    const k = weekKey(d);
    const info = weekInfo.get(k) ?? { days: new Set(), deload: false };
    info.days.add(dayKey(d));
    info.deload ||= w.deload;
    weekInfo.set(k, info);
  }
  const weekComplete = (k: string) => {
    const i = weekInfo.get(k);
    return !!i && (i.deload || i.days.size >= settings.weeklyGoal);
  };

  let streak = 0; // constância (cai pela metade ao falhar)
  let run = 0; // semanas seguidas cumpridas (zera ao falhar)
  let cursor: string | null = null;
  const advanceTo = (target: string) => {
    if (cursor === null) {
      cursor = target;
      return;
    }
    while (cursor < target) {
      if (weekComplete(cursor)) {
        streak++;
        run++;
      } else {
        streak = Math.floor(streak / 2);
        run = 0;
      }
      cursor = nextWeek(cursor);
    }
  };

  let totalXp = 0;
  const attrXp = zeroAttrs();
  const records: Record<string, RecordState> = {};
  const weekSetCount = new Map<string, Record<Attribute, number>>();
  const weekDaysSoFar = new Map<string, Set<string>>();
  const weeksAwarded = new Set<string>();
  const achievements: Progress['achievements'] = {};
  const results: Record<string, WorkoutResult> = {};
  const stats: AchievementStats = {
    workoutsDone: 0,
    weeksCompleted: 0,
    bestWeekRun: 0,
    bossesDefeated: 0,
    recordsBeaten: 0,
    distanceTotal: 0,
    attrLevels: zeroAttrs(),
    deloadsDone: 0,
    bestRirRun: 0,
  };
  let rirRun = 0;

  const events = [...extras].sort((a, b) => a.at - b.at);
  let ev = 0;
  let bonusXp = 0;
  const consumeUntil = (t: number) => {
    while (ev < events.length && events[ev].at <= t) {
      totalXp += events[ev].xp;
      bonusXp += events[ev].xp;
      ev++;
    }
  };

  for (const w of done) {
    const date = new Date(w.finishedAt);
    const wk = weekKey(date);
    advanceTo(wk);
    consumeUntil(date.getTime());

    const multiplier = streakMultiplier(streak);
    const levelBefore = levelInfo(totalXp).level;
    const result: WorkoutResult = {
      xpTotal: 0,
      attrXp: zeroAttrs(),
      bonuses: [],
      records: [],
      achievements: [],
      fatigued: [],
      multiplier,
      levelBefore,
      levelAfter: levelBefore,
      campaignBefore: campaignAt(totalXp),
      campaignAfter: campaignAt(totalXp),
      distance: 0,
    };
    const counts = weekSetCount.get(wk) ?? zeroAttrs();
    weekSetCount.set(wk, counts);

    w.sets.forEach((s, i) => {
      const ex = EXERCISE_BY_ID[s.exerciseId];
      if (!ex) return;

      let xp: number;
      if (ex.kind === 'cardio') {
        xp = cardioXp(ex.id, s.reps, s.distance ?? 0);
        result.distance += Math.max(0, s.distance ?? 0);
      } else {
        const effective = !s.warmup && (s.rir === null || s.rir <= 3);
        xp = effective ? XP.effectiveSet : XP.weakSet;
        if (!s.warmup && s.rir !== null) xp += XP.rirBonus;
        if (effective) {
          counts[ex.primary]++;
          if (counts[ex.primary] > RULES.fatigueSetsPerWeek) {
            xp *= RULES.fatigueFactor;
            if (!result.fatigued.includes(ex.primary)) result.fatigued.push(ex.primary);
          }
        }

        // Sequência de séries com RIR registrado (conquista "Honesto").
        if (!s.warmup) {
          rirRun = s.rir !== null ? rirRun + 1 : 0;
          stats.bestRirRun = Math.max(stats.bestRirRun, rirRun);
        }

        // Recordes pessoais (qualquer exercício de força)
        if (!s.warmup) {
          const e = estimate1RM(s.weight, s.reps);
          if (e !== null) {
            const r = records[ex.id];
            if (!r) {
              records[ex.id] = { base: e, best: e, beaten: 0 };
            } else {
              r.best = Math.max(r.best, e);
              if (e > recordTarget(r.base)) {
                r.base = e;
                r.beaten++;
                if (!result.records.includes(ex.id)) {
                  stats.recordsBeaten++;
                  result.records.push(ex.id);
                  result.bonuses.push({ label: `Recorde: ${ex.name}`, xp: XP.recordBonus });
                }
              }
            }
          }
        }
      }

      if (i >= RULES.maxSetsWithXp) xp = 0;
      xp *= multiplier;

      if (ex.secondary) {
        result.attrXp[ex.primary] += xp * RULES.primaryShare;
        result.attrXp[ex.secondary] += xp * (1 - RULES.primaryShare);
      } else {
        result.attrXp[ex.primary] += xp;
      }
    });

    result.bonuses.unshift({ label: 'Treino concluído', xp: XP.workoutBonus });

    // Meta semanal
    const days = weekDaysSoFar.get(wk) ?? new Set<string>();
    days.add(dayKey(date));
    weekDaysSoFar.set(wk, days);
    if (!weeksAwarded.has(wk) && (w.deload || days.size >= settings.weeklyGoal)) {
      weeksAwarded.add(wk);
      stats.weeksCompleted++;
      stats.bestWeekRun = Math.max(stats.bestWeekRun, run + 1);
      result.bonuses.push({ label: w.deload ? 'Semana de deload cumprida' : 'Meta semanal cumprida', xp: XP.weeklyGoalBonus });
    }
    if (w.deload) stats.deloadsDone++;

    // Soma tudo
    for (const a of ATTRIBUTES) {
      result.attrXp[a] = Math.round(result.attrXp[a]);
      attrXp[a] += result.attrXp[a];
      result.xpTotal += result.attrXp[a];
    }
    for (const b of result.bonuses) result.xpTotal += b.xp;
    totalXp += result.xpTotal;
    result.levelAfter = levelInfo(totalXp).level;
    result.campaignAfter = campaignAt(totalXp);
    stats.distanceTotal += result.distance;

    // Conquistas
    stats.workoutsDone++;
    stats.bossesDefeated = result.campaignAfter.defeated;
    for (const a of ATTRIBUTES) stats.attrLevels[a] = levelInfo(attrXp[a], 0.5).level;
    for (const ach of ACHIEVEMENTS) {
      if (!achievements[ach.id] && ach.check(stats)) {
        achievements[ach.id] = w.finishedAt;
        result.achievements.push(ach.id);
      }
    }

    results[w.id] = result;
  }

  consumeUntil(Infinity);

  // Situação da semana atual
  const currentWeek = weekKey(now);
  advanceTo(currentWeek);
  const daysThisWeek = weekInfo.get(currentWeek)?.days.size ?? 0;

  return {
    totalXp,
    bonusXp,
    level: levelInfo(totalXp),
    attrXp,
    attrLevels: Object.fromEntries(ATTRIBUTES.map((a) => [a, levelInfo(attrXp[a], 0.5)])) as Record<Attribute, LevelInfo>,
    records,
    campaign: campaignAt(totalXp),
    distanceTotal: stats.distanceTotal,
    streak,
    multiplier: streakMultiplier(streak),
    week: { key: currentWeek, days: daysThisWeek, goal: settings.weeklyGoal, done: weekComplete(currentWeek) },
    workoutsDone: done.length,
    achievements,
    results,
    weekSets: weekSetCount.get(currentWeek) ?? zeroAttrs(),
  };
}
