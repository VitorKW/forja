import { describe, expect, it } from 'vitest';
import { bmr, changeGoals, dietHabits, goalsOn, kcalFor, kcalStatus, waterFor, weightOn, type DietEntry, type DietLog } from './diet';

const e = (proteina: number, agua = 0): DietEntry => ({ id: Math.random().toString(36), at: '2026-11-01T12:00:00Z', label: 'x', proteina, kcal: 0, agua });

describe('metas da dieta', () => {
  it('mudar a meta hoje não muda os dias passados', () => {
    const old = { proteina: 120, kcal: 0, agua: 2000 };
    const novo = { proteina: 160, kcal: 0, agua: 2000 };
    const log = changeGoals([], old, '2026-11-09', novo);
    const p = { dietGoals: novo, dietGoalsLog: log };
    expect(goalsOn('2026-11-08', p).proteina).toBe(120);
    expect(goalsOn('2026-11-09', p).proteina).toBe(160);
    const diet: DietLog = { '2026-11-08': [e(130)], '2026-11-09': [e(130)] };
    const h = dietHabits(diet, (d) => goalsOn(d, p));
    expect(h['2026-11-08']).toEqual(['proteina']);
    expect(h['2026-11-09']).toBeUndefined();
  });

  it('mudar duas vezes no mesmo dia guarda só a última', () => {
    const a = changeGoals([], undefined, '2026-11-09', { proteina: 100, kcal: 0, agua: 2000 });
    const b = changeGoals(a, a[1].goals!, '2026-11-09', { proteina: 140, kcal: 0, agua: 2000 });
    expect(b).toHaveLength(2);
    expect(b[0].goals).toBeNull(); // antes: metas padrão
    expect(goalsOn('2026-11-09', { dietGoalsLog: b }).proteina).toBe(140);
  });

  it('meta padrão usa o peso daquele dia, não o de hoje', () => {
    const bodyWeights = [
      { day: '2026-10-01', kg: 80 },
      { day: '2026-11-05', kg: 70 },
    ];
    expect(weightOn(bodyWeights, '2026-09-30')).toBeUndefined();
    expect(goalsOn('2026-10-20', { bodyWeights }).proteina).toBe(145); // 80 × 1,8 = 144 → 145
    expect(goalsOn('2026-11-06', { bodyWeights }).proteina).toBe(125); // 70 × 1,8 = 126 → 125
    expect(goalsOn('2026-09-01', { bodyWeights }).proteina).toBe(120);
  });

  it('água: 35 ml/kg em copos de 250 ml, entre 1,5 e 4 L', () => {
    expect(waterFor(70)).toBe(2500); // 2450 → 2500
    expect(waterFor(30)).toBe(1500);
    expect(waterFor(150)).toBe(4000);
  });
});

describe('calorias', () => {
  it('basal de Mifflin-St Jeor', () => {
    expect(bmr({ sex: 'm', age: 25, heightCm: 180, weightKg: 80 })).toBe(800 + 1125 - 125 + 5);
    expect(bmr({ sex: 'f', age: 25, heightCm: 165, weightKg: 60 })).toBeCloseTo(600 + 1031.25 - 125 - 161);
  });

  it('meta pelo objetivo, de 50 em 50, nunca abaixo do basal', () => {
    const base = { sex: 'm' as const, age: 25, heightCm: 180, weightKg: 80, activity: 'moderado' as const };
    expect(kcalFor({ ...base, goal: 'manter' })).toBe(2800); // 1805 × 1,55 = 2797,75
    expect(kcalFor({ ...base, goal: 'perder' })).toBe(2250); // × 0,8 = 2238 → 2250
    expect(kcalFor({ ...base, goal: 'ganhar' })).toBe(3100); // × 1,1 = 3077 → 3100
  });

  it('calorias são alvo: 90–110% está certo', () => {
    expect(kcalStatus(1000, 0)).toBe('sem-meta');
    expect(kcalStatus(1700, 2000)).toBe('abaixo');
    expect(kcalStatus(2150, 2000)).toBe('ok');
    expect(kcalStatus(2300, 2000)).toBe('acima');
  });
});
