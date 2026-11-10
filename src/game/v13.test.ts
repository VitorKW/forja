import { describe, expect, it } from 'vitest';
import { colorMap, recolorPixels, resolve } from './appearance';

describe('aparência do boneco', () => {
  it('padrão não troca nenhuma cor', () => {
    expect(colorMap('a', undefined)).toEqual({});
    expect(colorMap('b', {})).toEqual({});
    expect(resolve('b', undefined).hair).toBe('ruivo');
  });

  it('trocar o cabelo mapeia as 3 cores do cabelo', () => {
    const m = colorMap('a', { hair: 'loiro' });
    expect(Object.keys(m).sort()).toEqual(['#2e1a0f', '#4a2c1a', '#6e452b']);
  });

  it('olhos mapeiam só a cor do olho', () => {
    const m = colorMap('a', { eyes: 'azul' });
    expect(Object.keys(m)).toEqual(['#2a1d3a']);
  });

  it('recolore pixels exatos e ignora os transparentes', () => {
    const px = new Uint8ClampedArray([0x2a, 0x1d, 0x3a, 255, 0x2a, 0x1d, 0x3a, 0, 1, 2, 3, 255]);
    recolorPixels(px, { '#2a1d3a': '#ff0000' });
    expect([...px.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...px.slice(4, 8)]).toEqual([0x2a, 0x1d, 0x3a, 0]);
    expect([...px.slice(8)]).toEqual([1, 2, 3, 255]);
  });
});
