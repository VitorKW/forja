import { useMemo } from 'react';
import { computeProgress } from './game/rules';
import { useProfile } from './store';

/** Progresso do perfil atual, recalculado a partir do histórico. Só refaz a conta quando os dados mudam. */
export function useProgress() {
  const { workouts, settings } = useProfile();
  return useMemo(() => computeProgress(workouts, settings), [workouts, settings]);
}
