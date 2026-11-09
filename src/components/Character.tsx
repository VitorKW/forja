import type { Attribute } from '../game/types';

/** Silhueta que "acende" conforme o nível de cada atributo. */
export default function Character({ levels, size = 180 }: { levels: Record<Attribute, number>; size?: number }) {
  const glow = (a: Attribute) => Math.min(1, 0.18 + (levels[a] - 1) * 0.09);
  const part = (a: Attribute) => ({ fill: 'var(--ember)', fillOpacity: glow(a), filter: levels[a] > 1 ? 'url(#brilho)' : undefined });

  return (
    <svg viewBox="0 0 200 260" width={size} height={size * 1.3} className="character" aria-label="Seu personagem">
      <defs>
        <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* cabeça */}
      <circle cx="100" cy="32" r="20" fill="var(--steel)" />
      {/* ombros e peito — Empurrar */}
      <path d="M58 64 Q100 50 142 64 L136 108 Q100 116 64 108 Z" {...part('empurrar')} />
      {/* braços — Puxar */}
      <path d="M56 66 L40 140 L52 144 L68 96 Z" {...part('puxar')} />
      <path d="M144 66 L160 140 L148 144 L132 96 Z" {...part('puxar')} />
      {/* abdômen — Core */}
      <path d="M66 112 Q100 120 134 112 L128 150 Q100 156 72 150 Z" {...part('core')} />
      {/* pernas — Pernas */}
      <path d="M72 154 L98 158 L94 240 L74 240 Z" {...part('pernas')} />
      <path d="M128 154 L102 158 L106 240 L126 240 Z" {...part('pernas')} />
      {/* coração — Fôlego */}
      <circle cx="112" cy="84" r="7" fill="var(--gold)" fillOpacity={glow('folego')} filter={levels.folego > 1 ? 'url(#brilho)' : undefined} />
      {/* contorno */}
      <g fill="none" stroke="var(--line)" strokeWidth="1.5">
        <path d="M58 64 Q100 50 142 64 L136 108 Q100 116 64 108 Z" />
        <path d="M66 112 Q100 120 134 112 L128 150 Q100 156 72 150 Z" />
      </g>
    </svg>
  );
}
