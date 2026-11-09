import { useMemo } from 'react';
import { bossSprite, type BossDef } from '../game/campaign';

/** Desenha um chefe da campanha em pixel art. `hidden` mostra só a silhueta (chefe ainda não revelado). */
export default function BossSprite({
  def,
  px = 8,
  hidden,
  defeated,
  className,
}: {
  def: BossDef;
  px?: number;
  hidden?: boolean;
  defeated?: boolean;
  className?: string;
}) {
  const grid = useMemo(() => bossSprite(def), [def]);
  const [body, shadow, light, eye] = def.palette;
  const color = (c: string) => {
    if (hidden) return c === 'k' ? '#0f1012' : '#2a2d32';
    switch (c) {
      case 'k':
        return '#0f0c0a';
      case 'b':
        return body;
      case 'd':
        return shadow;
      case 'h':
        return light;
      case 'e':
        return defeated ? '#0f0c0a' : eye;
      case 'm':
        return '#2a0806';
      case 't':
        return '#f4ecdc';
      case 'x':
        return '#e8dcc0';
    }
    return null;
  };
  const n = grid.length;
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={n * px}
      height={n * px}
      shapeRendering="crispEdges"
      className={`boss-sprite${defeated ? ' defeated' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={hidden ? 'Chefe ainda não revelado' : def.name}
    >
      {grid.flatMap((row, y) =>
        row.map((c, x) => {
          const fill = c === '.' ? null : color(c);
          return fill ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} /> : null;
        }),
      )}
    </svg>
  );
}
