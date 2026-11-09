import { describe, expect, it } from 'vitest';
import { clock, durationSec, partnerWorkoutOf, startedTogether, workoutStats } from './joint';
import { jointWorkouts } from './duo';
import type { SetEntry, Workout } from './types';

const set = (exerciseId: string, weight: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({
  id: Math.random().toString(36),
  exerciseId,
  weight,
  reps,
  rir: 2,
  warmup: false,
  ...extra,
});
const w = (id: string, start: string, end: string, sets: SetEntry[] = []): Workout => ({ id, startedAt: start, finishedAt: end, deload: false, sets });

describe('treino junto', () => {
  it('números do treino: séries, volume, cardio e km', () => {
    const st = workoutStats([
      set('supino', 60, 10),
      set('supino', 40, 10, { warmup: true }),
      set('agachamento', 80, 5),
      set('caminhada', 0, 40, { distance: 3.2 }),
      set('inexistente', 100, 100),
    ]);
    expect(st).toEqual({ sets: 2, volume: 600 + 400, km: 3.2, cardioMin: 40 });
  });

  it('relógio e duração', () => {
    expect(clock(65)).toBe('1:05');
    expect(clock(3725)).toBe('1:02:05');
    expect(durationSec('2026-11-09T10:00:00Z', '2026-11-09T11:12:30Z')).toBe(4350);
    expect(durationSec('2026-11-09T10:00:00Z', null, Date.parse('2026-11-09T10:01:00Z'))).toBe(60);
  });

  it('começaram juntos (até 2 h) e acha o treino do par', () => {
    expect(startedTogether('2026-11-09T10:00:00Z', '2026-11-09T11:30:00Z')).toBe(true);
    expect(startedTogether('2026-11-09T10:00:00Z', '2026-11-09T12:30:00Z')).toBe(false);
    const a = [w('a1', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z')];
    const b = [w('b1', '2026-11-09T10:10:00Z', '2026-11-09T11:20:00Z'), w('b2', '2026-11-05T10:00:00Z', '2026-11-05T11:00:00Z')];
    const joint = jointWorkouts(a, b);
    expect(partnerWorkoutOf('a1', 0, joint, b)?.id).toBe('b1');
    expect(partnerWorkoutOf('b1', 1, joint, a)?.id).toBe('a1');
    expect(partnerWorkoutOf('b2', 1, joint, a)).toBeUndefined();
  });
});
