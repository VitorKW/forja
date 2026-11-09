import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyWeight, SetEntry, Settings, Template, Workout } from './game/types';
import type { Cheer, CheerKind, HabitId, HabitLog } from './game/extras';
import type { ItemKind } from './game/shop';
import { compactDiet, type DietEntry, type DietGoals, type DietLog } from './game/diet';
import { dayKey } from './game/rules';
import type { Bet, BetAnswer } from './game/bets';

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
  /** Quando nome, visual ou configurações mudaram por último (para a sincronização decidir quem vence). */
  metaAt?: number;
  /** Treinos apagados: a sincronização avisa o outro celular para não trazê-los de volta. */
  deleted?: string[];
  /** Missões diárias cumpridas. */
  habits?: HabitLog;
  /** Incentivos recebidos do par. */
  cheers?: Cheer[];
  templates?: Template[];
  /** Itens comprados na loja (ids). */
  purchases?: string[];
  equipped?: Partial<Record<ItemKind, string>>;
  bodyWeights?: BodyWeight[];
  dietLog?: DietLog;
  dietGoals?: DietGoals;
  /** Apostas propostas por este perfil. */
  bets?: Bet[];
  /** Respostas deste perfil às apostas do par. */
  betAnswers?: Record<string, BetAnswer>;
}

/** Dados de perfil que vêm da nuvem. */
export interface RemoteMeta {
  name: string;
  look: Look;
  settings: Settings;
  metaAt: number;
  habits?: HabitLog;
  templates?: Template[];
  purchases?: string[];
  equipped?: Partial<Record<ItemKind, string>>;
  bodyWeights?: BodyWeight[];
  dietLog?: DietLog;
  dietGoals?: DietGoals;
  bets?: Bet[];
  betAnswers?: Record<string, BetAnswer>;
}

/** Campos do perfil que viajam juntos no documento de perfil da nuvem (vence o mais recente). */
export const META_KEYS = ['name', 'look', 'settings', 'habits', 'templates', 'purchases', 'equipped', 'bodyWeights', 'dietLog', 'dietGoals', 'bets', 'betAnswers'] as const;

export function metaOf(p: Profile): RemoteMeta {
  return {
    name: p.name,
    look: p.look,
    settings: p.settings,
    metaAt: p.metaAt ?? 0,
    habits: p.habits ?? {},
    templates: p.templates ?? [],
    purchases: p.purchases ?? [],
    equipped: p.equipped ?? {},
    bodyWeights: p.bodyWeights ?? [],
    dietLog: p.dietLog ?? {},
    bets: p.bets ?? [],
    betAnswers: p.betAnswers ?? {},
    ...(p.dietGoals ? { dietGoals: p.dietGoals } : {}),
  };
}

export type SyncStatus = { state: 'connecting' | 'ok' | 'error'; message?: string };

const defaultSettings = (): Settings => ({ weeklyGoal: 3, unit: 'kg' });
const newProfile = (name: string, look: Look, extra: Partial<Profile> = {}): Profile => ({
  id: uid(),
  name,
  look,
  workouts: [],
  active: null,
  settings: defaultSettings(),
  metaAt: 0,
  deleted: [],
  ...extra,
});

const DEFAULT_NAMES = ['Vitor', 'Emanuela'];

interface State {
  profiles: Profile[];
  currentId: string;
  /** Treino recém-concluído cujo resumo deve ser mostrado. */
  summaryId: string | null;
  /** Código do grupo de sincronização (o mesmo nos dois celulares), ou null se desligada. */
  syncCode: string | null;
  syncStatus: SyncStatus | null;
  setSyncStatus: (s: SyncStatus | null) => void;

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

  setSyncCode: (code: string | null) => void;
  mergeRemoteMeta: (slot: number, meta: RemoteMeta) => void;
  mergeRemoteWorkouts: (slot: number, live: Workout[], dead: string[]) => void;
  mergeRemoteCheers: (slot: number, cheers: Cheer[]) => void;

  toggleHabit: (day: string, habit: HabitId) => void;
  sendCheer: (toProfileId: string, workoutId: string, kind: CheerKind) => void;
  saveTemplate: (name: string, exercises: string[]) => void;
  deleteTemplate: (id: string) => void;
  buyItem: (id: string) => void;
  equip: (kind: ItemKind, id: string | null) => void;
  logWeight: (day: string, kg: number) => void;
  addFood: (e: Omit<DietEntry, 'id' | 'at'>) => void;
  removeFood: (day: string, id: string) => void;
  setDietGoals: (g: DietGoals) => void;
  proposeBet: (b: Omit<Bet, 'id' | 'createdAt'>) => Bet;
  cancelBet: (id: string) => void;
  answerBet: (id: string, accepted: boolean) => void;
  /** Troca tudo pelo conteúdo de um backup. */
  restoreBackup: (data: { profiles: Profile[]; currentId: string }) => void;

