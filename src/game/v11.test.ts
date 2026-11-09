import { beforeEach, describe, expect, it } from 'vitest';
import { bestSetOf, weightTrend } from './evolution';
import { CHANGELOG, markSeen, unseen } from './changelog';
import { prescription } from './program';
import type { Workout } from './types';

describe('peso com tendência', () => {
  it('média dos 7 dias até cada pesagem e variação em 4 semanas', () => {
    const t = weightTrend([
      { day: '2026-10-01', kg: 80 },
      { day: '2026-10-03', kg: 81 },
      { day: '2026-10-05', kg: 79.5 },
      { day: '2026-11-02', kg: 78 },
      { day: '2026-11-04', kg: 79 },
    ]);
    expect(t.avg).toEqual([80, 80.5, 80.2, 78, 78.5]);
    expect(t.now).toBe(78.5);
    expect(t.delta).toBe(-1.7); // contra 05/10 (80,2), 30 dias antes
    expect(t.days).toBe(30);
  });

  it('sem 4 semanas de registros não inventa variação', () => {
    const t = weightTrend([{ day: '2026-11-01', kg: 70 }, { day: '2026-11-08', kg: 69 }]);
    expect(t.delta).toBeNull();
    expect(weightTrend([]).now).toBeNull();
  });
});

describe('melhor série', () => {
  it('maior 1RM estimado, ignora aquecimento e treino em andamento', () => {
    const w = (day: string, sets: [number, number, boolean?][], done = true): Workout => ({
      id: day,
      startedAt: `${day}T10:00:00`,
      finishedAt: done ? `${day}T11:00:00` : null,
      deload: false,
      sets: sets.map(([weight, reps, warmup], k) => ({ id: `${day}${k}`, exerciseId: 'supino', weight, reps, rir: 2, warmup: !!warmup })),
    });
    const r = bestSetOf([w('2026-11-01', [[60, 10], [70, 5]]), w('2026-11-05', [[100, 3, true], [72.5, 6]]), w('2026-11-08', [[90, 8]], false)], 'supino')!;
    expect(r.best).toEqual({ weight: 72.5, reps: 6, day: '2026-11-05', oneRM: 87 });
    expect(r.heaviest).toBe(72.5);
    expect(bestSetOf([], 'supino')).toBeNull();
  });
});

describe('prancha na prescrição', () => {
  it('mostra segundos', () => {
    expect(prescription({ exerciseId: 'prancha', role: 'acessorio', sets: 3, reps: [3, 6], rir: 2, rest: 60 })).toBe('3 × 30–60 s');
  });
});

describe('novidades', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    globalThis.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as Storage;
  });
  it('mostra o que não foi visto e some depois de ver', () => {
    expect(unseen(0).length).toBe(CHANGELOG.length);
    expect(unseen(CHANGELOG[1].version).map((r) => r.version)).toEqual([CHANGELOG[0].version]);
    markSeen();
    expect(unseen()).toEqual([]);
  });
});
