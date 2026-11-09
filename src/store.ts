import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SetEntry, Settings, Workout } from './game/types';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export type Look = 'a' | 'b';

export interface Profile {
  id: string;
  name: string;
  /** Visual do personagem: 'a' cabelo curto, 'b' cabelo longo. */
  look: Look;
  workouts: Workout[];
  active: Workout | null;
  settings: Settings;
}

const defaultSettings = (): Settings => ({ weeklyGoal: 3, unit: 'kg' });
const newProfile = (name: string, look: Look, extra: Partial<Profile> = {}): Profile => ({
  id: uid(),
  name,
  look,
  workouts: [],
  active: null,
  settings: defaultSettings(),
  ...extra,
});

interface State {
  profiles: Profile[];
  currentId: string;
  /** Treino recém-concluído cujo resumo deve ser mostrado. */
  summaryId: string | null;

  switchProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  setLook: (id: string, look: Look) => void;

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
  resetCurrent: () => void;
}

const initialProfiles = [newProfile('Jogador 1', 'a'), newProfile('Jogador 2', 'b')];

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Aplica uma mudança só no perfil selecionado. */
      const update = (fn: (p: Profile) => Partial<Profile>) =>
        set({ profiles: get().profiles.map((p) => (p.id === get().currentId ? { ...p, ...fn(p) } : p)) });

      return {
        profiles: initialProfiles,
        currentId: initialProfiles[0].id,
        summaryId: null,

        switchProfile: (id) => set({ currentId: id, summaryId: null }),
        renameProfile: (id, name) => set({ profiles: get().profiles.map((p) => (p.id === id ? { ...p, name } : p)) }),
        setLook: (id, look) => set({ profiles: get().profiles.map((p) => (p.id === id ? { ...p, look } : p)) }),

        startWorkout: () =>
          update(() => ({ active: { id: uid(), startedAt: new Date().toISOString(), finishedAt: null, deload: false, sets: [] } })),
        addSet: (s) => update((p) => (p.active ? { active: { ...p.active, sets: [...p.active.sets, { ...s, id: uid() }] } } : {})),
        removeSet: (id) => update((p) => (p.active ? { active: { ...p.active, sets: p.active.sets.filter((s) => s.id !== id) } } : {})),
        setDeload: (deload) => update((p) => (p.active ? { active: { ...p.active, deload } } : {})),
        finishWorkout: () => {
          const p = currentProfile(get());
          if (!p.active) return;
          if (p.active.sets.length === 0) return update(() => ({ active: null }));
          const done = { ...p.active, finishedAt: new Date().toISOString() };
          update((q) => ({ workouts: [...q.workouts, done], active: null }));
          set({ summaryId: done.id });
        },
        discardWorkout: () => update(() => ({ active: null })),
        closeSummary: () => set({ summaryId: null }),
        openSummary: (id) => set({ summaryId: id }),
        deleteWorkout: (id) => update((p) => ({ workouts: p.workouts.filter((w) => w.id !== id) })),
        updateSettings: (s) => update((p) => ({ settings: { ...p.settings, ...s } })),
        resetCurrent: () => update(() => ({ workouts: [], active: null })),
      };
    },
    {
      name: 'forja-v1',
      version: 1,
      partialize: ({ profiles, currentId }) => ({ profiles, currentId }),
      // Versão 0 tinha um perfil só: ele vira o primeiro perfil, e o segundo nasce vazio.
      migrate: (persisted, version) => {
        if (version === 0) {
          const old = persisted as { workouts?: Workout[]; active?: Workout | null; settings?: Settings };
          const first = newProfile('Jogador 1', 'a', {
            workouts: old.workouts ?? [],
            active: old.active ?? null,
            settings: old.settings ?? defaultSettings(),
          });
          return { profiles: [first, newProfile('Jogador 2', 'b')], currentId: first.id };
        }
        return persisted as { profiles: Profile[]; currentId: string };
      },
    },
  ),
);

export function currentProfile(s: Pick<State, 'profiles' | 'currentId'>): Profile {
  return s.profiles.find((p) => p.id === s.currentId) ?? s.profiles[0];
}

/** Perfil selecionado (dados de treino, configurações, visual). */
export function useProfile(): Profile {
  return useStore(currentProfile);
}
