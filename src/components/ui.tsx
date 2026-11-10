import type { LevelInfo } from '../game/rules';
import { heatAt } from '../heat';

/** Barra de progresso cujo preenchimento esquenta conforme avança. */
export function XpBar({ info, small, label }: { info: LevelInfo; small?: boolean; label?: string }) {
  const t = Math.min(1, info.into / info.need);
  return (
    <div
      className={`xpbar${small ? ' small' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(t * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="fill" style={{ width: `${t * 100}%`, background: `linear-gradient(90deg, #8e1b10, ${heatAt(t)})` }} />
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  label: string;
  suffix?: string;
}) {
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <label className="stepper">
      <span className="field-label">{label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => onChange(Math.max(min, round(value - step)))} aria-label={`Diminuir ${label}`}>
          −
        </button>
        <input
          inputMode="decimal"
          value={value}
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = Number(e.target.value.replace(',', '.'));
            if (!Number.isNaN(v)) onChange(Math.max(min, v));
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
        <button type="button" onClick={() => onChange(round(value + step))} aria-label={`Aumentar ${label}`}>
          +
        </button>
      </div>
    </label>
  );
}

export function fmt(n: number, digits = 1) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
}

/** Ícones desenhados para a navegação (no lugar de emoji). */
export function Icon({ name }: { name: 'forja' | 'dupla' | 'dieta' | 'chefes' | 'perfil' }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, 'aria-hidden': true };
  if (name === 'forja')
    return (
      <svg {...common}>
        <path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.2 1.6 1 2.7 2 3.2-.3-3.2.2-5.6 1-7.7z" />
        <path d="M5 21h14" />
      </svg>
    );
  if (name === 'dupla')
    return (
      <svg {...common}>
        <circle cx="8.5" cy="8" r="3" />
        <circle cx="15.5" cy="8" r="3" />
        <path d="M3 19c0-3 2.5-5 5.5-5 1.4 0 2.6.4 3.5 1.1.9-.7 2.1-1.1 3.5-1.1 3 0 5.5 2 5.5 5" />
      </svg>
    );
  if (name === 'dieta')
    return (
      <svg {...common}>
        <path d="M12 7c-1.5-1.6-4.5-2-6.2-.2C3.6 9 4.4 14 6.8 17.4 8.3 19.6 10 20.6 12 19.6c2 1 3.7 0 5.2-2.2 2.4-3.4 3.2-8.4 1-10.6C16.5 5 13.5 5.4 12 7z" />
        <path d="M12 7c0-2 1-3.5 3-4" />
      </svg>
    );
  if (name === 'chefes')
    return (
      <svg {...common}>
        <path d="M4 20 15 9M15 9l2-5 3 3-5 2" />
        <path d="M7 14l3 3M4 17l3 3" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    </svg>
  );
}
