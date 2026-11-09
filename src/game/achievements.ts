import { ATTRIBUTES } from './types';
import type { AchievementStats } from './rules';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (s: AchievementStats) => boolean;
}

export const ACHIEVEMENTS = [
  { id: 'primeira-faisca', name: 'Primeira Faísca', icon: '✨', description: 'Conclua o primeiro treino', check: (s) => s.workoutsDone >= 1 },
  { id: 'fogo-aceso', name: 'Fogo Aceso', icon: '🔥', description: 'Cumpra a meta semanal pela primeira vez', check: (s) => s.weeksCompleted >= 1 },
  { id: 'brasa-constante', name: 'Brasa Constante', icon: '🕯️', description: '4 semanas seguidas cumprindo a meta', check: (s) => s.bestWeekRun >= 4 },
  { id: 'forja-eterna', name: 'Forja Eterna', icon: '♾️', description: '12 semanas seguidas cumprindo a meta', check: (s) => s.bestWeekRun >= 12 },
  { id: 'matador', name: 'Matador de Chefes', icon: '⚔️', description: 'Derrote um chefe pela primeira vez', check: (s) => s.bossDefeatsTotal >= 1 },
  { id: 'trinca', name: 'Trinca', icon: '👑', description: 'Derrote os 3 chefes pelo menos uma vez', check: (s) => s.bossesDefeated >= 3 },
  { id: 'equilibrio', name: 'Equilíbrio', icon: '⚖️', description: 'Todos os atributos no nível 3 ou mais', check: (s) => ATTRIBUTES.every((a) => s.attrLevels[a] >= 3) },
  { id: 'sabe-descansar', name: 'Sabe Descansar', icon: '🌙', description: 'Conclua um treino de deload', check: (s) => s.deloadsDone >= 1 },
  { id: 'centuriao', name: 'Centurião', icon: '🛡️', description: '100 treinos concluídos', check: (s) => s.workoutsDone >= 100 },
  { id: 'honesto', name: 'Honesto', icon: '🎯', description: 'Registre o RIR em 50 séries seguidas', check: (s) => s.bestRirRun >= 50 },
] as const satisfies readonly Achievement[];

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];
