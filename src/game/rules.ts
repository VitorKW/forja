/**
 * Regras do jogo — tudo aqui é função pura (mesma entrada → mesma saída, sem efeitos colaterais).
 * O progresso nunca é salvo: ele é sempre recalculado "repetindo" o histórico de treinos.
 * Assim, mudar uma regra (ou corrigir um bug) recalcula tudo de forma consistente.
 */
import { EXERCISE_BY_ID } from './exercises';
import { ACHIEVEMENTS, type AchievementId } from './achievements';
import { ATTRIBUTES, BOSS_IDS, type Attribute, type BossId, type Settings, type Workout } from './types';

export const XP = {
  effectiveSet: 10,
  weakSet: 2, // aquecimento ou série com RIR > 3
  rirBonus: 3,
  cardioPerMinute: 1,
  workoutBonus: 30,
  bossBonus: 100,
  weeklyGoalBonus: 75,
} as const;

export const RULES = {
  primaryShare: 0.7,
  fatigueSetsPerWeek: 20,
  fatigueFactor: 0.5,
  maxSetsWithXp: 40,
  streakStep: 0.1,
  maxStreakSteps: 5,
  bossMargin: 1.025,
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

export function bossHp(base: number): number {
  return base * RULES.bossMargin;
}

/** Pede confirmação se a carga for muito acima da maior já registrada no exercício. */
export function isSuspiciousWeight(workouts: Workout[], exerciseId: string, weight: number): boolean {
  let max = 0;
  for (const w of workouts) for (const s of w.sets) if (s.exerciseId === exerciseId) max = Math.max(max, s.weight);
  return max > 0 && weight > max * RULES.suspiciousWeightFactor;
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

export interface BossState {
  base: number | null; // 1RM estimado na última vitória (ou primeira marca)
  best: number | null; // melhor 1RM estimado já registrado
  defeats: number;
}

export interface WorkoutResult {
  xpTotal: number;
  attrXp: Record<Attribute, number>;
  bonuses: { label: string; xp: number }[];
  bossDefeats: BossId[];
  achievements: AchievementId[];
  fatigued: Attribute[];
  multiplier: number;
  levelBefore: number;
  levelAfter: number;
}

export interface Progress {
  totalXp: number;
  level: LevelInfo;
  attrXp: Record<Attribute, number>;
  attrLevels: Record<Attribute, LevelInfo>;
  bosses: Record<BossId, BossState>;
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
  bossDefeatsTotal: number;
  bossesDefeated: number;
  attrLevels: Record<Attribute, number>;
  deloadsDone: number;
  bestRirRun: number;
}

const zeroAttrs = (): Record<Attribute, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<Attribute, number>;

export function computeProgress(workouts: Workout[], settings: Settings, now: Date = new Date()): Progress {
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
  const bosses = Object.fromEntries(
    BOSS_IDS.map((b) => [b, { base: null, best: null, defeats: 0 } as BossState]),
  ) as Record<BossId, BossState>;
  const weekSetCount = new Map<string, Record<Attribute, number>>();
  const weekDaysSoFar = new Map<string, Set<string>>();
  const weeksAwarded = new Set<string>();
  const achievements: Progress['achievements'] = {};
  const results: Record<string, WorkoutResult> = {};
  const stats: AchievementStats = {
    workoutsDone: 0,
    weeksCompleted: 0,
    bestWeekRun: 0,
    bossDefeatsTotal: 0,
    bossesDefeated: 0,
    attrLevels: zeroAttrs(),
    deloadsDone: 0,
    bestRirRun: 0,
  };
  let rirRun = 0;

  for (const w of done) {
    const date = new Date(w.finishedAt);
    const wk = weekKey(date);
    advanceTo(wk);

    const multiplier = streakMultiplier(streak);
    const levelBefore = levelInfo(totalXp).level;
    const result: WorkoutResult = {
      xpTotal: 0,
      attrXp: zeroAttrs(),
      bonuses: [],
      bossDefeats: [],
      achievements: [],
      fatigued: [],
      multiplier,
      levelBefore,
      levelAfter: levelBefore,
    };
    const counts = weekSetCount.get(wk) ?? zeroAttrs();
    weekSetCount.set(wk, counts);

    w.sets.forEach((s, i) => {
      const ex = EXERCISE_BY_ID[s.exerciseId];
      if (!ex) return;

      let xp: number;
      if (ex.kind === 'cardio') {
        xp = Math.max(0, s.reps) * XP.cardioPerMinute;
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

        // Chefes
        if (ex.bossId && !s.warmup) {
          const e = estimate1RM(s.weight, s.reps);
          const boss = bosses[ex.bossId];
          if (e !== null) {
            boss.best = Math.max(boss.best ?? 0, e);
            if (boss.base === null) {
              boss.base = e;
            } else if (e > bossHp(boss.base)) {
              boss.base = e;
              boss.defeats++;
              stats.bossDefeatsTotal++;
              result.bossDefeats.push(ex.bossId);
              result.bonuses.push({ label: `Chefe derrotado: ${ex.name}`, xp: XP.bossBonus });
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

    // Conquistas
    stats.workoutsDone++;
    stats.bossesDefeated = BOSS_IDS.filter((b) => bosses[b].defeats > 0).length;
    for (const a of ATTRIBUTES) stats.attrLevels[a] = levelInfo(attrXp[a], 0.5).level;
    for (const ach of ACHIEVEMENTS) {
      if (!achievements[ach.id] && ach.check(stats)) {
        achievements[ach.id] = w.finishedAt;
        result.achievements.push(ach.id);
      }
    }

    results[w.id] = result;
  }

  // Situação da semana atual
  const currentWeek = weekKey(now);
  advanceTo(currentWeek);
  const daysThisWeek = weekInfo.get(currentWeek)?.days.size ?? 0;

  return {
    totalXp,
    level: levelInfo(totalXp),
    attrXp,
    attrLevels: Object.fromEntries(ATTRIBUTES.map((a) => [a, levelInfo(attrXp[a], 0.5)])) as Record<Attribute, LevelInfo>,
    bosses,
    streak,
    multiplier: streakMultiplier(streak),
    week: { key: currentWeek, days: daysThisWeek, goal: settings.weeklyGoal, done: weekComplete(currentWeek) },
    workoutsDone: done.length,
    achievements,
    results,
    weekSets: weekSetCount.get(currentWeek) ?? zeroAttrs(),
  };
}
