import { describe, expect, it } from 'vitest';
import {
  computeProgress,
  estimate1RM,
  isSuspiciousWeight,
  levelInfo,
  nextWeek,
  streakMultiplier,
  weekKey,
  xpToNext,
} from './rules';
import type { SetEntry, Settings, Workout } from './types';

const settings: Settings = { weeklyGoal: 3, unit: 'kg' };
let seq = 0;

function set(exerciseId: string, weight: number, reps: number, rir: number | null = 2, warmup = false): SetEntry {
  return { id: `s${seq++}`, exerciseId, weight, reps, rir, warmup };
}

function workout(date: string, sets: SetEntry[], deload = false): Workout {
  return { id: `w${seq++}`, startedAt: date, finishedAt: date, deload, sets };
}

const NOW = new Date('2026-11-09T12:00:00'); // segunda-feira

describe('níveis', () => {
  it('segue a tabela do GDD', () => {
    expect([1, 2, 3, 4, 5, 10].map(xpToNext)).toEqual([100, 283, 520, 800, 1118, 3162]);
  });

  it('converte XP acumulado em nível', () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100)).toEqual({ level: 2, into: 0, need: 283 });
    expect(levelInfo(11106).level).toBe(10);
  });

  it('atributos precisam de metade do XP', () => {
    expect(levelInfo(50, 0.5).level).toBe(2);
  });
});

describe('1RM estimado', () => {
  it('usa Epley', () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimate1RM(100, 1)).toBeCloseTo(103.33, 1);
  });
  it('ignora reps fora da faixa confiável', () => {
    expect(estimate1RM(100, 15)).toBeNull();
    expect(estimate1RM(0, 5)).toBeNull();
  });
});

describe('semanas', () => {
  it('a semana começa na segunda', () => {
    expect(weekKey(new Date('2026-11-09T10:00:00'))).toBe('2026-11-09');
    expect(weekKey(new Date('2026-11-15T23:00:00'))).toBe('2026-11-09');
    expect(weekKey(new Date('2026-11-16T00:30:00'))).toBe('2026-11-16');
  });
  it('avança uma semana atravessando o mês', () => {
    expect(nextWeek('2026-11-30')).toBe('2026-12-07');
  });
  it('multiplicador de constância vai até +50%', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(3)).toBeCloseTo(1.3);
    expect(streakMultiplier(9)).toBeCloseTo(1.5);
  });
});

describe('XP de um treino', () => {
  it('série efetiva com RIR vale 13, aquecimento vale 2, mais o bônus do treino', () => {
    const w = workout('2026-11-09T10:00:00', [set('supino', 60, 8, 2), set('supino', 40, 10, null, true)]);
    const p = computeProgress([w], settings, NOW);
    expect(p.results[w.id].attrXp.empurrar).toBe(15);
    expect(p.totalXp).toBe(15 + 30);
  });

  it('série com RIR > 3 vale como série fraca', () => {
    const w = workout('2026-11-09T10:00:00', [set('rosca', 10, 12, 5)]);
    expect(computeProgress([w], settings, NOW).attrXp.puxar).toBe(5); // 2 + 3 do RIR
  });

  it('divide 70/30 entre atributo principal e secundário', () => {
    const w = workout('2026-11-09T10:00:00', [set('agachamento', 100, 5, null)]);
    const r = computeProgress([w], settings, NOW).results[w.id];
    expect(r.attrXp.pernas).toBe(7);
    expect(r.attrXp.core).toBe(3);
  });

  it('cardio rende 1 XP por minuto em Fôlego', () => {
    const w = workout('2026-11-09T10:00:00', [set('corrida', 0, 25, null)]);
    expect(computeProgress([w], settings, NOW).attrXp.folego).toBe(25);
  });

  it('séries depois da 40ª não rendem XP', () => {
    const sets = Array.from({ length: 45 }, () => set('rosca-martelo', 10, 10, null));
    const w = workout('2026-11-09T10:00:00', sets);
    // 20 séries cheias (10) + 20 com fadiga (5) + 5 sem XP
    expect(computeProgress([w], settings, NOW).attrXp.puxar).toBe(20 * 10 + 20 * 5);
  });
});

describe('fadiga', () => {
  it('acima de 20 séries semanais no atributo, o XP cai pela metade', () => {
    const w1 = workout('2026-11-09T10:00:00', Array.from({ length: 20 }, () => set('supino', 60, 8, null)));
    const w2 = workout('2026-11-10T10:00:00', [set('supino', 60, 8, null)]);
    const p = computeProgress([w1, w2], settings, NOW);
    expect(p.results[w2.id].attrXp.empurrar).toBe(5);
    expect(p.results[w2.id].fatigued).toEqual(['empurrar']);
  });
});

