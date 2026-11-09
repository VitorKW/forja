export const ATTRIBUTES = ['empurrar', 'puxar', 'pernas', 'core', 'folego'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
  empurrar: 'Empurrar',
  puxar: 'Puxar',
  pernas: 'Pernas',
  core: 'Core',
  folego: 'Fôlego',
};

export interface Exercise {
  id: string;
  name: string;
  kind: 'forca' | 'cardio';
  primary: Attribute;
  secondary?: Attribute;
  /** Cardio: XP por minuto (intensidade). */
  perMinute?: number;
  /** Cardio: XP extra por km. Ausente = atividade sem distância. */
  perKm?: number;
}

/**
 * Uma série registrada.
 * Para cardio, `reps` guarda os minutos, `distance` os km e `weight` é ignorado.
 */
export interface SetEntry {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  /** Repetições na reserva. `null` = não registrado. */
  rir: number | null;
  warmup: boolean;
  distance?: number;
}

export interface Workout {
  id: string;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO, null enquanto está em andamento
  deload: boolean;
  sets: SetEntry[];
  /** Sessão do programa periodizado que este treino cumpre. */
  plan?: { program: string; week: number; session: number };
}

export interface Settings {
  weeklyGoal: number; // 2 a 6
  unit: 'kg' | 'lb';
  /** Descanso entre séries, em segundos (padrão 90). */
  restSeconds?: number;
}

/** Ficha de treino: uma lista de exercícios para não ter que escolher um por um. */
export interface Template {
  id: string;
  name: string;
  exercises: string[];
}

/** Registro de peso corporal. */
export interface BodyWeight {
  day: string; // AAAA-MM-DD
  kg: number;
}
