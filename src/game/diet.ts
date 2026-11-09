/**
 * Dieta leve: registro rápido de proteína, calorias e água, sem tabela de alimentos.
 * Quando a meta de proteína ou de água é batida, a missão do dia é marcada sozinha.
 */
import type { HabitId, HabitLog } from './extras';

export interface DietEntry {
  id: string;
  at: string; // ISO
  label: string;
  proteina: number; // g
  kcal: number;
  agua: number; // ml
}

/** Registros por dia: chave "AAAA-MM-DD". */
export type DietLog = Record<string, DietEntry[]>;

export interface DietGoals {
  proteina: number; // g
  /** 0 = sem meta de calorias. */
  kcal: number;
  agua: number; // ml
}

export interface DietTotals {
  proteina: number;
  kcal: number;
  agua: number;
}

export const QUICK_FOODS = [
  { id: 'ovo', label: 'Ovo', icon: '🥚', proteina: 6, kcal: 75 },
  { id: 'frango', label: 'Frango', portion: '100 g', icon: '🍗', proteina: 31, kcal: 165 },
  { id: 'carne', label: 'Carne', portion: '100 g', icon: '🥩', proteina: 26, kcal: 220 },
  { id: 'whey', label: 'Whey', icon: '🥤', proteina: 24, kcal: 120 },
  { id: 'iogurte', label: 'Iogurte', icon: '🥛', proteina: 10, kcal: 110 },
  { id: 'prato', label: 'Arroz e feijão', icon: '🍛', proteina: 9, kcal: 350 },
  { id: 'pao', label: 'Pão', icon: '🥖', proteina: 4, kcal: 150 },
  { id: 'fruta', label: 'Fruta', icon: '🍌', proteina: 1, kcal: 90 },
] as const;

export const WATER_STEPS = [
  { ml: 250, label: 'Copo' },
  { ml: 500, label: 'Garrafa' },
] as const;

/** Proteína: 1,8 g por kg de peso corporal (meio da faixa 1,6–2,2 g/kg), arredondada de 5 em 5. */
export function proteinFor(weightKg: number): number {
  return Math.round((weightKg * 1.8) / 5) * 5;
}

export function defaultGoals(weightKg?: number): DietGoals {
  return { proteina: weightKg ? proteinFor(weightKg) : 120, kcal: 0, agua: 2000 };
}

export function totals(entries: DietEntry[] = []): DietTotals {
  const t = { proteina: 0, kcal: 0, agua: 0 };
  for (const e of entries) {
    t.proteina += e.proteina;
    t.kcal += e.kcal;
    t.agua += e.agua;
  }
  return t;
}

/** Missões cumpridas pela dieta: proteína e água acima da meta. */
export function dietHabits(log: DietLog, goals: DietGoals): HabitLog {
  const out: HabitLog = {};
  for (const [day, entries] of Object.entries(log)) {
    const t = totals(entries);
    const ids: HabitId[] = [];
    if (goals.proteina > 0 && t.proteina >= goals.proteina) ids.push('proteina');
    if (goals.agua > 0 && t.agua >= goals.agua) ids.push('agua');
    if (ids.length) out[day] = ids;
  }
  return out;
}

/** Junta as missões marcadas à mão com as cumpridas pela dieta. */
export function mergeHabits(a: HabitLog, b: HabitLog): HabitLog {
  const out: HabitLog = { ...a };
  for (const [day, ids] of Object.entries(b)) out[day] = [...new Set([...(out[day] ?? []), ...ids])];
  return out;
}

/**
 * Dias antigos viram um registro só com o total, para o perfil não crescer sem fim
 * (ele viaja inteiro para a nuvem a cada mudança).
 */
export function compactDiet(log: DietLog, today: string, keepDays = 45): DietLog {
  const [y, m, d] = today.split('-').map(Number);
  const limit = new Date(y, m - 1, d - keepDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  const limitKey = `${limit.getFullYear()}-${pad(limit.getMonth() + 1)}-${pad(limit.getDate())}`;
  const out: DietLog = {};
  for (const [day, entries] of Object.entries(log)) {
    if (day >= limitKey || entries.length <= 1) out[day] = entries;
    else out[day] = [{ id: `total-${day}`, at: entries[0].at, label: 'Total do dia', ...totals(entries) }];
  }
  return out;
}
