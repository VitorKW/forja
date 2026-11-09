import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SetEntry, Settings, Workout } from './game/types';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

interface State {
  workouts: Workout[];
  active: Workout | null;
  settings: Settings;
  /** Treino recém-concluído cujo resumo deve ser mostrado. */
  summaryId: string | null;

  startWorkout: () => void;
  addSet: (s: Omit<SetEntry, 'id'>) => void;
  removeSet: (id: string) => void;
  setDeload: (deload: boolean) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
  closeSummary: () => void;
  openSummary: (id: string) => void;
  deleteWorkout: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  resetAll: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      workouts: [],
      active: null,
      settings: { weeklyGoal: 3, unit: 'kg' },
      summaryId: null,

      startWorkout: () =>
        set({ active: { id: uid(), startedAt: new Date().toISOString(), finishedAt: null, deload: false, sets: [] } }),

      addSet: (s) => {
        const a = get().active;
        if (a) set({ active: { ...a, sets: [...a.sets, { ...s, id: uid() }] } });
      },

      removeSet: (id) => {
        const a = get().active;
        if (a) set({ active: { ...a, sets: a.sets.filter((s) => s.id !== id) } });
      },

      setDeload: (deload) => {
        const a = get().active;
        if (a) set({ active: { ...a, deload } });
      },

      finishWorkout: () => {
        const a = get().active;
        if (!a) return;
        if (a.sets.length === 0) return set({ active: null });
        const done = { ...a, finishedAt: new Date().toISOString() };
        set({ workouts: [...get().workouts, done], active: null, summaryId: done.id });
      },

      discardWorkout: () => set({ active: null }),
      closeSummary: () => set({ summaryId: null }),
      openSummary: (id) => set({ summaryId: id }),
      deleteWorkout: (id) => set({ workouts: get().workouts.filter((w) => w.id !== id) }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      resetAll: () => set({ workouts: [], active: null, summaryId: null }),
    }),
    { name: 'forja-v1', partialize: ({ workouts, active, settings }) => ({ workouts, active, settings }) },
  ),
);
