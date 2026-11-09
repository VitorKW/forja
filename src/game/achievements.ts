import { ATTRIBUTES } from './types';
import type { AchievementStats } from './rules';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  check: (s: AchievementStats) => boolean;
}

export const ACHIEVEMENTS = [
  { id: 'primeira-faisca', name: 'Primeira Faísca', description: 'Conclua o primeiro treino', check: (s) => s.workoutsDone >= 1 },
  { id: 'fogo-aceso', name: 'Fogo Aceso', description: 'Cumpra a meta semanal pela primeira vez', check: (s) => s.weeksCompleted >= 1 },
  { id: 'brasa-constante', name: 'Brasa Constante', description: '4 semanas seguidas cumprindo a meta', check: (s) => s.bestWeekRun >= 4 },
  { id: 'forja-eterna', name: 'Forja Eterna', description: '12 semanas seguidas cumprindo a meta', check: (s) => s.bestWeekRun >= 12 },
  { id: 'matador', name: 'Matador de Chefes', description: 'Derrote o primeiro chefe da campanha', check: (s) => s.bossesDefeated >= 1 },
  { id: 'trinca', name: 'Caçador de Monstros', description: 'Derrote 5 chefes da campanha', check: (s) => s.bossesDefeated >= 5 },
  { id: 'recordista', name: 'Recordista', description: 'Supere um recorde pessoal de força', check: (s) => s.recordsBeaten >= 1 },
  { id: 'andarilho', name: 'Andarilho', description: 'Some 25 km de caminhada, corrida ou trilha', check: (s) => s.distanceTotal >= 25 },
  { id: 'equilibrio', name: 'Equilíbrio', description: 'Todos os atributos no nível 3 ou mais', check: (s) => ATTRIBUTES.every((a) => s.attrLevels[a] >= 3) },
  { id: 'sabe-descansar', name: 'Sabe Descansar', description: 'Conclua um treino de deload', check: (s) => s.deloadsDone >= 1 },
  { id: 'centuriao', name: 'Centurião', description: '100 treinos concluídos', check: (s) => s.workoutsDone >= 100 },
  { id: 'honesto', name: 'Honesto', description: 'Registre o RIR em 50 séries seguidas', check: (s) => s.bestRirRun >= 50 },
] as const satisfies readonly Achievement[];

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];
