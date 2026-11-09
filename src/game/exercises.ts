import type { Exercise } from './types';

export const EXERCISES: Exercise[] = [
  // Empurrar
  { id: 'supino', name: 'Supino reto', kind: 'forca', primary: 'empurrar' },
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
  { id: 'agachamento', name: 'Agachamento livre', kind: 'forca', primary: 'pernas', secondary: 'core' },
  { id: 'terra', name: 'Levantamento terra', kind: 'forca', primary: 'pernas', secondary: 'puxar' },
  { id: 'leg-press', name: 'Leg press', kind: 'forca', primary: 'pernas' },
  { id: 'stiff', name: 'Stiff / RDL', kind: 'forca', primary: 'pernas', secondary: 'puxar' },
  { id: 'afundo', name: 'Afundo / búlgaro', kind: 'forca', primary: 'pernas' },
  { id: 'cadeira-extensora', name: 'Cadeira extensora', kind: 'forca', primary: 'pernas' },
  { id: 'mesa-flexora', name: 'Mesa flexora', kind: 'forca', primary: 'pernas' },
  { id: 'abdutora', name: 'Cadeira abdutora', kind: 'forca', primary: 'pernas' },
  { id: 'panturrilha', name: 'Panturrilha', kind: 'forca', primary: 'pernas' },
  { id: 'hip-thrust', name: 'Hip thrust / elevação pélvica', kind: 'forca', primary: 'pernas' },
  // Core
  { id: 'prancha', name: 'Prancha (reps = blocos de 10 s)', kind: 'forca', primary: 'core' },
  { id: 'abdominal-polia', name: 'Abdominal na polia', kind: 'forca', primary: 'core' },
  { id: 'abdominal', name: 'Abdominal no solo', kind: 'forca', primary: 'core' },
  { id: 'elevacao-pernas', name: 'Elevação de pernas', kind: 'forca', primary: 'core' },
  { id: 'roda', name: 'Roda abdominal', kind: 'forca', primary: 'core' },
  // Fôlego: reps = minutos. perMinute = intensidade, perKm = bônus por distância.
  { id: 'caminhada', name: 'Caminhada', kind: 'cardio', primary: 'folego', secondary: 'pernas', perMinute: 1, perKm: 3, maxKmh: 8 },
  { id: 'trilha', name: 'Trilha', kind: 'cardio', primary: 'folego', secondary: 'pernas', perMinute: 1.2, perKm: 4, maxKmh: 8 },
  { id: 'corrida', name: 'Corrida', kind: 'cardio', primary: 'folego', secondary: 'pernas', perMinute: 1.6, perKm: 4, maxKmh: 22 },
  { id: 'bike', name: 'Bicicleta', kind: 'cardio', primary: 'folego', secondary: 'pernas', perMinute: 1.2, perKm: 1, maxKmh: 45 },
  { id: 'natacao', name: 'Natação', kind: 'cardio', primary: 'folego', secondary: 'puxar', perMinute: 1.6, perKm: 10, maxKmh: 6 },
  { id: 'escada', name: 'Escada / elíptico', kind: 'cardio', primary: 'folego', secondary: 'pernas', perMinute: 1.3 },
  { id: 'remo-ergometro', name: 'Remo ergômetro', kind: 'cardio', primary: 'folego', secondary: 'puxar', perMinute: 1.4 },
  { id: 'pular-corda', name: 'Pular corda', kind: 'cardio', primary: 'folego', perMinute: 1.6 },
  { id: 'hiit', name: 'HIIT / funcional', kind: 'cardio', primary: 'folego', secondary: 'core', perMinute: 1.7 },
  { id: 'esporte', name: 'Futebol, vôlei, basquete...', kind: 'cardio', primary: 'folego', secondary: 'pernas', perMinute: 1.4 },
  { id: 'danca', name: 'Dança', kind: 'cardio', primary: 'folego', perMinute: 1.2 },
  { id: 'luta', name: 'Luta / artes marciais', kind: 'cardio', primary: 'folego', secondary: 'core', perMinute: 1.6 },
  { id: 'yoga', name: 'Yoga / alongamento', kind: 'cardio', primary: 'core', perMinute: 0.7 },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
