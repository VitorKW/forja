import type { Attribute } from '../game/types';
import { heatColor } from '../heat';
import type { Look } from '../store';

/**
 * Personagem em pixel art (20 × 25), desenhado em camadas.
 * Cada sprite é escrito só pela metade esquerda (10 colunas) e espelhado.
 * Cada atributo destrava uma peça de equipamento; o material melhora com o nível:
 * couro (2–3) → aço (4–5) → brasa (6–7) → ouro (8+).
 */

type Half = string[]; // 25 linhas × 10 colunas; '.' = transparente

const BASE: Half = [
  '..........',
  '..........',
  '........kk',
  '......kkhh',
  '.....khhhh',
  '....khhhhh',
  '....khssss',
  '....khskss',
  '....khssss',
  '.....kssss',
  '......kkss',
  '....kkcccc',
  '...kcccccc',
  '..kskccccc',
  '..kskccccc',
  '..kskccccc',
  '..ksskwwww',
  '...kkkpppp',
  '.....kpppp',
  '.....kpppk',
  '.....kpppk',
  '.....kpppk',
  '.....kbbbk',
  '....kbbbbk',
  '....kkkkkk',
];

const LONG_HAIR: Half = [
  '', '', '', '', '', '',
  '..kh......',
  '..kh......',
  '..kh......',
  '..kh......',
  '..khh.....',
  '..khh.....',
  '..kh......',
];

// A capa fica atrás do corpo: só aparece nas laterais, por fora dos braços.
const CAPE: Half = [
  '', '', '', '', '', '', '', '', '', '', '',
  '...kCCC...',
  '..kCCCC...',
  '.kCC......',
  '.kCC......',
  '.kCc......',
  '.kCC......',
  'kCCC......',
  'kCCC......',
  'kCcC......',
  'kCCCk.....',
  'kCCCk.....',
  '.kkk......',
];

const SHOULDERS: Half = ['', '', '', '', '', '', '', '', '', '', '...kkk....', '..kSSSk...', '..kSsSS...'];
const GAUNTLETS: Half = ['', '', '', '', '', '', '', '', '', '', '', '', '', '..GGG.....', '..GgG.....', '..GGG.....', '..GGGk....'];
const CHEST: Half = ['', '', '', '', '', '', '', '', '', '', '', '', '.....AAAAA', '.....AaAAA', '.....AAAAA', '.....AAAAA'];
const GREAVES: Half = [
  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  '......LLL.',
  '......LlL.',
  '......LLL.',
  '......LLL.',
  '.....LLLL.',
];
// Elmo com aba escura, protetores de bochecha e de nariz: não pode parecer cabelo.
const HELM: Half = [
  '',
  '........kk',
  '......kkHH',
  '.....kHHhH',
  '....kHHhHH',
  '....kHHHHH',
  '....kkkkkk',
  '....kH...k',
  '....kH...H',
  '....kH...H',
];
const CROWN: Half = ['.......Y.Y', '.......YYY', '........kk'];

/** Material do equipamento conforme o nível do atributo. */
function tier(level: number): [string, string] | null {
  if (level >= 8) return ['#f7c548', '#fff1c9']; // ouro
  if (level >= 6) return ['#ef6a1f', '#fbd77a']; // brasa
  if (level >= 4) return ['#a7afb9', '#e6eaee']; // aço
  if (level >= 2) return ['#8a5a3b', '#b98458']; // couro
  return null;
}

export const TIER_NAME = (level: number) =>
  level >= 8 ? 'de ouro' : level >= 6 ? 'em brasa' : level >= 4 ? 'de aço' : level >= 2 ? 'de couro' : null;

export default function Character({
  levels,
  playerLevel,
  look,
  scale = 9,
}: {
  levels: Record<Attribute, number>;
  playerLevel: number;
  look: Look;
  scale?: number;
}) {
  const colors: Record<string, string> = {
    k: '#17120f',
    s: '#e8b48a',
    h: look === 'b' ? '#8a3f1c' : '#3f2616',
    c: look === 'b' ? '#6d4d7a' : '#4d5868',
    p: '#2c323c',
    b: '#4a3426',
    w: '#7a5230',
  };

  const layers: { half: Half; on: boolean; mat?: [string, string] | null; keys?: [string, string] }[] = [
    { half: CAPE, on: levels.folego >= 2, mat: tier(levels.folego), keys: ['C', 'c'] },
    { half: BASE, on: true },
    { half: LONG_HAIR, on: look === 'b' },
    { half: CHEST, on: levels.core >= 2, mat: tier(levels.core), keys: ['A', 'a'] },
    { half: SHOULDERS, on: levels.empurrar >= 2, mat: tier(levels.empurrar), keys: ['S', 's'] },
    { half: GAUNTLETS, on: levels.puxar >= 2, mat: tier(levels.puxar), keys: ['G', 'g'] },
    { half: GREAVES, on: levels.pernas >= 2, mat: tier(levels.pernas), keys: ['L', 'l'] },
    { half: HELM, on: playerLevel >= 5, mat: tier(Math.min(9, playerLevel)), keys: ['H', 'h'] },
    { half: CROWN, on: playerLevel >= 10, mat: ['#f7c548', '#fff1c9'], keys: ['Y', 'y'] },
  ];

  // Junta as camadas numa grade 20 × 25 de cores.
  const grid: (string | null)[][] = Array.from({ length: 25 }, () => Array(20).fill(null));
  for (const layer of layers) {
    if (!layer.on) continue;
    layer.half.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        let color: string | undefined;
        if (layer.keys && layer.mat && ch === layer.keys[0]) color = layer.mat[0];
        else if (layer.keys && layer.mat && ch === layer.keys[1]) color = layer.mat[1];
        else color = colors[ch];
        if (!color) continue;
        grid[y][x] = color;
        grid[y][19 - x] = color;
      }
    });
  }

  const aura = levels.folego >= 6 || playerLevel >= 8;
  const glow = heatColor(Math.min(10, Math.max(levels.folego, playerLevel)));

  return (
    <svg
      viewBox="-2 -1 24 27"
      width={24 * scale}
      height={27 * scale}
      shapeRendering="crispEdges"
      className="character"
      role="img"
      aria-label="Seu personagem: cada peça de equipamento vem de um atributo"
      style={aura ? { filter: `drop-shadow(0 0 6px ${glow})` } : undefined}
    >
      <ellipse cx="10" cy="24.6" rx="7" ry="1.2" fill="#00000066" />
      <g className="idle">
        {grid.flatMap((row, y) => row.map((c, x) => (c ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={c} /> : null)))}
      </g>
    </svg>
  );
}
