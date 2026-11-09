import { useMemo } from 'react';
import { computeProgress } from './game/rules';
import { useStore } from './store';

/** Progresso recalculado a partir do histórico. Só refaz a conta quando os treinos ou as configurações mudam. */
export function useProgress() {
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  return useMemo(() => computeProgress(workouts, settings), [workouts, settings]);
}
