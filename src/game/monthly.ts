/**
 * Desafio do mês: um chefe especial com muita vida e um escudo. O XP dos dois tira vida,
 * mas o escudo só cai quando CADA um fizer os treinos do mês (meta semanal × 3).
 * Calculado do histórico, como o resto.
 */
import { countsAsWorkout } from './rules';
import type { DuoPlayer } from './duo';

export const MONTH = { baseHp: 5000, growth: 0.1, maxGrowthSteps: 10, coins: 100, weeksForShield: 3 } as const;

export const MONTH_BOSSES = [
  { name: 'Rei da Fornalha', epithet: 'aparece uma vez por mês' },
  { name: 'Titã de Bigorna', epithet: 'só racha com as duas forjas acesas' },
  { name: 'Serpente de Brasa', epithet: 'troca de pele no fim do mês' },
  { name: 'Golem Ancestral', epithet: 'dorme 29 dias e acorda faminto' },
] as const;

export const monthHp = (wonBefore: number) => Math.round(MONTH.baseHp * (1 + MONTH.growth * Math.min(wonBefore, MONTH.maxGrowthSteps)));
export const shieldNeed = (weeklyGoal: number) => weeklyGoal * MONTH.weeksForShield;

const monthOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};
const bossOf = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return MONTH_BOSSES[(y * 12 + mo) % MONTH_BOSSES.length];
};

export interface MonthState {
  month: string; // AAAA-MM
  boss: (typeof MONTH_BOSSES)[number];
  hp: number;
  damage: [number, number];
  workouts: [number, number];
  need: [number, number];
  shieldDown: boolean;
  defeated: boolean;
  /** Meses vencidos, contando o atual se já caiu. */
  won: number;
  daysLeft: number;
}

export function computeMonthly(a: DuoPlayer, b: DuoPlayer, now: Date = new Date()): MonthState {
  const players = [a, b];
  const by = players.map((p) => {
    const m = new Map<string, { xp: number; n: number }>();
    for (const w of p.workouts) {
      if (!w.finishedAt) continue;
      const k = monthOf(w.finishedAt);
      const cur = m.get(k) ?? { xp: 0, n: 0 };
      m.set(k, { xp: cur.xp + p.xpOf(w.id), n: cur.n + (countsAsWorkout(w) ? 1 : 0) });
    }
    return m;
  });
  const need: [number, number] = [shieldNeed(a.weeklyGoal), shieldNeed(b.weeklyGoal)];
  const stat = (k: string) => {
    const d = by.map((m) => m.get(k) ?? { xp: 0, n: 0 });
    return { damage: [d[0].xp, d[1].xp] as [number, number], workouts: [d[0].n, d[1].n] as [number, number] };
  };
  const beaten = (k: string, hp: number) => {
    const s = stat(k);
    return s.damage[0] + s.damage[1] >= hp && s.workouts[0] >= need[0] && s.workouts[1] >= need[1];
  };

  const current = monthOf(now.toISOString());
  const months = [...by[0].keys(), ...by[1].keys()].filter((k) => k < current).sort();
  let won = 0;
  if (months.length) for (let k = months[0]; k < current; k = nextMonth(k)) if (beaten(k, monthHp(won))) won++;

  const hp = monthHp(won);
  const s = stat(current);
  const shieldDown = s.workouts[0] >= need[0] && s.workouts[1] >= need[1];
  const defeated = beaten(current, hp);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    month: current,
    boss: bossOf(current),
    hp,
    ...s,
    need,
    shieldDown,
    defeated,
    won: won + (defeated ? 1 : 0),
    daysLeft: Math.ceil((end.getTime() - now.getTime()) / 86400000),
  };
}
