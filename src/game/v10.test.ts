import { describe, expect, it } from 'vitest';
import { platesFor, warmupFor } from './gym';
import { computeProgress, freezeOffer, FREEZE } from './rules';
import { coinsSpent } from './shop';
import { duoAchievements } from './duoAchievements';
import { kcalGoalFor, totals } from './diet';
import { dietCsv, workoutsCsv } from './csv';
import { weeklyFor, type Status } from '../../push/src/reminder';
import type { SetEntry, Settings, Workout } from './types';

const settings: Settings = { weeklyGoal: 2, unit: 'kg' };
let seq = 0;
const trio = (): SetEntry[] => [0, 1, 2].map(() => ({ id: `s${seq++}`, exerciseId: 'supino', weight: 60, reps: 8, rir: 2, warmup: false }));
const w = (date: string): Workout => ({ id: `w${seq++}`, startedAt: `${date}T10:00:00`, finishedAt: `${date}T11:00:00`, deload: false, sets: trio() });

describe('anilhas e aquecimento', () => {
  it('anilhas por lado, da maior para a menor', () => {
    expect(platesFor(100)).toEqual({ perSide: [25, 15], left: 0 });
    expect(platesFor(82.5)).toEqual({ perSide: [25, 5, 1.25], left: 0 });
    expect(platesFor(20)).toEqual({ perSide: [], left: 0 });
    expect(platesFor(61, 20)).toEqual({ perSide: [20], left: 1 });
    expect(platesFor(60, 15)).toEqual({ perSide: [20, 2.5], left: 0 });
  });

  it('aquecimento progressivo até a carga de trabalho', () => {
    expect(warmupFor(100, true)).toEqual([
      { weight: 20, reps: 10 },
      { weight: 40, reps: 8 },
      { weight: 60, reps: 5 },
      { weight: 80, reps: 3 },
    ]);
    expect(warmupFor(40, true)).toEqual([{ weight: 20, reps: 10 }, { weight: 30, reps: 4 }]); // 50% = 20 já é a barra
    expect(warmupFor(25, true)).toEqual([]);
    expect(warmupFor(120, false)[0]).toEqual({ weight: 47.5, reps: 8 });
  });
});

describe('congelar a sequência', () => {
  // Semanas: 19/10, 26/10 cumpridas; 02/11 falhou; hoje é 11/11 (semana de 09/11).
  const ws = ['2026-10-19', '2026-10-21', '2026-10-26', '2026-10-28', '2026-11-02'].map(w);
  const now = new Date('2026-11-11T12:00:00');

  it('oferece congelar a semana passada quando ela derrubou a constância', () => {
    const o = freezeOffer(ws, settings, [], now)!;
    expect(o.week).toBe('2026-11-02');
    expect(o.streakIfFrozen).toBe(2);
    expect(o.streakNow).toBe(1);
  });

  it('semana congelada mantém a constância, custa moedas e só vale a cada 4 semanas', () => {
    expect(computeProgress(ws, settings, now, [], ['2026-11-02']).streak).toBe(2);
    expect(freezeOffer(ws, settings, ['2026-11-02'], now)).toBeNull();
    expect(freezeOffer(ws, settings, ['2026-10-12'], now)).toBeNull(); // 3 semanas antes
    expect(coinsSpent(['rubi'], 2)).toBe(150 + 2 * FREEZE.cost);
  });
});

describe('conquistas do casal', () => {
  it('liberam pelos números da dupla', () => {
    const base = { joint: 0, bestCoupleStreak: 0, coupleWeeksTotal: 0, raidsWon: 0, km: 0 };
    expect(duoAchievements(base)).toEqual([]);
    expect(duoAchievements({ ...base, joint: 10, bestCoupleStreak: 4, km: 120 })).toEqual(['lado-a-lado', 'parceria', 'mes-redondo', 'cem-km']);
  });
});

describe('dieta: macros e dia sem treino', () => {
  it('soma carboidrato e gordura e usa a meta de descanso', () => {
    const t = totals([
      { id: 'a', at: '', label: 'x', proteina: 10, kcal: 100, agua: 0, carbs: 12.25, fat: 3 },
      { id: 'b', at: '', label: 'y', proteina: 5, kcal: 50, agua: 0 },
    ]);
    expect(t).toMatchObject({ carbs: 12.3, fat: 3 });
    const g = { proteina: 120, kcal: 2500, agua: 2000, kcalRest: 2100 };
    expect(kcalGoalFor(g, true)).toBe(2500);
    expect(kcalGoalFor(g, false)).toBe(2100);
    expect(kcalGoalFor({ ...g, kcalRest: undefined }, false)).toBe(2500);
  });
});

describe('planilhas', () => {
  it('uma linha por série e por alimento, no padrão brasileiro', () => {
    const csv = workoutsCsv([{ name: 'Vitor', workouts: [w('2026-11-09')] }]).split('\r\n');
    expect(csv).toHaveLength(4);
    expect(csv[1]).toBe('Vitor;09/11/2026;10:00;60;Supino reto;força;60;8;2;não;;não');
    const d = dietCsv([{ name: 'Emanuela', workouts: [], dietLog: { '2026-11-09': [{ id: 'a', at: '2026-11-09T12:30:00', label: 'Arroz; feijão', proteina: 7.5, kcal: 191, agua: 0 }] } }]);
    expect(d.split('\r\n')[1]).toBe('Emanuela;09/11/2026;12:30;"Arroz; feijão";7,5;191;;;0');
  });
});

describe('resumo de domingo', () => {
  const st: Status = {
    name: 'Vitor',
    day: '2026-11-15',
    week: '2026-11-09',
    tz: 180,
    trained: false,
    habitsLeft: 0,
    weekLeft: 1,
    weekly: { days: 2, goal: 3, partner: 'Emanuela', partnerDays: 3, partnerGoal: 3, raidLeft: 20, boss: 'Colosso', challenge: 'Mais km', unit: 'km', mine: 12.5, theirs: 9 },
  };
  it('só no domingo, com o placar e o aviso do último dia', () => {
    const sunday = Date.parse('2026-11-15T23:00:00Z'); // 20h em Brasília
    const m = weeklyFor(st, sunday)!;
    expect(m.title).toContain('Resumo da semana');
    expect(m.body).toContain('Você 2/3 dias, Emanuela 3/3');
    expect(m.body).toContain('Colosso ainda com 20% de vida');
    expect(m.body).toContain('você 12,5 × 9 km');
    expect(m.body).toContain('último dia');
    expect(weeklyFor(st, Date.parse('2026-11-14T23:00:00Z'))).toBeNull();
    expect(weeklyFor({ ...st, weekly: undefined }, sunday)).toBeNull();
  });
});
