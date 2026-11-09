/** Selo de conquista: um medalhão cunhado com as iniciais. Aço frio enquanto bloqueado. */
export default function Seal({ name, unlocked, size = 44 }: { name: string; unlocked: boolean; size?: number }) {
  const initials = name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden className={`seal${unlocked ? ' on' : ''}`}>
      <circle cx="22" cy="22" r="20" className="seal-rim" />
      <circle cx="22" cy="22" r="15" className="seal-face" />
      <text x="22" y="27" textAnchor="middle" className="seal-text">
        {initials}
      </text>
    </svg>
  );
}
