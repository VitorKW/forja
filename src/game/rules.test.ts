import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { bossAt, bossSpriteName, campaignAt } from './campaign';
import {
  cardioXp,
  computeProgress,
  estimate1RM,
  isSuspiciousWeight,
  levelInfo,
  nextWeek,
  plausibleKm,
  streakMultiplier,
  weekKey,
  weekStatus,
  xpToNext,
} from './rules';
import type { SetEntry, Settings, Workout } from './types';

const settings: Settings = { weeklyGoal: 3, unit: 'kg' };
let seq = 0;

function set(exerciseId: string, weight: number, reps: number, rir: number | null = 2, warmup = false): SetEntry {
  return { id: `s${seq++}`, exerciseId, weight, reps, rir, warmup };
}

/** Três séries iguais: o mínimo para contar como treino. */
const trio = (id: string, weight = 10) => [1, 2, 3].map(() => set(id, weight, 10, null));

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
    const w = workout('2026-11-09T10:00:00', [set('supino', 40, 10, null, true), ...[1, 2, 3].map(() => set('supino', 60, 8, 2))]);
    const p = computeProgress([w], settings, NOW);
    expect(p.results[w.id].attrXp.empurrar).toBe(2 + 3 * 13);
    expect(p.totalXp).toBe(2 + 3 * 13 + 30);
  });

  it('treino curto (menos de 3 séries) vale as séries, mas não o bônus nem o dia', () => {
    const w = workout('2026-11-09T10:00:00', [set('supino', 60, 8, 2), set('supino', 40, 10, null, true)]);
    const p = computeProgress([w], settings, NOW);
    expect(p.totalXp).toBe(15);
    expect(p.week.days).toBe(0);
    expect(p.workoutsDone).toBe(0);
    const cardio = workout('2026-11-09T10:00:00', [set('caminhada', 0, 10, null)]);
    expect(computeProgress([cardio], settings, NOW).workoutsDone).toBe(1);
  });

  it('série sem repetição não vale XP', () => {
    const w = workout('2026-11-09T10:00:00', [set('supino', 60, 0, 2)]);
    expect(computeProgress([w], settings, NOW).totalXp).toBe(0);
  });

  it('distância acima do possível para o tempo não conta', () => {
    expect(plausibleKm('caminhada', 60, 4)).toBe(4);
    expect(plausibleKm('caminhada', 1, 50)).toBe(0.13); // 8 km/h por 1 minuto
    expect(cardioXp('caminhada', 1, 50)).toBeCloseTo(1 + 0.13 * 3);
    expect(plausibleKm('escada', 30, 5)).toBe(0);
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

  it('caminhada de 1 h e 4 km rende 72 XP divididos entre Fôlego e Pernas', () => {
    expect(cardioXp('caminhada', 60, 4)).toBe(72);
    const w = workout('2026-11-09T10:00:00', [{ ...set('caminhada', 0, 60, null), distance: 4 }]);
    const p = computeProgress([w], settings, NOW);
    expect(p.attrXp.folego).toBe(50);
    expect(p.attrXp.pernas).toBe(22);
    expect(p.distanceTotal).toBe(4);
    expect(p.totalXp).toBe(72 + 30);
  });

  it('corrida rende mais por minuto que caminhada, e atividade sem distância ignora km', () => {
    expect(cardioXp('corrida', 30)).toBeGreaterThan(cardioXp('caminhada', 30));
    expect(cardioXp('yoga', 60, 10)).toBe(cardioXp('yoga', 60));
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
      workout('2026-11-02T10:00:00', trio('rosca')),
      workout('2026-11-04T10:00:00', trio('rosca')),
      workout('2026-11-06T10:00:00', trio('rosca')),
      workout('2026-11-09T10:00:00', trio('rosca')),
    ];
    const p = computeProgress(ws, settings, NOW);
    expect(p.results[ws[2].id].bonuses.map((b) => b.xp)).toContain(75);
    expect(p.results[ws[3].id].multiplier).toBeCloseTo(1.1);
    expect(p.results[ws[3].id].attrXp.puxar).toBe(33);
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

  it('semana de deload conta como cumprida com metade dos dias da meta', () => {
    const one = workout('2026-11-02T10:00:00', trio('rosca', 5), true);
    expect(computeProgress([one], settings, NOW).streak).toBe(0); // meta 3 → deload pede 2 dias
    const two = [one, workout('2026-11-04T10:00:00', trio('rosca', 5), true)];
    const p = computeProgress(two, settings, NOW);
    expect(p.streak).toBe(1);
    expect(p.achievements['sabe-descansar']).toBeDefined();
  });

  it('deload só vale uma vez a cada 4 semanas', () => {
    const dl = (d: string) => workout(`${d}T10:00:00`, trio('rosca', 5), true);
    const ws = ['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14', '2026-11-02', '2026-11-04'].map(dl);
    const st = weekStatus(ws, 3);
    expect([...st.deloadOk]).toEqual(['2026-10-05', '2026-11-02']);
  });
});

describe('recordes pessoais', () => {
  it('a primeira marca vira referência e superar 1RM × 1,025 quebra o recorde', () => {
    const w1 = workout('2026-11-02T10:00:00', [set('supino', 80, 5)]); // 1RM ≈ 93,3 → alvo ≈ 95,7
    const w2 = workout('2026-11-03T10:00:00', [set('supino', 82, 5)]); // ≈ 95,7 → não basta
    const w3 = workout('2026-11-04T10:00:00', [set('supino', 85, 5), set('supino', 86, 5)]); // vitória, bônus uma vez só
    const p = computeProgress([w1, w2, w3], settings, NOW);
    expect(p.results[w2.id].records).toEqual([]);
    expect(p.results[w3.id].records).toEqual(['supino']);
    expect(p.results[w3.id].bonuses.filter((b) => b.xp === 100)).toHaveLength(1);
    expect(p.records.supino.base).toBeCloseTo(85 * (1 + 5 / 30)); // 86 não supera 85 + 2,5%
    expect(p.records.supino.best).toBeCloseTo(86 * (1 + 5 / 30));
    expect(p.achievements.recordista).toBe(w3.finishedAt);
  });

  it('vale para qualquer exercício de força, mas não para aquecimento', () => {
    const w = workout('2026-11-02T10:00:00', [set('rosca', 14, 10), set('terra', 100, 5, null, true)]);
    const p = computeProgress([w], settings, NOW);
    expect(p.records.rosca).toBeDefined();
    expect(p.records.terra).toBeUndefined();
  });
});

describe('campanha de chefes', () => {
  it('todo XP é dano e o excedente passa para o próximo chefe', () => {
    expect(campaignAt(0)).toMatchObject({ defeated: 0, damage: 0 });
    expect(campaignAt(249).defeated).toBe(0);
    const c = campaignAt(260);
    expect(c.defeated).toBe(1);
    expect(c.damage).toBe(10);
    expect(c.boss.name).toBe(bossAt(1).name);
  });

  it('é infinita: depois dos 12 chefes vêm ecos mais fortes', () => {
    expect(bossAt(12).name).toMatch(/^Eco de/);
    expect(bossAt(12).hp).toBeGreaterThan(bossAt(11).hp);
  });

  it('chefes crescem e todo chefe tem um sprite', () => {
    expect(bossAt(10).size).toBeGreaterThan(bossAt(0).size);
    const names = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const name = bossSpriteName(bossAt(i));
      names.add(name);
      expect(existsSync(new URL(`../../public/sprites/${name}.png`, import.meta.url))).toBe(true);
    }
    expect(names.size).toBe(12);
    expect(bossSpriteName(bossAt(12))).toBe(bossSpriteName(bossAt(0)));
  });
  it('o resultado do treino mostra o antes e o depois na campanha', () => {
    const sets = Array.from({ length: 20 }, () => set('rosca', 10, 10, 2));
    const w = workout('2026-11-09T10:00:00', sets); // 20 × 13 + 30 = 290
    const r = computeProgress([w], settings, NOW).results[w.id];
    expect(r.campaignBefore.defeated).toBe(0);
    expect(r.campaignAfter.defeated).toBe(1);
    expect(r.achievements).toContain('matador');
  });
});

describe('conquistas e validações', () => {
  it('desbloqueia Primeira Faísca no primeiro treino', () => {
    const w = workout('2026-11-09T10:00:00', trio('rosca'));
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
