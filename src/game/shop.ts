/**
 * Moedas e loja. As moedas também são recalculadas do histórico: ganha-se por marcos
 * (chefes, conquistas, raids, desafios, semanas do casal, dias de missões completas)
 * e gasta-se com as compras salvas no perfil.
 */
import type { DuoState } from './duo';
import { DUO_ACHIEVEMENT_COINS } from './duoAchievements';
import { FREEZE } from './rules';
import { MONTH } from './monthly';

export const COINS = {
  boss: 40,
  achievement: 25,
  raid: 80,
  challenge: 30,
  coupleWeek: 20,
  habitDay: 5,
  joint: 10,
} as const;

export type ItemKind = 'capa' | 'pet';

export interface ShopItem {
  id: string;
  kind: ItemKind;
  name: string;
  price: number;
  /** Item de dupla: só libera depois de derrotarem um chefe da semana juntos. */
  needsRaid?: boolean;
}

export const SHOP: ShopItem[] = [
  { id: 'rubi', kind: 'capa', name: 'Capa de rubi', price: 150 },
  { id: 'safira', kind: 'capa', name: 'Capa de safira', price: 150 },
  { id: 'esmeralda', kind: 'capa', name: 'Capa de esmeralda', price: 150 },
  { id: 'ametista', kind: 'capa', name: 'Capa de ametista', price: 200 },
  { id: 'dupla', kind: 'capa', name: 'Capa da dupla', price: 100, needsRaid: true },
  { id: 'slime', kind: 'pet', name: 'Slime de estimação', price: 250 },
  { id: 'gato', kind: 'pet', name: 'Gato da forja', price: 300 },
  { id: 'dragao', kind: 'pet', name: 'Dragãozinho', price: 500 },
];
export const ITEM_BY_ID = Object.fromEntries(SHOP.map((i) => [i.id, i])) as Record<string, ShopItem>;

export interface CoinSources {
  bossesDefeated: number;
  achievements: number;
  fullHabitDays: number;
  /** Índice do jogador na dupla (0 ou 1), ou null sem dupla. */
  duo: { state: DuoState; me: 0 | 1 } | null;
  /** Treinos feitos junto com o par. */
  jointWorkouts?: number;
  /** Moedas de temporada (marcos e troféus). */
  seasonCoins?: number;
  /** Saldo das apostas encerradas (pode ser negativo). */
  betCoins?: number;
  /** Conquistas do casal já feitas. */
  duoAchievements?: number;
  /** Chefes do mês derrotados (cada um recebe as moedas). */
  monthsWon?: number;
}

export function coinsEarned(s: CoinSources): number {
  let c = s.bossesDefeated * COINS.boss + s.achievements * COINS.achievement + s.fullHabitDays * COINS.habitDay;
  c += (s.jointWorkouts ?? 0) * COINS.joint + (s.seasonCoins ?? 0) + (s.betCoins ?? 0) + (s.duoAchievements ?? 0) * DUO_ACHIEVEMENT_COINS + (s.monthsWon ?? 0) * MONTH.coins;
  if (s.duo) {
    c += s.duo.state.raidsWon * COINS.raid;
    c += s.duo.state.challengeWins[s.duo.me] * COINS.challenge;
    c += s.duo.state.coupleWeeksTotal * COINS.coupleWeek;
  }
  return c;
}

/** Gastos: itens da loja, semanas congeladas e recompensas do casal resgatadas. */
export function coinsSpent(purchases: string[], frozenWeeks = 0, redeemed: { cost: number }[] = []): number {
  return purchases.reduce((sum, id) => sum + (ITEM_BY_ID[id]?.price ?? 0), 0) + frozenWeeks * FREEZE.cost + redeemed.reduce((s, r) => s + r.cost, 0);
}

export function canBuy(item: ShopItem, balance: number, purchases: string[], raidsWon: number): boolean {
  if (purchases.includes(item.id)) return false;
  if (item.needsRaid && raidsWon < 1) return false;
  return balance >= item.price;
}
