/**
 * Banco de alimentos: Tabela Brasileira de Composição de Alimentos (TACO, 4ª ed.,
 * NEPA/UNICAMP), valores por 100 g. Os dados ficam em src/data/taco.json e só são
 * carregados quando a pessoa abre a busca.
 */

/** [nome, categoria, kcal, proteína, carboidrato, gordura] por 100 g. */
export type FoodRow = [string, string, number, number, number, number];

export interface Food {
  name: string;
  category: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** De onde veio o valor. */
  source: 'TACO' | 'rótulo';
}

/** Itens que a TACO não tem: média de rótulos comuns (varia por marca). */
export const LABEL_FOODS: Food[] = [
  { name: 'Whey protein (concentrado)', category: 'suplementos', kcal: 400, protein: 78, carbs: 10, fat: 6, source: 'rótulo' },
  { name: 'Pasta de amendoim integral', category: 'nozes', kcal: 600, protein: 26, carbs: 18, fat: 48, source: 'rótulo' },
  { name: 'Barra de proteína', category: 'suplementos', kcal: 370, protein: 30, carbs: 40, fat: 10, source: 'rótulo' },
  { name: 'Iogurte grego natural', category: 'leite', kcal: 110, protein: 6, carbs: 6, fat: 7, source: 'rótulo' },
  { name: 'Tapioca (goma hidratada)', category: 'cereais', kcal: 240, protein: 0, carbs: 60, fat: 0, source: 'rótulo' },
];

export function fromRows(rows: FoodRow[]): Food[] {
  return [
    ...rows.map(([name, category, kcal, protein, carbs, fat]) => ({ name, category, kcal, protein, carbs, fat, source: 'TACO' as const })),
    ...LABEL_FOODS,
  ];
}

/** Medidas caseiras comuns (aproximadas). A primeira que casar com o nome vale. */
const PORTIONS: [RegExp, string, number][] = [
  [/^Ovo, de galinha/, '1 unidade', 50],
  [/^Pão, trigo, francês/, '1 pão', 50],
  [/^Pão, trigo, forma/, '1 fatia', 25],
  [/^Pão, .*integral/, '1 fatia', 25],
  [/^Banana/, '1 unidade', 70],
  [/^Maçã/, '1 unidade', 130],
  [/^Laranja/, '1 unidade', 180],
  [/^Mamão/, '1 fatia', 170],
  [/^Arroz, .*cozido/, '1 escumadeira', 90],
  [/^Feijão, .*cozido/, '1 concha', 100],
  [/^Macarrão, .*cozido/, '1 pegador', 110],
  [/^Leite, de vaca, (integral|desnatado|semi)(?!.*pó)/, '1 copo', 200],
  [/^Iogurte/, '1 pote', 170],
  [/^Queijo, mozarela|^Queijo, mussarela/, '1 fatia', 20],
  [/^Queijo, minas/, '1 fatia', 30],
  [/^Queijo, prato/, '1 fatia', 20],
  [/^Requeijão/, '1 colher de sopa', 30],
  [/^Aveia/, '1 colher de sopa', 15],
  [/^Azeite|^Óleo/, '1 colher de sopa', 13],
  [/^Manteiga|^Margarina/, '1 colher de chá', 5],
  [/^Açúcar/, '1 colher de chá', 5],
  [/^Café, infusão/, '1 xícara', 50],
  [/^Batata, (inglesa|doce), cozida/, '1 unidade média', 130],
  [/^Tomate/, '1 unidade', 100],
  [/^Whey/, '1 dose', 30],
  [/^Pasta de amendoim/, '1 colher de sopa', 15],
  [/^Barra de proteína/, '1 barra', 45],
  [/^Tapioca/, '1 tapioca', 70],
];

export function portionOf(f: Pick<Food, 'name'>): { label: string; g: number } | null {
  const p = PORTIONS.find(([re]) => re.test(f.name));
  return p ? { label: p[1], g: p[2] } : null;
}

/** Proteína e calorias de uma quantidade em gramas. */
export function nutrientsFor(f: Food, grams: number): { proteina: number; kcal: number; carbs: number; fat: number } {
  const g = Math.max(0, grams);
  const r1 = (v: number) => Math.round((v * g) / 10) / 10;
  return { proteina: r1(f.protein), kcal: Math.round((f.kcal * g) / 100), carbs: r1(f.carbs), fat: r1(f.fat) };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Busca por palavras, sem acento: "frango grelhado" acha "Frango, peito, sem pele, grelhado".
 * Ordena pelo nome que começa com a busca, depois pronto (cozido, grelhado...) antes de cru.
 */
export function searchFoods(foods: Food[], query: string, limit = 12): Food[] {
  const words = norm(query).split(/[\s,]+/).filter(Boolean);
  if (words.join('').length < 2) return [];
  const ready = /cozid|grelhad|assad|frit|refogad|torrad|pronto/;
  // Miúdos e cortes pouco comuns vão para o fim, a não ser que a busca peça por eles.
  const rare = /coracao|figado|moela|miudo|lingua|bucho|dobradinha|\brim\b|\basa\b|sobrecoxa|com pele/;
  return foods
    .map((f) => ({ f, n: norm(f.name) }))
    .filter(({ n }) => words.every((w) => n.includes(w)))
    .map(({ f, n }) => ({
      f,
      score:
        (n.startsWith(words[0]) ? 0 : 10) +
        (ready.test(n) ? 0 : /\bcru/.test(n) ? 3 : 1) +
        (rare.test(n) && !words.some((w) => rare.test(w)) ? 2 : 0) +
        n.length / 100,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.f);
}

let cache: Promise<Food[]> | null = null;
/** Carrega a tabela uma vez (fica em um arquivo separado do app). */
export function loadFoods(): Promise<Food[]> {
  cache ??= import('../data/taco.json').then((m) => fromRows(m.default as FoodRow[]));
  return cache;
}
