import { describe, expect, it } from 'vitest';
import { cycleInfo, cycleLength, easeOff, lastTop, recoveryAdvice, weekSleepNote } from './wellness';
import { computeMonthly, monthHp, MONTH } from './monthly';
import { redemptionFeed, rewardCatalog } from './rewards';
import { addMeasures, measureSeries } from './evolution';
import { coinsEarned, coinsSpent } from './shop';
import type { SetEntry, Workout } from './types';

let seq = 0;
const trio = (weight = 60): SetEntry[] => [0, 1, 2].map(() => ({ id: `s${seq++}`, exerciseId: 'supino', weight, reps: 8, rir: 2, warmup: false }));
const w = (date: string, weight = 60): Workout => ({ id: `w${seq++}`, startedAt: `${date}T10:00:00`, finishedAt: `${date}T11:00:00`, deload: false, sets: trio(weight) });

describe('sono e disposição', () => {
  it('dia ruim pede treino leve; 3 de 5 dias ruins pedem calma na semana', () => {
    expect(recoveryAdvice({ '2026-11-09': { sleep: 1, energy: 1 } }, '2026-11-09')?.level).toBe('leve');
    expect(recoveryAdvice({ '2026-11-09': { sleep: 1, energy: 3 } }, '2026-11-09')).toBeNull();
    const bad = { sleep: 1, energy: 2 } as const;
    expect(recoveryAdvice({ '2026-11-05': bad, '2026-11-07': bad, '2026-11-08': { sleep: 1, energy: 1 }, '2026-11-09': { sleep: 3, energy: 3 } }, '2026-11-09')?.level).toBe('pesada');
    expect(recoveryAdvice({}, '2026-11-09')).toBeNull();
  });

  it('resumo de domingo: noites boas e XP depois delas', () => {
    const log = { '2026-11-09': { sleep: 3 }, '2026-11-10': { sleep: 1 }, '2026-11-11': { sleep: 3 } } as const;
    const ws = [w('2026-11-09'), w('2026-11-10'), w('2026-11-11')];
    const xp = (id: string) => (id === ws[1].id ? 100 : 150);
    expect(weekSleepNote(log, ws, xp, '2026-11-09')).toBe('Dormiu bem 2 de 3 noites. Treinos depois de noite boa: +50% de XP.');
    expect(weekSleepNote({ '2026-11-09': { sleep: 3 } }, ws, xp, '2026-11-09')).toBeNull();
  });
});

describe('ciclo', () => {
  const cfg = { on: true, starts: ['2026-09-01', '2026-09-30', '2026-10-30'] };
  it('duração média e fase do dia', () => {
    expect(cycleLength(cfg.starts)).toBe(30); // 29 e 30 → 29,5 → 30
    expect(cycleInfo(cfg, '2026-11-01')).toMatchObject({ day: 3, phase: 'menstrual', easy: true });
    expect(cycleInfo(cfg, '2026-11-08')).toMatchObject({ day: 10, phase: 'folicular', easy: false });
    expect(cycleInfo(cfg, '2026-11-15')?.phase).toBe('ovulatoria'); // dia 17 (30 − 13)
    expect(cycleInfo(cfg, '2026-11-20')?.phase).toBe('lutea');
    expect(cycleInfo(cfg, '2026-11-27')).toMatchObject({ day: 29, phase: 'pre', easy: true });
    expect(cycleInfo(cfg, '2026-12-08')?.phase).toBe('atrasado');
    expect(cycleInfo({ ...cfg, on: false }, '2026-11-01')).toBeNull();
  });
});

