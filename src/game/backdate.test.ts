import { describe, expect, it } from 'vitest';
import { backdateDays, backdatedTimes, backdateLabel, finishedVersion } from './backdate';
import { computeProgress, dayKey } from './rules';
import type { Workout } from './types';

const now = new Date(2026, 10, 10, 9, 30); // ter 10/11, 9h30

describe('treino de outro dia', () => {
  it('lista ontem, anteontem e mais 5 dias', () => {
    const d = backdateDays(now);
    expect(d).toHaveLength(7);
    expect(d[0]).toEqual({ day: '2026-11-09', label: 'Ontem' });
    expect(d[1].label).toBe('Anteontem');
    expect(backdateLabel('2026-11-09', now)).toBe('ontem');
    expect(backdateLabel('2026-11-05', now)).toBe('05/11');
  });

  it('cai no dia escolhido, com a duração informada', () => {
    const t = backdatedTimes({ day: '2026-11-09', minutes: 50 }, now);
    expect(dayKey(new Date(t.finishedAt))).toBe('2026-11-09');
    expect(new Date(t.finishedAt).getTime() - new Date(t.startedAt).getTime()).toBe(50 * 60000);
  });

  it('madrugada vira 6h, noite vira 22h, para não escapar do dia', () => {
    const late = backdatedTimes({ day: '2026-11-09', minutes: 60 }, new Date(2026, 10, 10, 23, 50));
    expect(new Date(late.finishedAt).getHours()).toBe(22);
    const early = backdatedTimes({ day: '2026-11-09', minutes: 60 }, new Date(2026, 10, 10, 2, 0));
    expect(dayKey(new Date(early.startedAt))).toBe('2026-11-09');
  });

  it('o treino salvo não leva o campo backdate e conta no dia certo', () => {
    const active: Workout = {
      id: 'x',
      startedAt: now.toISOString(),
      finishedAt: null,
      deload: false,
      backdate: { day: '2026-11-09', minutes: 45 },
      sets: [1, 2, 3].map((i) => ({ id: `s${i}`, exerciseId: 'supino', weight: 40, reps: 10, rir: 2, warmup: false })),
    };
    const done = finishedVersion(active, now);
    expect(done.backdate).toBeUndefined();
    expect(dayKey(new Date(done.finishedAt!))).toBe('2026-11-09');
    const p = computeProgress([done], { weeklyGoal: 3, unit: 'kg' } as never);
    expect(p.results.x.xpTotal).toBeGreaterThan(0);
  });
});
