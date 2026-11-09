/**
 * Escala de calor do metal: o nível vira a cor que um ferreiro reconheceria.
 * Nível 1 = aço frio; 10+ = branco-quente.
 */
export const HEAT = [
  '#5a6068', // 1  frio
  '#8e1b10', // 2  rubro escuro
  '#a82315', // 3  rubro
  '#c8321a', // 4  cereja
  '#dc4a1c', // 5  cereja clara
  '#ef6a1f', // 6  laranja
  '#f58f2a', // 7  laranja claro
  '#f7b538', // 8  amarelo
  '#fbd77a', // 9  amarelo claro
  '#fff1c9', // 10 branco-quente
] as const;

export function heatColor(level: number): string {
  return HEAT[Math.max(0, Math.min(HEAT.length - 1, level - 1))];
}

/** Cor ao longo de uma barra de progresso (0–1), do rubro ao amarelo. */
export function heatAt(t: number): string {
  const i = 1 + Math.round(Math.max(0, Math.min(1, t)) * 7);
  return HEAT[i];
}
