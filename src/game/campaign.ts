/**
 * Campanha de chefes: todo XP ganho é dano no chefe atual.
 * A campanha não tem fim: depois dos 12 chefes, voltam "ecos" cada vez mais fortes.
 */
export interface BossDef {
  index: number; // 0, 1, 2...
  name: string;
  epithet: string;
  hp: number;
  /** Tamanho de cada pixel na tela principal de chefes: os chefes crescem ao longo da campanha. */
  size: number;
  /** Paleta: corpo, sombra, brilho, olhos. */
  palette: [string, string, string, string];
  seed: number;
}

const BASE: Omit<BossDef, 'index' | 'size'>[] = [
  { name: 'Ferrugem', epithet: 'o que corrói os preguiçosos', hp: 250, palette: ['#9a5b34', '#5e321a', '#c98552', '#ffd36b'], seed: 11 },
  { name: 'Lodo de Escória', epithet: 'resto de toda forja', hp: 450, palette: ['#5f6b4a', '#353d28', '#8a9a68', '#ff6a3d'], seed: 23 },
  { name: 'Brasa Errante', epithet: 'faísca que fugiu do fogo', hp: 700, palette: ['#c8321a', '#7a1a0d', '#ef6a1f', '#fff1c9'], seed: 37 },
  { name: 'Golem de Bigorna', epithet: 'peso que nunca cansa', hp: 1000, palette: ['#5a6068', '#33373d', '#8b9198', '#f7b538'], seed: 41 },
  { name: 'Serpente de Cinzas', epithet: 'some quando você para', hp: 1350, palette: ['#6d6a73', '#3b3940', '#a19da8', '#ff4f4f'], seed: 59 },
  { name: 'Fole Uivante', epithet: 'sopra até tirar seu fôlego', hp: 1750, palette: ['#3f6c8c', '#213b4d', '#6fa3c4', '#fbd77a'], seed: 67 },
  { name: 'Cavaleiro Fundido', epithet: 'armadura sem dono', hp: 2200, palette: ['#8a8f99', '#4a4e56', '#c4c9d1', '#ef6a1f'], seed: 73 },
  { name: 'Hidra de Lingotes', epithet: 'corte uma, nascem duas', hp: 2700, palette: ['#b58a2a', '#6b4e12', '#e0bb55', '#ff3d2e'], seed: 89 },
  { name: 'Titã do Carvão', epithet: 'alimenta a fornalha do mundo', hp: 3250, palette: ['#2f2f33', '#161618', '#55555c', '#ff7a1a'], seed: 97 },
  { name: 'Dragão da Fornalha', epithet: 'guardião do primeiro calor', hp: 3850, palette: ['#a8231a', '#5c120c', '#e2483a', '#fff1c9'], seed: 103 },
  { name: 'Rainha do Aço Branco', epithet: 'só se curva à constância', hp: 4500, palette: ['#d9dde3', '#8b929c', '#ffffff', '#ef6a1f'], seed: 113 },
  { name: 'O Primeiro Fogo', epithet: 'de onde toda força veio', hp: 5200, palette: ['#f7b538', '#c8321a', '#fff1c9', '#ffffff'], seed: 131 },
];

export function bossAt(index: number): BossDef {
  const lap = Math.floor(index / BASE.length);
  const base = BASE[index % BASE.length];
  const size = Math.min(12, 7 + index * 0.5); // escala de exibição: os chefes crescem ao longo da campanha
  if (lap === 0) return { ...base, index, size };
  return {
    ...base,
    index,
    size,
    name: `Eco de ${base.name}`,
    epithet: 'voltou mais forte',
    hp: Math.round(base.hp * (1 + 0.5 * lap) + 5200 * lap),
    seed: base.seed * (lap + 1) + 7,
  };
}

export interface CampaignState {
  boss: BossDef;
  /** Dano já causado no chefe atual. */
  damage: number;
  defeated: number;
}

