import type { Attribute } from '../game/types';
import { heatColor } from '../heat';
import type { Look } from '../store';
import type { Appearance } from '../game/appearance';
import { useBodyUrl } from './body';

/**
 * Personagem em pixel art, feito com a skill pxl (fonte em art/personagem.px.js).
 * Cada camada é um PNG 34 × 38 do mesmo tamanho, empilhado por cima do corpo.
 * Cada atributo destrava uma peça de equipamento; o material melhora com o nível:
 * couro (2–3) → aço (4–5) → brasa (6–7) → ouro (8+).
 */

const W = 34;
const H = 38;
const sprite = (name: string) => `${import.meta.env.BASE_URL}sprites/${name}.png`;

type Material = 'couro' | 'aco' | 'brasa' | 'ouro';

function tier(level: number): Material | null {
  if (level >= 8) return 'ouro';
  if (level >= 6) return 'brasa';
  if (level >= 4) return 'aco';
  if (level >= 2) return 'couro';
  return null;
}

export const TIER_NAME = (level: number) =>
  level >= 8 ? 'de ouro' : level >= 6 ? 'em brasa' : level >= 4 ? 'de aço' : level >= 2 ? 'de couro' : null;

/** Camadas do personagem (nomes dos sprites), de trás para a frente. */
export function characterLayers(levels: Record<Attribute, number>, playerLevel: number, look: Look, capa?: string): string[] {
  const gear = (piece: string, level: number) => {
    const mat = tier(level);
    return mat ? `${piece}_${mat}` : null;
  };
  return [
    capa ? `capa_${capa}` : gear('capa', levels.folego),
    `corpo_${look}`,
    gear('grevas', levels.pernas),
    gear('peitoral', levels.core),
    gear('manoplas', levels.puxar),
    gear('ombreiras', levels.empurrar),
    // Elmo só em metal (aço, depois ouro): couro e brasa se confundem com cabelo.
    playerLevel >= 5 ? (playerLevel >= 8 ? 'elmo_ouro' : 'elmo_aco') : null,
    playerLevel >= 10 ? 'coroa' : null,
  ].filter((l): l is string => l !== null);
}

export default function Character({
  levels,
  playerLevel,
  look,
  scale = 9,
  capa,
  pet,
  appearance,
}: {
  levels: Record<Attribute, number>;
  playerLevel: number;
  look: Look;
  scale?: number;
  /** Capa cosmética da loja (substitui a de material). */
  capa?: string;
  /** Bichinho da loja, ao lado do personagem. */
  pet?: string;
  /** Cores de cabelo, olhos, pele e camiseta. */
  appearance?: Appearance;
}) {
  // Mantém o tamanho na tela do desenho antigo (24 unidades de largura), em pixels inteiros.
  const px = Math.max(1, Math.round((24 * scale) / W));

  const layers = characterLayers(levels, playerLevel, look, capa);
  const body = useBodyUrl(look, appearance);

  const aura = levels.folego >= 6 || playerLevel >= 8;
  const glow = heatColor(Math.min(10, Math.max(levels.folego, playerLevel)));

  return (
    <div
      className="character"
      role="img"
      aria-label="Seu personagem: cada peça de equipamento vem de um atributo"
      style={{
        width: W * px,
        height: H * px,
        filter: aura ? `drop-shadow(0 0 6px ${glow})` : undefined,
      }}
    >
      <span className="character-shadow" />
      <div className="idle">
        {layers.map((name) => {
          const src = name.startsWith('corpo_') ? body : sprite(name);
          return src ? <img key={name} src={src} alt="" width={W * px} height={H * px} draggable={false} /> : null;
        })}
      </div>
      {pet && (
        <img
          className="pet"
          src={sprite(`pet_${pet}`)}
          alt=""
          width={16 * px}
          height={14 * px}
          style={{ width: 16 * px, height: 14 * px, right: -12 * px, bottom: 0 }}
          draggable={false}
        />
      )}
    </div>
  );
}
