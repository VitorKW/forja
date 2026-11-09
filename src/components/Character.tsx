import type { Attribute } from '../game/types';
import { heatColor } from '../heat';

/**
 * O personagem como metal sobre a bigorna: cada parte do corpo tem a cor
 * de calor do nível do atributo correspondente.
 */
export default function Character({ levels, size = 220 }: { levels: Record<Attribute, number>; size?: number }) {
  const part = (a: Attribute) => ({
    fill: heatColor(levels[a]),
    filter: levels[a] >= 2 ? 'url(#incandescente)' : undefined,
  });

  return (
    <svg viewBox="0 0 220 300" width={size} height={(size * 300) / 220} className="character" role="img" aria-label="Seu personagem: cada parte brilha conforme o nível do atributo">
      <defs>
        <filter id="incandescente" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.75 0" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="aco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4f56" />
          <stop offset="1" stopColor="#2a2d32" />
        </linearGradient>
        <linearGradient id="reflexo" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id="calor-chao" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ef6a1f" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ef6a1f" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* brilho sobre a bigorna */}
      <ellipse cx="110" cy="236" rx="96" ry="22" fill="url(#calor-chao)" />

      {/* cabeça */}
      <circle cx="110" cy="30" r="19" fill="#4a4f56" />
      {/* ombros e peito: Empurrar */}
      <path d="M66 60 Q110 46 154 60 L148 104 Q110 112 72 104 Z" {...part('empurrar')} />
      {/* braços: Puxar */}
      <path d="M63 63 L46 136 L58 140 L76 94 Z" {...part('puxar')} />
      <path d="M157 63 L174 136 L162 140 L144 94 Z" {...part('puxar')} />
      {/* abdômen: Core */}
      <path d="M74 108 Q110 116 146 108 L140 146 Q110 152 80 146 Z" {...part('core')} />
      {/* pernas: Pernas */}
      <path d="M80 150 L106 154 L102 226 L82 226 Z" {...part('pernas')} />
      <path d="M140 150 L114 154 L118 226 L138 226 Z" {...part('pernas')} />
      {/* reflexo do metal: luz de cima, sem mudar a cor do nível */}
      <g fill="url(#reflexo)" pointerEvents="none">
        <path d="M66 60 Q110 46 154 60 L148 104 Q110 112 72 104 Z" />
        <path d="M63 63 L46 136 L58 140 L76 94 Z" />
        <path d="M157 63 L174 136 L162 140 L144 94 Z" />
        <path d="M74 108 Q110 116 146 108 L140 146 Q110 152 80 146 Z" />
        <path d="M80 150 L106 154 L102 226 L82 226 Z" />
        <path d="M140 150 L114 154 L118 226 L138 226 Z" />
      </g>
      {/* coração: Fôlego */}
      <circle cx="122" cy="80" r="7" fill={heatColor(levels.folego + 2)} filter={levels.folego >= 2 ? 'url(#incandescente)' : undefined} />

      {/* bigorna */}
      <path d="M34 228 H186 Q186 240 170 242 L150 244 L146 262 H74 L70 244 L50 242 Q34 240 34 228 Z" fill="url(#aco)" />
      <path d="M34 228 H186" stroke="#6b717a" strokeWidth="1.5" />
      <rect x="62" y="262" width="96" height="14" rx="2" fill="#2a2d32" />
    </svg>
  );
}