/** Onde a campanha está depois de `totalDamage` de dano acumulado. */
export function campaignAt(totalDamage: number): CampaignState {
  let left = totalDamage;
  let i = 0;
  while (left >= bossAt(i).hp) {
    left -= bossAt(i).hp;
    i++;
  }
  return { boss: bossAt(i), damage: left, defeated: i };
}

// ---------- Sprites desenhados à mão ----------
// Metade esquerda (8 colunas × 16 linhas), espelhada na hora de desenhar.
// 'k' contorno, 'b' corpo, 'd' sombra, 'h' brilho, 'e' olho, 'm' boca, 't' dente, 'x' chifre/osso.

export type Shape = 'gosma' | 'morcego' | 'golem' | 'serpente' | 'cavaleiro' | 'hidra' | 'chama';

const SHAPES: Record<Shape, string[]> = {
  gosma: [
    '........', '........', '........', '........',
    '.......k', '.....kkh', '....khhb', '...khbbb',
    '..khbbbb', '..kbbekb', '.kbbbbbb', '.kbbbmmm',
    '.kbbbbbb', 'kbdbbbdb', 'kddddddd', '.kkkkkkk',
  ],
  morcego: [
    '........', 'kk...k..', 'khk.kxk.', 'khhkkbbk',
    'khbhkbbb', 'kbbbkbek', 'kbbbbbbb', '.kbbbbmt',
    '.kbbdbbm', '..kbkbbb', '..kk.kbb', '.....kdd',
    '......kk', '........', '........', '........',
  ],
  golem: [
    '........', '....kkkk', '...khhhh', '...khbbb',
    '...kbekb', '...kbbbb', '.kkkkddd', 'khhkhhbb',
    'khbkhbbb', 'kbbkbebb', 'kbbkbbbb', 'kddkbbbd',
    '.kk.kbbb', '....kbbk', '...kbbbk', '...kkkkk',
  ],
  serpente: [
    '..k.....', '.kxk....', '.kxxk...', '..kxbkkk',
    '..kbbhhh', '.kbbbbbb', 'kbbekbbb', 'kbbbbbbb',
    'kbmmmmmm', 'kbmtmtmt', 'kbmmmmmm', '.kbbbbbb',
    '..kddbdd', '...kkddd', '....kddd', '....kkkk',
  ],
  cavaleiro: [
    '.......k', '......kx', '....kkkk', '...khhhh',
    '...khbbb', '...kbkkk', '...kbkek', '...kbbbb',
    '.kkkkddd', 'khhkhhhh', 'khbkbbbb', 'kbbkbdbb',
    '.kkkbbbb', '....kbbk', '...kbbbk', '...kkkkk',
  ],
  hidra: [
    '........', '.kkk..kk', 'khhhk.kh', 'kbebk.ke',
    'kmmbk.kb', '.kbbk.kb', '..kbbkbb', '..kdbbbb',
    '...kbbbb', '..kbbbbb', '.kbbbbbb', '.kbdbbdb',
    '.kddddbd', '..kkkkdd', '......kk', '........',
  ],
  chama: [
    '.......k', '......kh', '...k.khh', '..kh.khb',
    '..khkhbb', '.khbbbbb', '.kbbbbbb', 'kbbbebbb',
    'kbbbbbbb', 'kbbbbmmm', 'kdbbbbbb', '.kdbbbbb',
    '.kddbbbd', '..kddddd', '...kkkkk', '........',
  ],
};

const SHAPE_ORDER: Shape[] = ['gosma', 'gosma', 'morcego', 'golem', 'serpente', 'morcego', 'cavaleiro', 'hidra', 'golem', 'serpente', 'cavaleiro', 'chama'];

export function bossShape(def: BossDef): Shape {
  return SHAPE_ORDER[def.index % SHAPE_ORDER.length];
}

/** Grade 16 × 16 do chefe (já espelhada). */
export function bossSprite(def: BossDef): string[][] {
  return SHAPES[bossShape(def)].map((half) => [...half, ...[...half].reverse()]);
}