describe('meta semanal e constância', () => {
  it('dá bônus ao cumprir a meta e aumenta o multiplicador na semana seguinte', () => {
    const ws = [
      workout('2026-11-02T10:00:00', [set('rosca', 10, 10, null)]),
      workout('2026-11-04T10:00:00', [set('rosca', 10, 10, null)]),
      workout('2026-11-06T10:00:00', [set('rosca', 10, 10, null)]),
      workout('2026-11-09T10:00:00', [set('rosca', 10, 10, null)]),
    ];
    const p = computeProgress(ws, settings, NOW);
    expect(p.results[ws[2].id].bonuses.map((b) => b.xp)).toContain(75);
    expect(p.results[ws[3].id].multiplier).toBeCloseTo(1.1);
    expect(p.results[ws[3].id].attrXp.puxar).toBe(11);
    expect(p.streak).toBe(1);
  });

  it('dois treinos no mesmo dia contam como um dia só', () => {
    const ws = [
      workout('2026-11-02T08:00:00', [set('rosca', 10, 10)]),
      workout('2026-11-02T18:00:00', [set('rosca', 10, 10)]),
      workout('2026-11-03T10:00:00', [set('rosca', 10, 10)]),
    ];
    expect(computeProgress(ws, settings, NOW).streak).toBe(0);
  });

  it('perder uma semana corta a constância pela metade', () => {
    const week = (monday: number) =>
      [0, 2, 4].map((d) => workout(`2026-10-${String(monday + d).padStart(2, '0')}T10:00:00`, [set('rosca', 10, 10)]));
    // 2 semanas cumpridas (5/10 e 12/10), depois 3 semanas vazias
    const p = computeProgress([...week(5), ...week(12)], settings, NOW);
    expect(p.streak).toBe(0); // 2 → 1 → 0 → 0
  });

  it('semana de deload conta como cumprida', () => {
    const w = workout('2026-11-02T10:00:00', [set('rosca', 5, 10)], true);
    const p = computeProgress([w], settings, NOW);
    expect(p.streak).toBe(1);
    expect(p.achievements['sabe-descansar']).toBeDefined();
  });
});

describe('chefes', () => {
  it('a primeira marca revela o chefe e superar 1RM × 1,025 o derrota', () => {
    const w1 = workout('2026-11-02T10:00:00', [set('supino', 80, 5)]); // 1RM ≈ 93,3 → HP ≈ 95,7
    const w2 = workout('2026-11-03T10:00:00', [set('supino', 82, 5)]); // ≈ 95,7 → não basta
    const w3 = workout('2026-11-04T10:00:00', [set('supino', 85, 5)]); // ≈ 99,2 → vitória
    const p = computeProgress([w1, w2, w3], settings, NOW);
    expect(p.results[w2.id].bossDefeats).toEqual([]);
    expect(p.results[w3.id].bossDefeats).toEqual(['supino']);
    expect(p.bosses.supino.defeats).toBe(1);
    expect(p.bosses.supino.base).toBeCloseTo(85 * (1 + 5 / 30));
    expect(p.achievements.matador).toBe(w3.finishedAt);
  });

  it('aquecimento não enfrenta chefe', () => {
    const w = workout('2026-11-02T10:00:00', [set('terra', 100, 5, null, true)]);
    expect(computeProgress([w], settings, NOW).bosses.terra.base).toBeNull();
  });
});

describe('conquistas e validações', () => {
  it('desbloqueia Primeira Faísca no primeiro treino', () => {
    const w = workout('2026-11-09T10:00:00', [set('rosca', 10, 10)]);
    expect(computeProgress([w], settings, NOW).results[w.id].achievements).toContain('primeira-faisca');
  });

  it('treino em andamento não conta', () => {
    const w: Workout = { id: 'x', startedAt: '2026-11-09T10:00:00', finishedAt: null, deload: false, sets: [set('rosca', 10, 10)] };
    expect(computeProgress([w], settings, NOW).totalXp).toBe(0);
  });

  it('pede confirmação para carga 50% acima da maior registrada', () => {
    const ws = [workout('2026-11-02T10:00:00', [set('supino', 60, 8)])];
    expect(isSuspiciousWeight(ws, 'supino', 90)).toBe(false);
    expect(isSuspiciousWeight(ws, 'supino', 95)).toBe(true);
    expect(isSuspiciousWeight(ws, 'agachamento', 200)).toBe(false);
  });
});
