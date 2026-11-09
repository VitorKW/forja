import { useMemo } from 'react';
import { computeDuo, type DuoState } from './game/duo';
import { cheerEvents, fullHabitDays, habitEvents } from './game/extras';
import { computeProgress, type Progress } from './game/rules';
import { coinsEarned, coinsSpent } from './game/shop';
import { useStore, type Profile } from './store';

/** Progresso de um perfil: treinos + XP de missões e incentivos. */
export function progressOf(p: Profile): Progress {
  return computeProgress(p.workouts, p.settings, new Date(), [...habitEvents(p.habits ?? {}), ...cheerEvents(p.cheers ?? [])]);
}

/** Progresso dos dois perfis, o índice do atual e o estado da dupla. Só recalcula quando os dados mudam. */
export function useGame() {
  const profiles = useStore((s) => s.profiles);
  const currentId = useStore((s) => s.currentId);
  const all = useMemo(() => profiles.map(progressOf), [profiles]);
  const me = Math.max(0, profiles.findIndex((p) => p.id === currentId)) as 0 | 1;
  const partner = (me === 0 ? 1 : 0) as 0 | 1;

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

  const coins = useMemo(() => {
    const p = profiles[me];
    const earned = coinsEarned({
      bossesDefeated: all[me].campaign.defeated,
      achievements: Object.keys(all[me].achievements).length,
      fullHabitDays: fullHabitDays(p.habits ?? {}),
      duo: duo ? { state: duo, me } : null,
    });
    return { earned, balance: earned - coinsSpent(p.purchases ?? []) };
  }, [profiles, all, duo, me]);

  return { profiles, all, me, partner, duo, coins, progress: all[me], profile: profiles[me] };
}

/** Progresso do perfil atual. */
export function useProgress() {
  return useGame().progress;
}
