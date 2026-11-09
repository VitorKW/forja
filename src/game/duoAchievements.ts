/** Conquistas do casal: valem para os dois e dão moedas a cada um. */

export interface DuoStats {
  /** Treinos feitos juntos (até 2 h de diferença). */
  joint: number;
  bestCoupleStreak: number;
  coupleWeeksTotal: number;
  raidsWon: number;
  /** Km somados dos dois (cardio com distância). */
  km: number;
}

export const DUO_ACHIEVEMENTS: { id: string; name: string; description: string; check: (s: DuoStats) => boolean; progress: (s: DuoStats) => [number, number] }[] = [
  { id: 'lado-a-lado', name: 'Lado a Lado', description: 'Primeiro treino juntos', check: (s) => s.joint >= 1, progress: (s) => [s.joint, 1] },
  { id: 'parceria', name: 'Parceria', description: '10 treinos juntos', check: (s) => s.joint >= 10, progress: (s) => [s.joint, 10] },
  { id: 'inseparaveis', name: 'Inseparáveis', description: '50 treinos juntos', check: (s) => s.joint >= 50, progress: (s) => [s.joint, 50] },
  { id: 'mes-redondo', name: 'Mês Redondo', description: '4 semanas seguidas com os dois na meta', check: (s) => s.bestCoupleStreak >= 4, progress: (s) => [s.bestCoupleStreak, 4] },
  { id: 'estacao', name: 'Uma Estação', description: '12 semanas seguidas com os dois na meta', check: (s) => s.bestCoupleStreak >= 12, progress: (s) => [s.bestCoupleStreak, 12] },
  { id: 'cacadores', name: 'Caçadores', description: 'Derrotem 5 chefes da semana', check: (s) => s.raidsWon >= 5, progress: (s) => [s.raidsWon, 5] },
  { id: 'cem-km', name: 'Cem Quilômetros', description: '100 km somados de caminhada, corrida, bike...', check: (s) => s.km >= 100, progress: (s) => [Math.floor(s.km), 100] },
  { id: 'meio-ano', name: 'Meio Ano', description: '26 semanas (não precisam ser seguidas) com os dois na meta', check: (s) => s.coupleWeeksTotal >= 26, progress: (s) => [s.coupleWeeksTotal, 26] },
];

export const DUO_ACHIEVEMENT_COINS = 30;

export function duoAchievements(s: DuoStats): string[] {
  return DUO_ACHIEVEMENTS.filter((a) => a.check(s)).map((a) => a.id);
}
