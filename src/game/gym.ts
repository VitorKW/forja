/** Ferramentas de academia: anilhas por lado e séries de aquecimento. */

/** Exercícios feitos com barra olímpica (para a conta das anilhas). */
export const BARBELL = new Set(['supino', 'supino-inclinado', 'desenvolvimento', 'remada-curvada', 'agachamento', 'terra', 'stiff', 'hip-thrust', 'supino-declinado', 'supino-fechado', 'agachamento-frontal', 'terra-sumo', 'good-morning']);
/** Multiarticulares pesados que pedem aquecimento progressivo. */
export const NEEDS_WARMUP = new Set([...BARBELL, 'leg-press', 'leg-press-45', 'hack', 'supino-halter']);

export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const BARS = [20, 15, 10] as const;

/** Anilhas de cada lado para chegar na carga (a maior primeiro). `left` = o que não deu para montar. */
export function platesFor(total: number, bar = 20, plates: readonly number[] = PLATES): { perSide: number[]; left: number } {
  let side = Math.round(((total - bar) / 2) * 100) / 100;
  if (side <= 0) return { perSide: [], left: 0 };
  const perSide: number[] = [];
  for (const p of plates) {
    while (side >= p - 1e-9) {
      perSide.push(p);
      side = Math.round((side - p) * 100) / 100;
    }
  }
  return { perSide, left: Math.round(side * 2 * 100) / 100 };
}

const round25 = (n: number) => Math.round(n / 2.5) * 2.5;

/**
 * Aquecimento até a carga de trabalho: barra vazia × 10 (se for de barra), depois
 * 40% × 8, 60% × 5 e 80% × 3. Cargas leves pedem menos (abaixo de 1,5× a barra, nada).
 */
export function warmupFor(work: number, barbell: boolean, bar = 20): { weight: number; reps: number }[] {
  const floor = barbell ? bar : 0;
  if (work < (barbell ? bar * 1.5 : 30)) return [];
  const steps: [number, number][] = work >= 60 ? [[0.4, 8], [0.6, 5], [0.8, 3]] : [[0.5, 8], [0.75, 4]];
  const out: { weight: number; reps: number }[] = barbell ? [{ weight: bar, reps: 10 }] : [];
  for (const [pct, reps] of steps) {
    const w = Math.max(floor, round25(work * pct));
    if (w >= work || out.some((s) => s.weight === w)) continue;
    out.push({ weight: w, reps });
  }
  return out;
}
