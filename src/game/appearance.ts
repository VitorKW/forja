/**
 * Personalização do boneco: cabelo, olhos, pele e camiseta.
 * O corpo (art/personagem.px.js) é desenhado com cores fixas; o app troca essas cores
 * exatas pelas escolhidas (cada parte tem 3 tons: sombra, base, luz).
 */
import type { Look } from '../store';

export type Ramp = [string, string, string];
export interface Option {
  id: string;
  label: string;
  ramp: Ramp;
}

export const HAIR: Option[] = [
  { id: 'castanho', label: 'Castanho', ramp: ['#2e1a0f', '#4a2c1a', '#6e452b'] },
  { id: 'preto', label: 'Preto', ramp: ['#0f0d12', '#1f1c25', '#37323f'] },
  { id: 'ruivo', label: 'Ruivo', ramp: ['#6e3418', '#a2522a', '#cf7a40'] },
  { id: 'loiro', label: 'Loiro', ramp: ['#8a5f1e', '#c99a3c', '#ecc96a'] },
  { id: 'platinado', label: 'Platinado', ramp: ['#8f8a84', '#cfcac2', '#f4f0e8'] },
  { id: 'rosa', label: 'Rosa', ramp: ['#7a2e4a', '#c94f7c', '#f08bb0'] },
  { id: 'azul', label: 'Azul', ramp: ['#1d3060', '#2f5bb0', '#6c9cf0'] },
  { id: 'verde', label: 'Verde', ramp: ['#1a4a34', '#2f8a5c', '#6fd09a'] },
];

/** Olho: só o tom da íris importa (o brilho branco fica). Ramp[1] é o usado. */
export const EYES: Option[] = [
  { id: 'escuro', label: 'Escuro', ramp: ['#2a1d3a', '#2a1d3a', '#2a1d3a'] },
  { id: 'castanho', label: 'Castanho', ramp: ['#5a3418', '#5a3418', '#5a3418'] },
  { id: 'mel', label: 'Mel', ramp: ['#a8701e', '#a8701e', '#a8701e'] },
  { id: 'verde', label: 'Verde', ramp: ['#2f7a3c', '#2f7a3c', '#2f7a3c'] },
  { id: 'azul', label: 'Azul', ramp: ['#2f62c8', '#2f62c8', '#2f62c8'] },
  { id: 'cinza', label: 'Cinza', ramp: ['#6b7480', '#6b7480', '#6b7480'] },
  { id: 'roxo', label: 'Roxo', ramp: ['#7a3db0', '#7a3db0', '#7a3db0'] },
];

export const SKIN: Option[] = [
  { id: 'media', label: 'Média', ramp: ['#b8775a', '#e8b48a', '#f7d2b0'] },
  { id: 'clara', label: 'Clara', ramp: ['#c98f78', '#f4cfb4', '#fde6d2'] },
  { id: 'morena', label: 'Morena', ramp: ['#8a5236', '#c4875c', '#dca57a'] },
  { id: 'parda', label: 'Parda', ramp: ['#6e3f26', '#a06a44', '#c08a5e'] },
  { id: 'negra', label: 'Negra', ramp: ['#3e2216', '#6b3f28', '#8f5a3a'] },
];

export const SHIRT: Option[] = [
  { id: 'cinza', label: 'Cinza', ramp: ['#363f4c', '#4d5868', '#6a7a8e'] },
  { id: 'roxa', label: 'Roxa', ramp: ['#4f3060', '#7a4d86', '#a374b0'] },
  { id: 'preta', label: 'Preta', ramp: ['#1a1a1f', '#2b2b33', '#45454f'] },
  { id: 'vermelha', label: 'Vermelha', ramp: ['#6e1a1a', '#a8302a', '#d65a48'] },
  { id: 'verde', label: 'Verde', ramp: ['#1f4a32', '#2f7048', '#4f9a68'] },
  { id: 'azul', label: 'Azul', ramp: ['#1d3a6e', '#2f5aa0', '#5a86cc'] },
  { id: 'branca', label: 'Branca', ramp: ['#9a9da6', '#d4d7de', '#f2f3f6'] },
  { id: 'laranja', label: 'Laranja', ramp: ['#8a3a10', '#d0621e', '#f39a4a'] },
];

export interface Appearance {
  hair?: string;
  eyes?: string;
  skin?: string;
  shirt?: string;
}

/** O que cada visual já usava antes da personalização (não muda quem nunca mexeu). */
export const DEFAULTS: Record<Look, Required<Appearance>> = {
  a: { hair: 'castanho', eyes: 'escuro', skin: 'media', shirt: 'cinza' },
  b: { hair: 'ruivo', eyes: 'escuro', skin: 'media', shirt: 'roxa' },
};

const find = (list: Option[], id: string | undefined, fallback: string) => (list.find((o) => o.id === id) ?? list.find((o) => o.id === fallback)!).ramp;

export function resolve(look: Look, a: Appearance = {}): Required<Appearance> {
  const d = DEFAULTS[look];
  const ok = (list: Option[], id?: string) => (id && list.some((o) => o.id === id) ? id : undefined);
  return { hair: ok(HAIR, a.hair) ?? d.hair, eyes: ok(EYES, a.eyes) ?? d.eyes, skin: ok(SKIN, a.skin) ?? d.skin, shirt: ok(SHIRT, a.shirt) ?? d.shirt };
}

/** Troca de cores (hex de origem → hex novo) para o PNG do corpo daquele visual. */
export function colorMap(look: Look, a: Appearance = {}): Record<string, string> {
  const r = resolve(look, a);
  const d = DEFAULTS[look];
  const map: Record<string, string> = {};
  const add = (list: Option[], from: string, to: string, only?: number) => {
    const src = find(list, from, from);
    const dst = find(list, to, to);
    src.forEach((c, i) => {
      if (only === undefined || i === only) map[c] = dst[i];
    });
  };
  add(HAIR, d.hair, r.hair);
  add(EYES, d.eyes, r.eyes, 0);
  add(SKIN, d.skin, r.skin);
  add(SHIRT, d.shirt, r.shirt);
  // Só o que muda de fato.
  for (const k of Object.keys(map)) if (map[k].toLowerCase() === k.toLowerCase()) delete map[k];
  return map;
}

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

/** Aplica a troca de cores num buffer RGBA (pixels exatos; contorno e transparência ficam). */
export function recolorPixels(data: Uint8ClampedArray, map: Record<string, string>) {
  const lut = new Map(Object.entries(map).map(([from, to]) => [from.toLowerCase(), rgb(to)]));
  if (!lut.size) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const to = lut.get(hex(data[i], data[i + 1], data[i + 2]));
    if (to) [data[i], data[i + 1], data[i + 2]] = to;
  }
}
