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

/**
 * Distância que conta: no máximo o que dá para fazer no tempo registrado
 * (ex.: caminhada até 8 km/h). Evita "1 minuto, 50 km".
 */
export function plausibleKm(exerciseId: string, minutes: number, distance = 0): number {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex || ex.kind !== 'cardio' || !ex.perKm) return 0;
  const mins = Math.max(0, Math.min(RULES.maxCardioMinutes, minutes));
  const max = ex.maxKmh ? (mins / 60) * ex.maxKmh : Infinity;
  return Math.round(Math.min(Math.max(0, distance), max) * 100) / 100;
}

/** XP bruto de uma sessão de cardio (antes de multiplicador). */
export function cardioXp(exerciseId: string, minutes: number, distance = 0): number {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex || ex.kind !== 'cardio') return 0;
  const mins = Math.max(0, Math.min(RULES.maxCardioMinutes, minutes));
  return mins * (ex.perMinute ?? 1) + plausibleKm(exerciseId, minutes, distance) * (ex.perKm ?? 0);
}

// ---------- O que conta como treino ----------

/** Mínimo para um registro contar como treino (bônus, dia na meta, treino junto). */
export const MIN_WORKOUT = { sets: 3, cardioMin: 10 } as const;

/** 3 séries de trabalho ou 10 minutos de cardio. Abrir e fechar o treino com 1 série não conta. */
export function countsAsWorkout(w: Pick<Workout, 'sets'>): boolean {
  let sets = 0;
  let mins = 0;
  for (const s of w.sets) {
    const ex = EXERCISE_BY_ID[s.exerciseId];
    if (!ex) continue;
    if (ex.kind === 'cardio') mins += Math.max(0, Math.min(RULES.maxCardioMinutes, s.reps));
    else if (!s.warmup && s.reps >= 1) sets++;
  }
  return sets >= MIN_WORKOUT.sets || mins >= MIN_WORKOUT.cardioMin;
}

/** Semana de deload: só uma a cada 4 semanas, e com pelo menos metade dos dias da meta. */
export const DELOAD = { everyWeeks: 4 } as const;
export const deloadDays = (weeklyGoal: number) => Math.max(1, Math.ceil(weeklyGoal / 2));

function weeksBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (7 * 86400000));
}

export interface WeekStatus {
  /** Dias com treino que conta, por semana. */
  days: Map<string, Set<string>>;
  /** Semanas em que o deload vale como meta cumprida. */
  deloadOk: Set<string>;
  complete: (week: string) => boolean;
}

/** Quais semanas cumpriram a meta (mesma regra para o perfil e para a dupla). */
export function weekStatus(workouts: Workout[], weeklyGoal: number): WeekStatus {
  const days = new Map<string, Set<string>>();
  const deloadWeeks = new Set<string>();
  for (const w of workouts) {
    if (!w.finishedAt || !countsAsWorkout(w)) continue;
    const d = new Date(w.finishedAt);
    const k = weekKey(d);
    const set = days.get(k) ?? new Set<string>();
    set.add(dayKey(d));
    days.set(k, set);
    if (w.deload) deloadWeeks.add(k);
  }
  const deloadOk = new Set<string>();
  let last: string | null = null;
  for (const k of [...deloadWeeks].sort()) {
    if ((days.get(k)?.size ?? 0) < deloadDays(weeklyGoal)) continue;
    if (last && weeksBetween(last, k) < DELOAD.everyWeeks) continue;
    deloadOk.add(k);
    last = k;
  }
  const complete = (k: string) => (days.get(k)?.size ?? 0) >= weeklyGoal || deloadOk.has(k);
  return { days, deloadOk, complete };
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
/** rozen: semanas congeladas na loja (não contam como cumpridas, mas não quebram a sequência). */
export function computeProgress(workouts: Workout[], settings: Settings, now: Date = new Date(), extras: XpEvent[] = [], frozen: string[] = []): Progress {
  const frozenSet = new Set(frozen);
  const done = workouts
    .filter((w): w is Workout & { finishedAt: string } => !!w.finishedAt)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));

  // Pré-calcula quais semanas foram cumpridas (para semanas já encerradas).
  const weeks = weekStatus(done, settings.weeklyGoal);
  const weekComplete = weeks.complete;

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
      } else if (frozenSet.has(cursor)) {
        // Congelada: a sequência fica como estava.
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
        result.distance += plausibleKm(ex.id, s.reps, s.distance ?? 0);
      } else if (s.reps < 1) {
        return; // série sem repetição não vale nada
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

    // Treino curto demais (menos de 3 séries ou 10 min de cardio): as séries valem XP,
    // mas não dá bônus de treino nem conta dia na meta.
    const valid = countsAsWorkout(w);
    if (valid) result.bonuses.unshift({ label: 'Treino concluído', xp: XP.workoutBonus });

    // Meta semanal
    const days = weekDaysSoFar.get(wk) ?? new Set<string>();
    if (valid) days.add(dayKey(date));
    weekDaysSoFar.set(wk, days);
    const goalHit = days.size >= settings.weeklyGoal;
    const deloadHit = weeks.deloadOk.has(wk) && days.size >= deloadDays(settings.weeklyGoal);
    if (!weeksAwarded.has(wk) && (goalHit || deloadHit)) {
      weeksAwarded.add(wk);
      stats.weeksCompleted++;
      stats.bestWeekRun = Math.max(stats.bestWeekRun, run + 1);
      result.bonuses.push({ label: goalHit ? 'Meta semanal cumprida' : 'Semana de deload cumprida', xp: XP.weeklyGoalBonus });
    }
    if (w.deload && valid) stats.deloadsDone++;

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
    if (valid) stats.workoutsDone++;
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
  const daysThisWeek = weeks.days.get(currentWeek)?.size ?? 0;

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
    workoutsDone: stats.workoutsDone,
    achievements,
    results,
    weekSets: weekSetCount.get(currentWeek) ?? zeroAttrs(),
  };
}

// ---------- Congelar a sequência ----------

export const FREEZE = { cost: 120, everyWeeks: 4 } as const;

/**
 * Oferta de congelamento: a semana passada ficou abaixo da meta e isso derrubou a
 * constância. Uma vez a cada 4 semanas. Devolve null se não há o que salvar.
 */
export function freezeOffer(
  workouts: Workout[],
  settings: Settings,
  frozen: string[] = [],
  now: Date = new Date(),
): { week: string; streakNow: number; streakIfFrozen: number } | null {
  const thisWeek = weekKey(now);
  const [y, m, d] = thisWeek.split('-').map(Number);
  const last = dayKey(new Date(y, m - 1, d - 7));
  if (frozen.includes(last) || weekStatus(workouts, settings.weeklyGoal).complete(last)) return null;
  if (frozen.some((f) => weeksBetween(f, last) < FREEZE.everyWeeks)) return null;
  const streakNow = computeProgress(workouts, settings, now, [], frozen).streak;
  const streakIfFrozen = computeProgress(workouts, settings, now, [], [...frozen, last]).streak;
  return streakIfFrozen > streakNow ? { week: last, streakNow, streakIfFrozen } : null;
}