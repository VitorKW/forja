import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';
import { targetText, templateFromDay, trainingDays } from './templates';
import type { SetEntry, Workout } from './types';

let n = 0;
const set = (exerciseId: string, weight: number, reps: number, warmup = false): SetEntry => ({ id: `s${n++}`, exerciseId, weight, reps, rir: 2, warmup });
const at = (d: number, h: number) => new Date(2026, 10, d, h).toISOString();
const workout = (id: string, d: number, h: number, sets: SetEntry[]): Workout => ({ id, startedAt: at(d, h), finishedAt: at(d, h + 1), deload: false, sets });

describe('ficha a partir de um dia', () => {
  const ws = [
    workout('manha', 9, 7, [set('supino', 20, 10, true), set('supino', 40, 10), set('supino', 42.5, 8), set('supino', 42.5, 8), set('rosca', 12, 12)]),
    workout('tarde', 9, 18, [set('caminhada', 0, 20), set('rosca', 12, 10), set('caminhada', 0, 15)]),
    workout('outro', 8, 18, [set('agachamento', 60, 8)]),
  ];

  it('junta os treinos do dia, sem aquecimento, na ordem', () => {
    const t = templateFromDay(ws, '2026-11-09')!;
    expect(t.exercises).toEqual(['supino', 'rosca', 'caminhada']);
    expect(t.targets!.supino).toEqual({ sets: 3, reps: 8, weight: 42.5 });
    expect(t.targets!.rosca).toEqual({ sets: 2, reps: 12, weight: 12 });
    expect(t.targets!.caminhada).toEqual({ sets: 1, reps: 35, weight: 0 });
  });

  it('lista os dias com treino, do mais novo ao mais velho', () => {
    expect(trainingDays(ws).map((d) => d.day)).toEqual(['2026-11-09', '2026-11-08']);
    expect(trainingDays(ws)[0].exercises).toBe(3);
    expect(templateFromDay(ws, '2026-11-01')).toBeNull();
  });

  it('texto da meta', () => {
    expect(targetText('supino', { sets: 3, reps: 8, weight: 42.5 }, 'kg')).toBe('3×8 · 42,5 kg');
    expect(targetText('prancha', { sets: 2, reps: 6, weight: 0 }, 'kg')).toBe('2×60 s');
    expect(targetText('caminhada', { sets: 1, reps: 35, weight: 0 }, 'kg')).toBe('35 min');
  });

  it('catálogo maior e sem ids repetidos', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });
});
