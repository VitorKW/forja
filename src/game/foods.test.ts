import { describe, expect, it } from 'vitest';
import rows from '../data/taco.json';
import { fromRows, nutrientsFor, portionOf, searchFoods, type FoodRow } from './foods';
import { recentFoods } from '../components/FoodSearch';

const foods = fromRows(rows as FoodRow[]);
const byName = (n: string) => foods.find((f) => f.name.startsWith(n))!;

describe('tabela de alimentos', () => {
  it('tem a TACO inteira com valores coerentes', () => {
    expect(foods.length).toBeGreaterThan(550);
    // Fermento químico: o "carboidrato" da TACO é quase todo mineral, não vira caloria.
    for (const f of foods.filter((x) => !x.name.startsWith('Fermento em pó'))) {
      expect(f.kcal).toBeGreaterThanOrEqual(0);
      expect(f.kcal).toBeLessThan(950);
      expect(f.protein).toBeLessThanOrEqual(100);
      // Energia ≈ 4p + 4c + 9g (com folga para fibra e álcool).
      expect(f.protein * 4 + f.carbs * 4 + f.fat * 9).toBeLessThan(f.kcal * 1.35 + 30);
    }
    expect(byName('Frango, peito, sem pele, grelhado')).toMatchObject({ kcal: 159, protein: 32 });
    expect(byName('Arroz, tipo 1, cozido')).toMatchObject({ kcal: 128, protein: 2.5 });
  });

  it('busca sem acento e por palavras, pronto antes de cru', () => {
    const r = searchFoods(foods, 'frango peito grelhado');
    expect(r[0].name).toBe('Frango, peito, sem pele, grelhado');
    expect(searchFoods(foods, 'frango grelhado')[0].name).toBe('Frango, peito, sem pele, grelhado'); // miúdos depois
    expect(searchFoods(foods, 'coracao frango')[0].name).toMatch(/coração/);
    expect(searchFoods(foods, 'feijao carioca')[0].name).toMatch(/^Feijão, carioca, cozido/);
    expect(searchFoods(foods, 'pao frances')[0].name).toMatch(/^Pão, trigo, francês/);
    expect(searchFoods(foods, 'whey')[0].source).toBe('rótulo');
    expect(searchFoods(foods, 'x')).toHaveLength(0);
  });

  it('quantidade em gramas e medida caseira', () => {
    const frango = byName('Frango, peito, sem pele, grelhado');
    expect(nutrientsFor(frango, 150)).toEqual({ proteina: 48, kcal: 239, carbs: 0, fat: 3.8 });
    expect(portionOf(byName('Ovo, de galinha, inteiro, cozido'))).toEqual({ label: '1 unidade', g: 50 });
    expect(portionOf(byName('Leite, de vaca, integral, pó'))).toBeNull();
  });

  it('repetir: últimas refeições diferentes, sem água', () => {
    const e = (label: string, at: string, agua = 0) => ({ id: label + at, at, label, proteina: 10, kcal: 100, agua });
    const log = {
      '2026-11-08': [e('Ovo', '1'), e('Copo de água', '2', 250)],
      '2026-11-09': [e('Frango', '3'), e('Ovo', '4')],
    };
    expect(recentFoods(log).map((r) => r.label)).toEqual(['Ovo', 'Frango']);
  });
});
