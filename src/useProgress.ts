import { useMemo } from 'react';
import { computeDuo, JOINT, jointWorkouts, type DuoState, type JointPair } from './game/duo';
import { dietHabits, goalsOn, mergeHabits, type DietGoals } from './game/diet';
import { dayKey } from './game/rules';
import { activeMissions, cheerEvents, fullHabitDays, habitEvents, type HabitLog, type XpEvent } from './game/extras';
import { computeProgress, type Progress } from './game/rules';
import { computeSeasons, type SeasonState } from './game/season';
import { computeBets } from './game/bets';
import { coinsEarned, coinsSpent } from './game/shop';
import { useStore, type Profile } from './store';
import { duoAchievements, type DuoStats } from './game/duoAchievements';
import { computeMonthly, type MonthState } from './game/monthly';

/** Metas de hoje. */
export function goalsOf(p: Profile): DietGoals {
  return goalsOn(dayKey(new Date()), p);
}

/** Missões do perfil: as marcadas à mão mais as cumpridas pela dieta. */
export function habitsOf(p: Profile): HabitLog {
  // A dieta só marca proteína e água se elas estiverem entre as missões escolhidas.
  const ids = new Set(activeMissions(p.missions).map((m) => m.id));
  const diet = Object.fromEntries(
    Object.entries(dietHabits(p.dietLog ?? {}, (day) => goalsOn(day, p)))
      .map(([d, hs]) => [d, hs.filter((h) => ids.has(h))] as const)
      .filter(([, hs]) => hs.length),
  );
  return mergeHabits(p.habits ?? {}, diet);
}

/** XP de fora dos treinos: missões, incentivos e bônus de treino junto. */
function extrasOf(p: Profile, joint: JointPair[]): XpEvent[] {
  return [...habitEvents(habitsOf(p)), ...cheerEvents(p.cheers ?? []), ...joint.map((j) => ({ at: j.at, xp: JOINT.xp }))];
}

/** Progresso de um perfil: treinos + XP extra. */
export function progressOf(p: Profile, joint: JointPair[] = []): Progress {
  return computeProgress(p.workouts, p.settings, new Date(), extrasOf(p, joint), p.frozenWeeks ?? []);
}

/** Todos os eventos de XP com data (treinos + extras), para temporadas e retrospectiva. */
function xpTimeline(p: Profile, prog: Progress, joint: JointPair[]): XpEvent[] {
  const ws = p.workouts
    .filter((w) => w.finishedAt)
    .map((w) => ({ at: new Date(w.finishedAt!).getTime(), xp: prog.results[w.id]?.xpTotal ?? 0 }));
  return [...ws, ...extrasOf(p, joint)];
}

/** Progresso dos dois perfis, o índice do atual e o estado da dupla. Só recalcula quando os dados mudam. */
export function useGame() {
  const profiles = useStore((s) => s.profiles);
  const currentId = useStore((s) => s.currentId);
  const me = Math.max(0, profiles.findIndex((p) => p.id === currentId)) as 0 | 1;
  const partner = (me === 0 ? 1 : 0) as 0 | 1;

  const joint = useMemo(() => (profiles.length < 2 ? [] : jointWorkouts(profiles[0].workouts, profiles[1].workouts)), [profiles]);
  const all = useMemo(() => profiles.map((p) => progressOf(p, joint)), [profiles, joint]);
  const timelines = useMemo(() => profiles.map((p, i) => xpTimeline(p, all[i], joint)), [profiles, all, joint]);
  const habits = useMemo(() => profiles.map(habitsOf), [profiles]);

  const duo: DuoState | null = useMemo(() => {
    if (profiles.length < 2) return null;
    const player = (i: number) => ({
      name: profiles[i].name,
      workouts: profiles[i].workouts,
      xpOf: (id: string) => all[i].results[id]?.xpTotal ?? 0,
      weeklyGoal: profiles[i].settings.weeklyGoal,
    });
    return computeDuo(player(0), player(1));
  }, [profiles, all]);

  const monthly: MonthState | null = useMemo(() => {
    if (profiles.length < 2) return null;
    const player = (i: number) => ({
      name: profiles[i].name,
      workouts: profiles[i].workouts,
      xpOf: (id: string) => all[i].results[id]?.xpTotal ?? 0,
      weeklyGoal: profiles[i].settings.weeklyGoal,
    });
    return computeMonthly(player(0), player(1));
  }, [profiles, all]);

  const season: SeasonState | null = useMemo(
    () => (profiles.length < 2 ? null : computeSeasons(timelines[0], timelines[1])),
    [profiles.length, timelines],
  );

  const bets = useMemo(
    () =>
      profiles.length < 2
        ? { list: [], coins: [0, 0] as [number, number] }
        : computeBets(
            [0, 1].map((i) => ({
              bets: profiles[i].bets ?? [],
              answers: profiles[i].betAnswers ?? {},
              workouts: profiles[i].workouts,
              timeline: timelines[i],
              habits: habits[i],
            })) as [Parameters<typeof computeBets>[0][0], Parameters<typeof computeBets>[0][1]],
          ),
    [profiles, timelines, habits],
  );

  const duoStats: DuoStats | null = useMemo(
    () =>
      duo
        ? { joint: joint.length, bestCoupleStreak: duo.bestCoupleStreak, coupleWeeksTotal: duo.coupleWeeksTotal, raidsWon: duo.raidsWon, km: all[0].distanceTotal + (all[1]?.distanceTotal ?? 0) }
        : null,
    [duo, joint, all],
  );
  const duoDone = useMemo(() => (duoStats ? duoAchievements(duoStats) : []), [duoStats]);

  const coins = useMemo(() => {
    const p = profiles[me];
    const earned = coinsEarned({
      bossesDefeated: all[me].campaign.defeated,
      achievements: Object.keys(all[me].achievements).length,
      fullHabitDays: fullHabitDays(habits[me]),
      duo: duo ? { state: duo, me } : null,
      jointWorkouts: joint.length,
      seasonCoins: season?.coins[me] ?? 0,
      betCoins: bets.coins[me],
      duoAchievements: duoDone.length,
      monthsWon: monthly?.won ?? 0,
    });
    return { earned, balance: earned - coinsSpent(p.purchases ?? [], p.frozenWeeks?.length ?? 0, p.redeemed ?? []) };
  }, [profiles, all, duo, me, habits, joint, season, bets, duoDone, monthly]);

  return {
    profiles,
    all,
    me,
    partner,
    duo,
    monthly,
    coins,
    joint,
    duoStats,
    duoDone,
    season,
    bets,
    habits,
    timelines,
    progress: all[me],
    profile: profiles[me],
  };
}

/** Progresso do perfil atual. */
export function useProgress() {
  return useGame().progress;
}
