import { describe, expect, it } from 'vitest';
import { buildProgram, loadTarget, programToday, rirFor, splitFor, type ProgramConfig } from './program';
import { activeMissions, fullHabitDays, habitEvents } from './extras';
import { computeProgress, weekKey } from './rules';
import { demoProfiles } from '../demo';
import type { Workout } from './types';

describe('programa periodizado', () => {
  it('divisão segue a frequência', () => {
    expect(splitFor(3).map((s) => s.name)).toEqual(['Full body A', 'Full body B', 'Full body C']);
    expect(splitFor(4)).toHaveLength(4);
    expect(splitFor(6)).toHaveLength(6);
  });

  it('RIR cai ao longo do bloco e o deload alivia', () => {
    expect([1, 2, 3, 4, 5, 6].map((w) => rirFor(w, 6))).toEqual([3, 3, 2, 2, 1, 4]);
    const plan = buildProgram({ goal: 'hipertrofia', days: 4, weeks: 6 });
    const sets = (w: number) => plan[w - 1].sessions[0].slots[0].sets;
    expect(plan.map((w) => w.phase)).toEqual(['Adaptação', 'Adaptação', 'Acumulação', 'Acumulação', 'Intensificação', 'Deload']);
    expect(sets(1)).toBe(3);
    expect(sets(4)).toBe(4); // +1 série na segunda metade
    expect(sets(6)).toBe(2); // deload: metade
    expect(plan[5].sessions[0].slots[0].rir).toBe(4);
  });

  it('força: reps dos principais caem por fase; condicionamento tem cardio', () => {
    const f = buildProgram({ goal: 'forca', days: 3, weeks: 8 });
    expect(f[0].sessions[0].slots[0].reps).toEqual([5, 6]);
    expect(f[6].sessions[0].slots[0].reps).toEqual([2, 4]);
    const c = buildProgram({ goal: 'condicionamento', days: 2, weeks: 6 });
    expect(c[0].sessions[0].slots.at(-1)?.role).toBe('cardio');
  });

  it('sessão do dia e semana cumprida', () => {
    const cfg: ProgramConfig = { id: 'p', goal: 'hipertrofia', days: 2, weeks: 6, startWeek: weekKey(new Date()) };
    expect(programToday(cfg, []).next).toBe(0);
    const w: Workout = { id: 'a', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), deload: false, sets: [], plan: { program: 'p', week: 1, session: 0 } };
    expect(programToday(cfg, [w]).next).toBe(1);
    expect(programToday(cfg, [w, { ...w, id: 'b', plan: { program: 'p', week: 1, session: 1 } }]).next).toBeNull();
    expect(programToday({ ...cfg, startWeek: '2020-01-06' }, []).finished).toBe(true);
  });

  it('carga do dia: dupla progressão', () => {
    const slot = { exerciseId: 'supino', role: 'principal' as const, sets: 3, reps: [6, 10] as [number, number], rir: 2, rest: 120 };
    const mk = (reps: number, rir = 2): Workout => ({
      id: 'x', startedAt: '2026-11-01T10:00:00Z', finishedAt: '2026-11-01T11:00:00Z', deload: false,
      sets: [0, 1, 2].map((i) => ({ id: `s${i}`, exerciseId: 'supino', weight: 50, reps, rir, warmup: false })),
    });
    expect(loadTarget([mk(10)], slot, false)).toMatchObject({ weight: 52.5, reps: 6 });
    expect(loadTarget([mk(8)], slot, false)).toMatchObject({ weight: 50, reps: 9 });
    expect(loadTarget([mk(10)], slot, true)).toMatchObject({ weight: 45 });
    expect(loadTarget([mk(10)], { ...slot, exerciseId: 'agachamento' }, false).weight).toBeNull();
    const squat = { ...mk(10), sets: mk(10).sets.map((s) => ({ ...s, exerciseId: 'agachamento' })) };
    expect(loadTarget([squat], { ...slot, exerciseId: 'agachamento' }, false).weight).toBe(55);
  });
});

describe('missões personalizáveis', () => {
  it('ativas: padrão, catálogo e criadas', () => {
    expect(activeMissions().map((m) => m.id)).toEqual(['proteina', 'agua', 'sono']);
    const m = activeMissions({ active: ['passos', 'c-1', 'sumiu'], custom: [{ id: 'c-1', label: 'Fiz 20 flexões' }] });
    expect(m.map((x) => x.label)).toEqual(['Andei 8 mil passos', 'Fiz 20 flexões']);
  });
  it('XP por missão (máx. 5 por dia) e dia completo com 3', () => {
    const log = { '2026-11-01': ['a', 'b', 'c', 'd', 'e', 'f'], '2026-11-02': ['a', 'b'], '2026-11-03': ['a', 'a', 'b', 'c'] };
    expect(habitEvents(log).map((e) => e.xp)).toEqual([50, 20, 30]);
    expect(fullHabitDays(log)).toBe(2);
  });
});

describe('modo demonstração', () => {
  it('gera dois perfis com treinos válidos e programa em andamento', () => {
    const [a, b] = demoProfiles();
    expect(a.workouts.length).toBeGreaterThan(15);
    expect(b.workouts.length).toBeGreaterThan(10);
    expect(a.workouts.every((w) => w.finishedAt && new Date(w.finishedAt) < new Date())).toBe(true);
    const p = computeProgress(a.workouts, a.settings);
    expect(p.level.level).toBeGreaterThan(1);
    expect(programToday(a.program!, a.workouts).week).toBe(6);
    // Mesma semente: sempre iguais.
    expect(demoProfiles()[0].workouts.length).toBe(a.workouts.length);
  });
});