describe('sugestão de carga com calma', () => {
  it('não sobe a carga quando há motivo, e não mexe quando não sobe', () => {
    const ws = [w('2026-11-01', 60), w('2026-11-05', 62.5)];
    expect(lastTop(ws, 'supino')).toBe(62.5);
    expect(easeOff({ weight: 65, reps: 6, note: 'x' }, 62.5, 'Dormiu mal.')).toEqual({ weight: 62.5, reps: 6, note: 'Dormiu mal. Mantenha 62,5.' });
    expect(easeOff({ weight: 62.5, reps: 9, note: 'x' }, 62.5, 'Dormiu mal.')?.weight).toBe(62.5);
    expect(easeOff({ weight: 65, reps: 6, note: 'x' }, 62.5, null)?.weight).toBe(65);
  });
});

describe('chefe do mês', () => {
  const player = (ws: Workout[], goal = 2) => ({ name: 'x', workouts: ws, xpOf: () => 500, weeklyGoal: goal });
  const month = (m: string, n: number) => Array.from({ length: n }, (_, k) => w(`${m}-${String(k + 1).padStart(2, '0')}`));

  it('vida e escudo: precisa do XP somado e da meta × 3 de cada um', () => {
    const now = new Date('2026-11-20T12:00:00');
    // 6 treinos cada × 500 XP = 6000 ≥ 5000, escudo 6/6 → cai
    const m = computeMonthly(player(month('2026-11', 6)), player(month('2026-11', 6)), now);
    expect(m).toMatchObject({ hp: 5000, shieldDown: true, defeated: true, won: 1, need: [6, 6] });
    // XP de sobra, mas um só fez 5: o escudo segura
    const s = computeMonthly(player(month('2026-11', 12)), player(month('2026-11', 5)), now);
    expect(s).toMatchObject({ shieldDown: false, defeated: false, won: 0 });
  });

  it('meses vencidos deixam o próximo mais forte e valem moedas', () => {
    const now = new Date('2026-11-05T12:00:00');
    const m = computeMonthly(player(month('2026-10', 6)), player(month('2026-10', 6)), now);
    expect(m.won).toBe(1);
    expect(m.hp).toBe(monthHp(1));
    expect(coinsEarned({ bossesDefeated: 0, achievements: 0, fullHabitDays: 0, duo: null, monthsWon: 2 })).toBe(2 * MONTH.coins);
  });
});

describe('recompensas do casal', () => {
  it('lista dos dois sem as apagadas; resgate gasta moedas', () => {
    const a = [{ id: '1', name: 'Cinema', cost: 500, createdAt: '' }, { id: '2', name: 'Pizza', cost: 300, createdAt: '', deleted: true }];
    const b = [{ id: '3', name: 'Massagem', cost: 400, createdAt: '' }];
    expect(rewardCatalog(a, b).map((r) => r.name)).toEqual(['Massagem', 'Cinema']);
    const feed = redemptionFeed([{ name: 'Vitor', redeemed: [{ id: 'r1', rewardId: '1', name: 'Cinema', cost: 500, at: '2026-11-02' }] }, { name: 'Emanuela', redeemed: [{ id: 'r2', rewardId: '3', name: 'Massagem', cost: 400, at: '2026-11-05' }] }]);
    expect(feed.map((r) => r.by)).toEqual(['Emanuela', 'Vitor']);
    expect(coinsSpent([], 0, [{ cost: 500 }, { cost: 400 }])).toBe(900);
  });
});

describe('medidas', () => {
  it('junta por dia, ignora valores absurdos e mostra a mudança', () => {
    let l = addMeasures([], '2026-10-01', { cintura: 84, braco: 5 });
    l = addMeasures(l, '2026-10-01', { quadril: 98 });
    l = addMeasures(l, '2026-11-01', { cintura: 81.5 });
    expect(l).toEqual([{ day: '2026-10-01', cm: { cintura: 84, quadril: 98 } }, { day: '2026-11-01', cm: { cintura: 81.5 } }]);
    expect(measureSeries(l, 'cintura')).toMatchObject({ change: -2.5, since: '2026-10-01' });
    expect(measureSeries(l, 'quadril').change).toBeNull();
  });
});
