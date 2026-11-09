import { describe, expect, it } from 'vitest';
import { challengeFor, challengeValue, computeDuo, raidHp, RAID, type DuoPlayer } from './duo';
import { CHEER_XP, cheerEvents, fullHabitDays, HABIT_XP, habitEvents } from './extras';
import { computeProgress, suggestLoad } from './rules';
import { canBuy, coinsEarned, coinsSpent, ITEM_BY_ID } from './shop';
import type { SetEntry, Settings, Workout } from './types';

const settings: Settings = { weeklyGoal: 3, unit: 'kg' };
let seq = 0;
const set = (exerciseId: string, weight: number, reps: number, rir: number | null = 2, extra: Partial<SetEntry> = {}): SetEntry => ({
  id: `s${seq++}`,
  exerciseId,
  weight,
  reps,
  rir,
  warmup: false,
  ...extra,
});
const workout = (date: string, sets: SetEntry[], deload = false): Workout => ({ id: `w${seq++}`, startedAt: date, finishedAt: date, deload, sets });
const player = (name: string, workouts: Workout[], xp = 100): DuoPlayer => ({ name, workouts, xpOf: () => xp, weeklyGoal: 3 });

const NOW = new Date('2026-11-11T12:00:00'); // quarta-feira; semana começa em 09/11

describe('missões e incentivos', () => {
  it('cada missão vale XP no dia (inclusive as criadas pela pessoa)', () => {
    const ev = habitEvents({ '2026-11-09': ['agua', 'sono'], '2026-11-10': ['c-flexoes'] });
    expect(ev).toHaveLength(2);
    expect(ev[0].xp).toBe(2 * HABIT_XP);
    expect(ev[1].xp).toBe(HABIT_XP);
    expect(fullHabitDays({ '2026-11-09': ['agua', 'sono', 'proteina'], '2026-11-10': ['agua'] })).toBe(1);
  });

  it('só o primeiro incentivo de cada treino dá XP', () => {
    const c = (id: string, workoutId: string, at: string) => ({ id, workoutId, kind: 'fogo' as const, from: 'Emanuela', at });
    const ev = cheerEvents([c('a', 'w1', '2026-11-09T10:00:00Z'), c('b', 'w1', '2026-11-09T11:00:00Z'), c('c', 'w2', '2026-11-09T12:00:00Z')]);
    expect(ev).toHaveLength(2);
    expect(ev.every((e) => e.xp === CHEER_XP)).toBe(true);
  });

  it('XP extra entra no nível e no dano do chefe', () => {
    const base = computeProgress([], settings, NOW);
    const withExtras = computeProgress([], settings, NOW, habitEvents({ '2026-11-09': ['agua', 'sono', 'proteina'] }));
    expect(withExtras.totalXp - base.totalXp).toBe(3 * HABIT_XP);
    expect(withExtras.bonusXp).toBe(3 * HABIT_XP);
    expect(withExtras.campaign.damage).toBe(3 * HABIT_XP);
  });

  it('XP extra anterior ao treino aparece no "antes" do resumo', () => {
    const w = workout('2026-11-10T18:00:00', [set('supino', 60, 10)]);
    const p = computeProgress([w], settings, NOW, [{ at: new Date('2026-11-10T08:00:00').getTime(), xp: 40 }]);
    expect(p.results[w.id].campaignBefore.damage).toBe(40);
  });
});

describe('dupla', () => {
  it('chefe da semana soma o dano dos dois', () => {
    const a = player('Vitor', [workout('2026-11-09T10:00:00', [])], 700);
    const b = player('Emanuela', [workout('2026-11-10T10:00:00', [])], 600);
    const d = computeDuo(a, b, NOW);
    expect(d.raid.hp).toBe(RAID.baseHp);
    expect(d.raid.damage).toEqual([700, 600]);
    expect(d.raid.defeated).toBe(true);
    expect(d.raidsWon).toBe(1);
  });

  it('cada vitória deixa o próximo chefe mais forte', () => {
    expect(raidHp(0)).toBe(1200);
    expect(raidHp(2)).toBe(1440);
    expect(raidHp(99)).toBe(raidHp(RAID.maxGrowthSteps));
  });

  it('conta semanas em que os dois cumpriram a meta', () => {
    const days = (week: string[]) => week.map((d) => workout(`${d}T10:00:00`, []));
    const a = player('Vitor', days(['2026-10-26', '2026-10-27', '2026-10-28', '2026-11-02', '2026-11-03', '2026-11-04']));
    const b = player('Emanuela', days(['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02', '2026-11-04', '2026-11-06']));
    const d = computeDuo(a, b, NOW);
    expect(d.coupleStreak).toBe(2);
    expect(d.coupleWeekDone).toBe(false);
  });

  it('o desafio da semana muda e mede a coisa certa', () => {
    expect(challengeFor('2026-11-09').id).not.toBe(challengeFor('2026-11-16').id);
    const ws = [
      workout('2026-11-09T10:00:00', [set('caminhada', 0, 60, null, { distance: 4 }), set('supino', 60, 10), set('supino', 40, 10, null, { warmup: true })]),
    ];
    expect(challengeValue('km', ws)).toBe(4);
    expect(challengeValue('minutos', ws)).toBe(60);
    expect(challengeValue('series', ws)).toBe(1);
    expect(challengeValue('treinos', ws)).toBe(1);
  });
});

describe('moedas e loja', () => {
  it('ganha por marcos e gasta com compras', () => {
    const earned = coinsEarned({ bossesDefeated: 2, achievements: 3, fullHabitDays: 4, duo: null });
    expect(earned).toBe(2 * 40 + 3 * 25 + 4 * 5);
    expect(coinsSpent(['rubi', 'gato'])).toBe(150 + 300);
  });

  it('capa da dupla só libera depois de uma raid', () => {
    const item = ITEM_BY_ID['dupla'];
    expect(canBuy(item, 999, [], 0)).toBe(false);
    expect(canBuy(item, 999, [], 1)).toBe(true);
    expect(canBuy(item, 999, ['dupla'], 1)).toBe(false);
    expect(canBuy(ITEM_BY_ID['dragao'], 100, [], 0)).toBe(false);
  });
});

describe('sugestão de carga', () => {
  it('sobe a carga quando sobrou fôlego e mantém quando foi no limite', () => {
    const easy = [workout('2026-11-05T10:00:00', [set('supino', 60, 12, 2), set('supino', 60, 12, 1)])];
    expect(suggestLoad(easy, 'supino')?.weight).toBe(62.5);
    const hard = [workout('2026-11-05T10:00:00', [set('supino', 60, 8, 1), set('supino', 60, 7, 0)])];
    expect(suggestLoad(hard, 'supino')).toMatchObject({ weight: 60, reps: 8 });
    expect(suggestLoad(hard, 'agachamento')).toBeNull();
  });
});
