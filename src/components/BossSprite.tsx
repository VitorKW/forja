import { bossSpriteName, type BossDef } from '../game/campaign';

/**
 * Desenha um chefe da campanha (PNG feito com a skill pxl, fonte em art/chefes.px.js).
 * `px` é o tamanho de cada pixel do desenho antigo de 16 × 16, para manter o tamanho na tela.
 * `hidden` mostra só a silhueta (chefe ainda não revelado).
 */
export default function BossSprite({
  def,
  px = 8,
  hidden,
  defeated,
  className,
  sprite,
}: {
  /** Nome de outro PNG (ex.: chefe da semana em dupla). */
  sprite?: string;
  def: BossDef;
  px?: number;
  hidden?: boolean;
  defeated?: boolean;
  className?: string;
}) {
  const size = 16 * px;
  const cls = ['boss-sprite', hidden && 'hidden', defeated && 'defeated', className].filter(Boolean).join(' ');
  return (
    <img
      src={`${import.meta.env.BASE_URL}sprites/${sprite ?? bossSpriteName(def)}.png`}
      width={size}
      height={size}
      className={cls}
      alt={hidden ? 'Chefe ainda não revelado' : def.name}
      draggable={false}
    />
  );
}
