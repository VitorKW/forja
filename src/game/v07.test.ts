import { describe, expect, it } from 'vitest';
import { compactDiet, dietHabits, mergeHabits, proteinFor, totals, type DietEntry } from './diet';
import { JOINT, jointWorkouts } from './duo';
import { computeRecap, monthLabel, shiftMonth } from './recap';
import { computeSeasons, SEASON_TIERS, SEASON_WIN_COINS, seasonOf, tierCoins } from './season';
import type { SetEntry, Workout } from './types';

let seq = 0;
const entry = (p: number, agua = 0, kcal = 0): DietEntry => ({ id: `d${seq++}`, at: '2026-11-09T12:00:00Z', label: 'x', proteina: p, kcal, agua });
const w = (start: string, minutes = 60, sets: SetEntry[] = [0, 1, 2].map(() => s('supino', 40, 10))): Workout => ({
  id: `w${seq++}`,
  startedAt: new Date(start).toISOString(),
  finishedAt: new Date(new Date(start).getTime() + minutes * 60000).toISOString(),
  deload: false,
  sets,
});
const s = (exerciseId: string, weight: number, reps: number): SetEntry => ({ id: `s${seq++}`, exerciseId, weight, reps, rir: 2, warmup: false });

describe('dieta', () => {
  it('soma o dia e marca as missões quando bate a meta', () => {
    const log = { '2026-11-09': [entry(60, 1000), entry(70, 1000)], '2026-11-10': [entry(30, 500)] };
    expect(totals(log['2026-11-09'])).toEqual({ proteina: 130, kcal: 0, agua: 2000 });
    const h = dietHabits(log, { proteina: 120, kcal: 0, agua: 2000 });
    expect(h).toEqual({ '2026-11-09': ['proteina', 'agua'] });
    expect(mergeHabits({ '2026-11-09': ['sono', 'agua'] }, h)['2026-11-09'].sort()).toEqual(['agua', 'proteina', 'sono']);
  });

  it('meta de proteína pelo peso e compactação de dias antigos', () => {
    expect(proteinFor(70)).toBe(125);
    const log = { '2026-08-01': [entry(50), entry(40)], '2026-11-09': [entry(10), entry(20)] };
    const c = compactDiet(log, '2026-11-09');
    expect(c['2026-08-01']).toHaveLength(1);
    expect(c['2026-08-01'][0].proteina).toBe(90);
    expect(c['2026-11-09']).toHaveLength(2);
  });
});

describe('treino junto', () => {
  it('pareia treinos que começaram com até 2 horas de diferença, um por um', () => {
    const a = [w('2026-11-09T18:00:00'), w('2026-11-10T07:00:00')];
    const b = [w('2026-11-09T19:30:00'), w('2026-11-09T18:10:00'), w('2026-11-10T12:00:00')];
    const pairs = jointWorkouts(a, b);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].a).toBe(a[0].id);
    expect(pairs[0].b).toBe(b[1].id); // o mais próximo
    expect(JOINT.xp).toBeGreaterThan(0);
  });
});

describe('temporadas', () => {
  it('trimestres, marcos e troféu só para temporada encerrada', () => {
    expect(seasonOf(new Date('2026-11-09T12:00:00')).name).toBe('Ouro 2026');
    expect(seasonOf(new Date('2026-02-01T12:00:00')).key).toBe('2026-T1');
    const at = (iso: string) => new Date(iso).getTime();
    const a = [{ at: at('2026-08-10T12:00:00'), xp: 5000 }, { at: at('2026-11-02T12:00:00'), xp: 1600 }];
    const b = [{ at: at('2026-08-11T12:00:00'), xp: 3000 }];
    const st = computeSeasons(a, b, new Date('2026-11-09T12:00:00'));
    expect(st.current.points).toEqual([1600, 0]);
    expect(st.past).toHaveLength(1);
    expect(st.past[0].winner).toBe(0);
    expect(st.coins[0]).toBe(tierCoins(5000) + tierCoins(1600) + SEASON_WIN_COINS);
    expect(st.coins[1]).toBe(tierCoins(3000));
    expect(tierCoins(SEASON_TIERS[0].xp)).toBe(SEASON_TIERS[0].coins);
  });
});

describe('retrospectiva', () => {
  it('conta o mês e acha recordes comparando com antes', () => {
    const ws = [
      w('2026-09-20T10:00:00', 60, [s('supino', 80, 5)]),
      w('2026-10-05T10:00:00', 60, [s('supino', 90, 5), s('supino', 85, 5)]),
      w('2026-10-12T10:00:00', 60, [s('agachamento', 100, 5)]),
      w('2026-11-01T10:00:00', 60, [s('supino', 100, 5)]),
    ];
    const r = computeRecap('2026-10', { workouts: ws, xpEvents: [{ at: new Date('2026-10-05T12:00:00').getTime(), xp: 300 }], habits: { '2026-10-03': ['agua', 'sono', 'proteina'] }, cheers: [], joint: [] });
    expect(r.workouts).toBe(2);
    expect(r.strengthSets).toBe(3);
    expect(r.volume).toBe(90 * 5 + 85 * 5 + 100 * 5);
    expect(r.records.map((x) => x.exerciseId)).toEqual(['supino']); // agachamento não tinha marca antes
    expect(r.xp).toBe(300);
    expect(r.fullMissionDays).toBe(1);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthLabel('2026-10')).toBe('outubro de 2026');
  });
});
