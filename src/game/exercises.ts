import type { Exercise } from './types';

export const EXERCISES: Exercise[] = [
  // Empurrar
  { id: 'supino', name: 'Supino reto', kind: 'forca', primary: 'empurrar', bossId: 'supino' },
  { id: 'supino-inclinado', name: 'Supino inclinado', kind: 'forca', primary: 'empurrar' },
  { id: 'supino-halter', name: 'Supino com halteres', kind: 'forca', primary: 'empurrar' },
  { id: 'desenvolvimento', name: 'Desenvolvimento', kind: 'forca', primary: 'empurrar' },
  { id: 'elevacao-lateral', name: 'Elevação lateral', kind: 'forca', primary: 'empurrar' },
  { id: 'crucifixo', name: 'Crucifixo / peck deck', kind: 'forca', primary: 'empurrar' },
  { id: 'triceps-polia', name: 'Tríceps na polia', kind: 'forca', primary: 'empurrar' },
  { id: 'paralelas', name: 'Paralelas (dips)', kind: 'forca', primary: 'empurrar', secondary: 'core' },
  { id: 'flexao', name: 'Flexão de braço', kind: 'forca', primary: 'empurrar', secondary: 'core' },
  // Puxar
  { id: 'barra-fixa', name: 'Barra fixa', kind: 'forca', primary: 'puxar', secondary: 'core' },
  { id: 'puxada', name: 'Puxada na polia', kind: 'forca', primary: 'puxar' },
  { id: 'remada-curvada', name: 'Remada curvada', kind: 'forca', primary: 'puxar', secondary: 'core' },
  { id: 'remada-baixa', name: 'Remada baixa', kind: 'forca', primary: 'puxar' },
  { id: 'remada-unilateral', name: 'Remada unilateral', kind: 'forca', primary: 'puxar' },
  { id: 'face-pull', name: 'Face pull', kind: 'forca', primary: 'puxar' },
  { id: 'rosca', name: 'Rosca direta', kind: 'forca', primary: 'puxar' },
  { id: 'rosca-martelo', name: 'Rosca martelo', kind: 'forca', primary: 'puxar' },
  // Pernas
  { id: 'agachamento', name: 'Agachamento livre', kind: 'forca', primary: 'pernas', secondary: 'core', bossId: 'agachamento' },
  { id: 'terra', name: 'Levantamento terra', kind: 'forca', primary: 'pernas', secondary: 'puxar', bossId: 'terra' },
  { id: 'leg-press', name: 'Leg press', kind: 'forca', primary: 'pernas' },
  { id: 'stiff', name: 'Stiff / RDL', kind: 'forca', primary: 'pernas', secondary: 'puxar' },
  { id: 'afundo', name: 'Afundo / búlgaro', kind: 'forca', primary: 'pernas' },
  { id: 'cadeira-extensora', name: 'Cadeira extensora', kind: 'forca', primary: 'pernas' },
  { id: 'mesa-flexora', name: 'Mesa flexora', kind: 'forca', primary: 'pernas' },
  { id: 'panturrilha', name: 'Panturrilha', kind: 'forca', primary: 'pernas' },
  { id: 'hip-thrust', name: 'Hip thrust', kind: 'forca', primary: 'pernas' },
  // Core
  { id: 'prancha', name: 'Prancha (reps = segundos ÷ 10)', kind: 'forca', primary: 'core' },
  { id: 'abdominal-polia', name: 'Abdominal na polia', kind: 'forca', primary: 'core' },
  { id: 'elevacao-pernas', name: 'Elevação de pernas', kind: 'forca', primary: 'core' },
  { id: 'roda', name: 'Roda abdominal', kind: 'forca', primary: 'core' },
  // Fôlego (cardio: reps = minutos)
  { id: 'corrida', name: 'Corrida', kind: 'cardio', primary: 'folego' },
  { id: 'bike', name: 'Bicicleta', kind: 'cardio', primary: 'folego' },
  { id: 'escada', name: 'Escada / elíptico', kind: 'cardio', primary: 'folego' },
  { id: 'remo-ergometro', name: 'Remo ergômetro', kind: 'cardio', primary: 'folego', secondary: 'puxar' },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

export const BOSS_EXERCISE = {
  agachamento: 'agachamento',
  supino: 'supino',
  terra: 'terra',
} as const;
