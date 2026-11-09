/**
 * Apostas do casal. Quem propõe guarda a aposta no próprio perfil; quem responde guarda a
 * resposta no próprio perfil. Assim cada celular só escreve no seu perfil e a sincronização
 * normal leva tudo. O resultado é calculado do histórico, como o resto do jogo.
 *
 * A aposta vale do dia do aceite (inteiro) até `days` dias depois. Empate: ninguém paga.
 */
import type { HabitLog, XpEvent } from './extras';
import type { Workout } from './types';
import { countsAsWorkout } from './rules';

export const BET_METRICS = [
  { id: 'treinos', label: 'Quem treina mais vezes', unit: 'treinos' },
  { id: 'xp', label: 'Quem faz mais XP', unit: 'XP' },
  { id: 'missoes', label: 'Quem cumpre mais missões', unit: 'missões' },
  { id: 'proteina', label: 'Mais dias batendo a proteína', unit: 'dias' },
] as const;
export type BetMetric = (typeof BET_METRICS)[number]['id'];
export const BET_METRIC = Object.fromEntries(BET_METRICS.map((m) => [m.id, m])) as Record<BetMetric, (typeof BET_METRICS)[number]>;

export const BET_DAYS = [3, 7, 14] as const;
export const BET_STAKES = [0, 10, 25, 50, 100] as const;
/** Proposta sem resposta some depois de 3 dias. */
export const BET_EXPIRES_MS = 3 * 86400000;

export interface Bet {
  id: string;
  metric: BetMetric;
  days: number;
  /** Moedas que o perdedor passa para o vencedor. */
  stake: number;
  /** Prêmio da vida real, só anotado (ex.: "quem perder paga o açaí"). */
  prize?: string;
  createdAt: string; // ISO
  cancelled?: boolean;
}

export interface BetAnswer {
  accepted: boolean;
  at: string; // ISO
}

export interface BetPlayer {
  bets: Bet[];
  answers: Record<string, BetAnswer>;
  workouts: Workout[];
  /** Eventos de XP com data (treinos + extras). */
  timeline: XpEvent[];
  /** Missões cumpridas (manuais + dieta). */
  habits: HabitLog;
}

export type BetStatus = 'proposta' | 'expirada' | 'cancelada' | 'recusada' | 'valendo' | 'encerrada';

export interface BetView {
  bet: Bet;
  /** Quem propôs (0 ou 1). */
  by: 0 | 1;
  status: BetStatus;
  start?: number;
  end?: number;
  /** Placar, por jogador (0 e 1). */
  values: [number, number];
  /** Vencedor (0 ou 1), null em empate ou se ainda não acabou. */
  winner: 0 | 1 | null;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayStart(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Placar de um jogador numa janela [start, end). */
export function betValue(metric: BetMetric, p: Pick<BetPlayer, 'workouts' | 'timeline' | 'habits'>, start: number, end: number): number {
  const inside = (ms: number) => ms >= start && ms < end;
  switch (metric) {
    case 'treinos':
      return p.workouts.filter((w) => w.finishedAt && countsAsWorkout(w) && inside(new Date(w.finishedAt).getTime())).length;
    case 'xp':
      return p.timeline.filter((e) => inside(e.at)).reduce((s, e) => s + e.xp, 0);
    case 'missoes':
      return Object.entries(p.habits)
        .filter(([day]) => inside(dayStart(day)))
        .reduce((s, [, ids]) => s + new Set(ids).size, 0);
    case 'proteina':
      return Object.entries(p.habits).filter(([day, ids]) => inside(dayStart(day)) && ids.includes('proteina')).length;
  }
}

/** Todas as apostas dos dois, mais recentes primeiro, e o saldo de moedas de cada um. */
export function computeBets(players: [BetPlayer, BetPlayer], now = Date.now()): { list: BetView[]; coins: [number, number] } {
  const coins: [number, number] = [0, 0];
  const list: BetView[] = [];
  ([0, 1] as const).forEach((by) => {
    const other = (1 - by) as 0 | 1;
    for (const bet of players[by].bets) {
      const answer = players[other].answers[bet.id];
      const view: BetView = { bet, by, status: 'proposta', values: [0, 0], winner: null };
      if (bet.cancelled && !answer?.accepted) view.status = 'cancelada';
      else if (!answer) view.status = now - new Date(bet.createdAt).getTime() > BET_EXPIRES_MS ? 'expirada' : 'proposta';
      else if (!answer.accepted) view.status = 'recusada';
      else {
        const start = startOfDay(new Date(answer.at).getTime());
        const end = start + bet.days * 86400000;
        view.start = start;
        view.end = end;
        view.values = [betValue(bet.metric, players[0], start, end), betValue(bet.metric, players[1], start, end)];
        if (now < end) view.status = 'valendo';
        else {
          view.status = 'encerrada';
          if (view.values[0] !== view.values[1]) {
            const w = (view.values[0] > view.values[1] ? 0 : 1) as 0 | 1;
            view.winner = w;
            coins[w] += bet.stake;
            coins[(1 - w) as 0 | 1] -= bet.stake;
          }
        }
      }
      list.push(view);
    }
  });
  list.sort((a, b) => b.bet.createdAt.localeCompare(a.bet.createdAt));
  return { list, coins };
}
