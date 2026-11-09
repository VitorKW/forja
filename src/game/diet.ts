/**
 * Dieta leve: registro rápido de proteína, calorias e água, sem tabela de alimentos.
 * Quando a meta de proteína ou de água é batida, a missão do dia é marcada sozinha.
 */
import type { HabitId, HabitLog } from './extras';
import type { BodyWeight } from './types';

export interface DietEntry {
  id: string;
  at: string; // ISO
  label: string;
  proteina: number; // g
  kcal: number;
  agua: number; // ml
  /** Opcionais: vêm da busca na TACO (registros antigos não têm). */
  carbs?: number; // g
  fat?: number; // g
}

/** Refeição salva: vários alimentos lançados com um toque. */
export interface Meal {
  id: string;
  name: string;
  items: Omit<DietEntry, 'id' | 'at'>[];
}

/** Registros por dia: chave "AAAA-MM-DD". */
export type DietLog = Record<string, DietEntry[]>;

export interface DietGoals {
  proteina: number; // g
  /** 0 = sem meta de calorias. */
  kcal: number;
  agua: number; // ml
  /** Calorias em dia sem treino (0 ou vazio = mesma meta). */
  kcalRest?: number;
}

export interface DietTotals {
  proteina: number;
  kcal: number;
  agua: number;
  carbs: number;
  fat: number;
}

/** Meta de calorias do dia: a de descanso, se houver, quando não teve treino. */
export function kcalGoalFor(goals: DietGoals, trainingDay: boolean): number {
  return !trainingDay && goals.kcalRest ? goals.kcalRest : goals.kcal;
}

/**
 * Porções comuns, com valores aproximados da Tabela Brasileira de Composição de
 * Alimentos (TACO) para o alimento pronto. Servem para registrar rápido, não para pesar.
 */
export const QUICK_FOODS = [
  { id: 'ovo', label: 'Ovo', portion: '1 unidade cozida', icon: '🥚', proteina: 7, kcal: 73, carbs: 0, fat: 5 },
  { id: 'frango', label: 'Frango', portion: '100 g de peito grelhado', icon: '🍗', proteina: 32, kcal: 159, carbs: 0, fat: 2.5 },
  { id: 'carne', label: 'Carne', portion: '100 g de patinho grelhado', icon: '🥩', proteina: 36, kcal: 219, carbs: 0, fat: 7 },
  { id: 'whey', label: 'Whey', portion: '1 dose de 30 g', icon: '🥤', proteina: 24, kcal: 120, carbs: 3, fat: 2 },
  { id: 'iogurte', label: 'Iogurte natural', portion: '1 pote de 170 g', icon: '🥛', proteina: 7, kcal: 87, carbs: 3, fat: 5 },
  { id: 'prato', label: 'Arroz e feijão', portion: '1 escumadeira + 1 concha', icon: '🍛', proteina: 7, kcal: 191, carbs: 39, fat: 0.7 },
  { id: 'pao', label: 'Pão francês', portion: '1 unidade', icon: '🥖', proteina: 4, kcal: 150, carbs: 29, fat: 1.5 },
  { id: 'fruta', label: 'Banana', portion: '1 unidade', icon: '🍌', proteina: 1, kcal: 69, carbs: 18, fat: 0 },
] as const;

export const WATER_STEPS = [
  { ml: 250, label: 'Copo' },
  { ml: 500, label: 'Garrafa' },
] as const;

/** Proteína: 1,8 g por kg de peso corporal (meio da faixa 1,6–2,2 g/kg), arredondada de 5 em 5. */
export function proteinFor(weightKg: number): number {
  return Math.round((weightKg * 1.8) / 5) * 5;
}

/** Água: 35 ml por kg, arredondado de 250 em 250 (copos), entre 1,5 e 4 litros. */
export function waterFor(weightKg: number): number {
  return Math.min(4000, Math.max(1500, Math.round((weightKg * 35) / 250) * 250));
}

export const ACTIVITY = [
  { id: 'leve', label: 'Treino 1–2x por semana', factor: 1.375 },
  { id: 'moderado', label: 'Treino 3–5x por semana', factor: 1.55 },
  { id: 'alto', label: 'Treino 6–7x ou trabalho físico', factor: 1.725 },
] as const;