  /** Mês da retrospectiva aberta (AAAA-MM), ou null. */
  recapMonth: string | null;
  openRecap: (month: string | null) => void;
}

const initialProfiles = [newProfile(DEFAULT_NAMES[0], 'a'), newProfile(DEFAULT_NAMES[1], 'b')];
const byStart = (a: Workout, b: Workout) => a.startedAt.localeCompare(b.startedAt);

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Aplica uma mudança só no perfil selecionado. */
      const update = (fn: (p: Profile) => Partial<Profile>) =>
        set({ profiles: get().profiles.map((p) => (p.id === get().currentId ? { ...p, ...fn(p) } : p)) });
      const updateAt = (slot: number, fn: (p: Profile) => Partial<Profile> | null) => {
        const profiles = get().profiles;
        const patch = profiles[slot] && fn(profiles[slot]);
        if (patch) set({ profiles: profiles.map((p, i) => (i === slot ? { ...p, ...patch } : p)) });
      };

      return {
        profiles: initialProfiles,
        currentId: initialProfiles[0].id,
        summaryId: null,
        syncCode: null,
        syncStatus: null,
        recapMonth: null,
        openRecap: (recapMonth) => set({ recapMonth }),
        setSyncStatus: (syncStatus) => set({ syncStatus }),

        switchProfile: (id) => set({ currentId: id, summaryId: null }),
        renameProfile: (id, name) =>
          set({ profiles: get().profiles.map((p) => (p.id === id ? { ...p, name, metaAt: Date.now() } : p)) }),
        setLook: (id, look) =>
          set({ profiles: get().profiles.map((p) => (p.id === id ? { ...p, look, metaAt: Date.now() } : p)) }),

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
        deleteWorkout: (id) =>
          update((p) => ({ workouts: p.workouts.filter((w) => w.id !== id), deleted: [...(p.deleted ?? []), id] })),
        updateSettings: (s) => update((p) => ({ settings: { ...p.settings, ...s }, metaAt: Date.now() })),
        resetCurrent: () =>
          update((p) => ({ workouts: [], active: null, deleted: [...(p.deleted ?? []), ...p.workouts.map((w) => w.id)] })),

        setSyncCode: (code) => set({ syncCode: code }),
        // A nuvem vence se for mais nova, ou se este celular nunca mexeu no perfil.
        mergeRemoteMeta: (slot, meta) =>
          updateAt(slot, (p) => {
            const local = p.metaAt ?? 0;
            if (!(meta.metaAt > local || (local === 0 && meta.metaAt >= 0))) return null;
            const incoming = { ...metaOf({ ...p, ...meta }), metaAt: meta.metaAt };
            if (JSON.stringify(incoming) === JSON.stringify(metaOf(p))) return null;
            return incoming;
          }),
        mergeRemoteCheers: (slot, cheers) =>
          updateAt(slot, (p) => {
            const have = new Set((p.cheers ?? []).map((c) => c.id));
            const added = cheers.filter((c) => !have.has(c.id));
            return added.length ? { cheers: [...(p.cheers ?? []), ...added] } : null;
          }),

        toggleHabit: (day, habit) =>
          update((p) => {
            const log = { ...(p.habits ?? {}) };
            const today = log[day] ?? [];
            log[day] = today.includes(habit) ? today.filter((h) => h !== habit) : [...today, habit];
            if (!log[day].length) delete log[day];
            return { habits: log, metaAt: Date.now() };
          }),
        sendCheer: (toProfileId, workoutId, kind) => {
          const from = currentProfile(get()).name;
          set({
            profiles: get().profiles.map((p) =>
              p.id === toProfileId
                ? { ...p, cheers: [...(p.cheers ?? []), { id: uid(), workoutId, kind, from, at: new Date().toISOString() }] }
                : p,
            ),
          });
        },
        saveTemplate: (name, exercises) =>
          update((p) => ({ templates: [...(p.templates ?? []), { id: uid(), name, exercises }], metaAt: Date.now() })),
        deleteTemplate: (id) => update((p) => ({ templates: (p.templates ?? []).filter((t) => t.id !== id), metaAt: Date.now() })),
        buyItem: (id) =>
          update((p) => (p.purchases?.includes(id) ? {} : { purchases: [...(p.purchases ?? []), id], metaAt: Date.now() })),
        equip: (kind, id) =>
          update((p) => {
            const equipped = { ...(p.equipped ?? {}) };
            if (id) equipped[kind] = id;
            else delete equipped[kind];
            return { equipped, metaAt: Date.now() };
          }),
        logWeight: (day, kg) =>
          update((p) => ({
            bodyWeights: [...(p.bodyWeights ?? []).filter((b) => b.day !== day), { day, kg }].sort((a, b) => a.day.localeCompare(b.day)),
            metaAt: Date.now(),
          })),
        addFood: (e) =>
          update((p) => {
            const day = dayKey(new Date());
            const log = { ...(p.dietLog ?? {}) };
            log[day] = [...(log[day] ?? []), { ...e, id: uid(), at: new Date().toISOString() }];
            return { dietLog: compactDiet(log, day), metaAt: Date.now() };
          }),
        removeFood: (day, id) =>
          update((p) => {
            const log = { ...(p.dietLog ?? {}) };
            log[day] = (log[day] ?? []).filter((x) => x.id !== id);
            if (!log[day].length) delete log[day];
            return { dietLog: log, metaAt: Date.now() };
          }),
        setDietGoals: (dietGoals) => update(() => ({ dietGoals, metaAt: Date.now() })),
        proposeBet: (b) => {
          const bet: Bet = { ...b, id: uid(), createdAt: new Date().toISOString() };
          update((p) => ({ bets: [...(p.bets ?? []), bet].slice(-40), metaAt: Date.now() }));
          return bet;
        },
        cancelBet: (id) =>
          update((p) => ({ bets: (p.bets ?? []).map((b) => (b.id === id ? { ...b, cancelled: true } : b)), metaAt: Date.now() })),
        answerBet: (id, accepted) =>
          update((p) => (p.betAnswers?.[id] ? {} : { betAnswers: { ...(p.betAnswers ?? {}), [id]: { accepted, at: new Date().toISOString() } }, metaAt: Date.now() })),
        restoreBackup: ({ profiles, currentId }) =>
          set({
            // metaAt novo: o backup vence a nuvem na próxima sincronização.
            profiles: profiles.map((p) => ({ ...p, metaAt: Date.now() })),
            currentId: profiles.some((p) => p.id === currentId) ? currentId : profiles[0].id,
            summaryId: null,
            recapMonth: null,
          }),
        // Junta os treinos: soma os que faltam aqui e tira os que foram apagados lá.
        mergeRemoteWorkouts: (slot, live, dead) =>
          updateAt(slot, (p) => {
            const gone = new Set([...(p.deleted ?? []), ...dead]);
            const have = new Set(p.workouts.map((w) => w.id));
            const added = live.filter((w) => !have.has(w.id) && !gone.has(w.id));
            const kept = p.workouts.filter((w) => !gone.has(w.id));
            const newDead = dead.filter((id) => !(p.deleted ?? []).includes(id));
            if (added.length === 0 && kept.length === p.workouts.length && newDead.length === 0) return null;
            return { workouts: [...kept, ...added].sort(byStart), deleted: [...(p.deleted ?? []), ...newDead] };
          }),
      };
    },
    {
      name: 'forja-v1',
      version: 2,
      partialize: ({ profiles, currentId, syncCode }) => ({ profiles, currentId, syncCode }),
      migrate: (persisted, version) => {
        let s = persisted as { profiles: Profile[]; currentId: string; syncCode?: string | null };
        // Versão 0 tinha um perfil só: ele vira o primeiro perfil, e o segundo nasce vazio.
        if (version === 0) {
          const old = persisted as { workouts?: Workout[]; active?: Workout | null; settings?: Settings };
          const first = newProfile('Jogador 1', 'a', {
            workouts: old.workouts ?? [],
            active: old.active ?? null,
            settings: old.settings ?? defaultSettings(),
          });
          s = { profiles: [first, newProfile('Jogador 2', 'b')], currentId: first.id };
        }
        // Versão 2: nomes padrão viram Vitor e Emanuela (só se ninguém tiver trocado).
        if (version < 2) {
          s = {
            ...s,
            syncCode: s.syncCode ?? null,
            profiles: s.profiles.map((p, i) => ({
              ...p,
              name: p.name === `Jogador ${i + 1}` ? DEFAULT_NAMES[i] ?? p.name : p.name,
              metaAt: p.metaAt ?? 0,
              deleted: p.deleted ?? [],
            })),
          };
        }
        return s;
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
