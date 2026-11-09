export const ATTRIBUTES = ['empurrar', 'puxar', 'pernas', 'core', 'folego'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
  empurrar: 'Empurrar',
  puxar: 'Puxar',
  pernas: 'Pernas',
  core: 'Core',
  folego: 'Fôlego',
};

export const BOSS_IDS = ['agachamento', 'supino', 'terra'] as const;
export type BossId = (typeof BOSS_IDS)[number];

export interface Exercise {
  id: string;
  name: string;
  kind: 'forca' | 'cardio';
  primary: Attribute;
  secondary?: Attribute;
  bossId?: BossId;
}

/**
 * Uma série registrada.
 * Para exercícios de cardio, `reps` guarda os minutos e `weight` é ignorado.
 */
export interface SetEntry {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  /** Repetições na reserva. `null` = não registrado. */
  rir: number | null;
  warmup: boolean;
}

export interface Workout {
  id: string;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO, null enquanto está em andamento
  deload: boolean;
  sets: SetEntry[];
}

export interface Settings {
  weeklyGoal: number; // 2 a 6
  unit: 'kg' | 'lb';
}