export const KCAL_GOALS = [
  { id: 'perder', label: 'Perder gordura', factor: 0.8 },
  { id: 'manter', label: 'Manter', factor: 1 },
  { id: 'ganhar', label: 'Ganhar massa', factor: 1.1 },
] as const;

export interface KcalInput {
  sex: 'm' | 'f';
  age: number;
  heightCm: number;
  weightKg: number;
  activity: (typeof ACTIVITY)[number]['id'];
  goal: (typeof KCAL_GOALS)[number]['id'];
}

/** Metabolismo basal pela equação de Mifflin-St Jeor. */
export function bmr({ sex, age, heightCm, weightKg }: Pick<KcalInput, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161);
}

/**
 * Meta de calorias: basal × atividade × objetivo (−20% para perder, +10% para ganhar),
 * de 50 em 50 e nunca abaixo do basal.
 */
export function kcalFor(i: KcalInput): number {
  const base = bmr(i);
  const act = ACTIVITY.find((a) => a.id === i.activity)?.factor ?? 1.55;
  const g = KCAL_GOALS.find((x) => x.id === i.goal)?.factor ?? 1;
  return Math.round(Math.max(base, base * act * g) / 50) * 50;
}

/** Calorias são alvo, não "quanto mais melhor": 90–110% da meta está certo. */
export function kcalStatus(value: number, goal: number): 'sem-meta' | 'abaixo' | 'ok' | 'acima' {
  if (goal <= 0) return 'sem-meta';
  if (value > goal * 1.1) return 'acima';
  if (value >= goal * 0.9) return 'ok';
  return 'abaixo';
}

export function defaultGoals(weightKg?: number): DietGoals {
  return { proteina: weightKg ? proteinFor(weightKg) : 120, kcal: 0, agua: 2000 };
}

export function totals(entries: DietEntry[] = []): DietTotals {
  const t = { proteina: 0, kcal: 0, agua: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    t.proteina += e.proteina;
    t.kcal += e.kcal;
    t.agua += e.agua;
    t.carbs += e.carbs ?? 0;
    t.fat += e.fat ?? 0;
  }
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { proteina: r1(t.proteina), kcal: Math.round(t.kcal), agua: t.agua, carbs: r1(t.carbs), fat: r1(t.fat) };
}

/**
 * Mudança de meta a partir de um dia. `goals: null` = metas padrão (pelo peso do dia).
 * Guardar o histórico faz com que mudar a meta hoje não mude as missões de dias passados.
 */
export interface GoalChange {
  from: string; // AAAA-MM-DD
  goals: DietGoals | null;
}

/** Peso registrado no dia ou no último registro antes dele. */
export function weightOn(weights: BodyWeight[] = [], day: string): number | undefined {
  let kg: number | undefined;
  for (const w of [...weights].sort((a, b) => a.day.localeCompare(b.day))) if (w.day <= day) kg = w.kg;
  return kg;
}

/** Meta que valia em um dia. */
export function goalsOn(day: string, p: { dietGoals?: DietGoals; dietGoalsLog?: GoalChange[]; bodyWeights?: BodyWeight[] }): DietGoals {
  const log = p.dietGoalsLog ?? [];
  let g: DietGoals | null | undefined = log.length ? undefined : p.dietGoals;
  for (const c of [...log].sort((a, b) => a.from.localeCompare(b.from))) if (c.from <= day) g = c.goals;
  return g ?? defaultGoals(weightOn(p.bodyWeights, day));
}

/** Novo histórico ao salvar metas hoje (guarda a meta antiga para os dias anteriores). */
export function changeGoals(log: GoalChange[] = [], previous: DietGoals | undefined, today: string, goals: DietGoals): GoalChange[] {
  const base = log.length ? log : [{ from: '0000-01-01', goals: previous ?? null }];
  return [...base.filter((c) => c.from !== today), { from: today, goals }].sort((a, b) => a.from.localeCompare(b.from)).slice(-30);
}

/** Missões cumpridas pela dieta: proteína e água acima da meta daquele dia. */
export function dietHabits(log: DietLog, goalsFor: DietGoals | ((day: string) => DietGoals)): HabitLog {
  const out: HabitLog = {};
  for (const [day, entries] of Object.entries(log)) {
    const goals = typeof goalsFor === 'function' ? goalsFor(day) : goalsFor;
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
