/**
 * Temporadas de 3 meses (trimestres do calendário). Cada uma tem um placar de XP do casal,
 * uma trilha de marcos que dá moedas a cada um e um troféu para quem fizer mais XP.
 * Tudo calculado dos eventos de XP com data: nada é salvo.
 */
import type { XpEvent } from './extras';

export const SEASON_NAMES = ['Brasa', 'Aço', 'Tempestade', 'Ouro'] as const;
export const SEASON_TIERS = [
  { xp: 1500, coins: 20 },
  { xp: 4000, coins: 30 },
  { xp: 8000, coins: 50 },
  { xp: 12000, coins: 100 },
] as const;
export const SEASON_WIN_COINS = 100;

export interface Season {
  key: string; // "2026-T4"
  name: string; // "Ouro 2026"
  start: Date;
  end: Date; // exclusivo
}

export function seasonOf(d: Date): Season {
  const q = Math.floor(d.getMonth() / 3);
  const y = d.getFullYear();
  return {
    key: `${y}-T${q + 1}`,
    name: `${SEASON_NAMES[q]} ${y}`,
    start: new Date(y, q * 3, 1),
    end: new Date(y, q * 3 + 3, 1),
  };
}

export function seasonPoints(events: XpEvent[], s: Season): number {
  const a = s.start.getTime();
  const b = s.end.getTime();
  return events.reduce((sum, e) => (e.at >= a && e.at < b ? sum + e.xp : sum), 0);
}

export function tiersReached(points: number): number {
  return SEASON_TIERS.filter((t) => points >= t.xp).length;
}

export function tierCoins(points: number): number {
  return SEASON_TIERS.slice(0, tiersReached(points)).reduce((s, t) => s + t.coins, 0);
}

export interface SeasonResult {
  season: Season;
  points: [number, number];
  /** Quem fez mais XP (null = empate ou temporada sem nada). */
  winner: 0 | 1 | null;
}

export interface SeasonState {
  current: SeasonResult;
  daysLeft: number;
  /** Temporadas encerradas com algum XP, da mais recente para a mais antiga. */
  past: SeasonResult[];
  /** Moedas de temporada de cada um: marcos (todas) + troféu (só as encerradas). */
  coins: [number, number];
}

function result(season: Season, a: XpEvent[], b: XpEvent[]): SeasonResult {
  const points: [number, number] = [seasonPoints(a, season), seasonPoints(b, season)];
  const winner = points[0] === points[1] ? null : points[0] > points[1] ? 0 : 1;
  return { season, points, winner };
}

export function computeSeasons(a: XpEvent[], b: XpEvent[], now: Date = new Date()): SeasonState {
  const current = result(seasonOf(now), a, b);
  const first = Math.min(now.getTime(), ...a.map((e) => e.at), ...b.map((e) => e.at));
  const past: SeasonResult[] = [];
  for (let s = seasonOf(new Date(first)); s.start < current.season.start; s = seasonOf(s.end)) {
    const r = result(s, a, b);
    if (r.points[0] + r.points[1] > 0) past.unshift(r);
  }
  const coins: [number, number] = [0, 0];
  for (const r of [current, ...past]) {
    for (const i of [0, 1] as const) coins[i] += tierCoins(r.points[i]);
  }
  for (const r of past) if (r.winner !== null) coins[r.winner] += SEASON_WIN_COINS;
  const daysLeft = Math.max(0, Math.ceil((current.season.end.getTime() - now.getTime()) / 86400000));
  return { current, daysLeft, past, coins };
}
