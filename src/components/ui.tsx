import type { LevelInfo } from '../game/rules';

export function XpBar({ info, small }: { info: LevelInfo; small?: boolean }) {
  const pct = Math.min(100, (info.into / info.need) * 100);
  return (
    <div className={`xpbar${small ? ' small' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="fill" style={{ width: `${pct}%` }} />
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
      <span className="stepper-label">{label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => onChange(Math.max(min, round(value - step)))} aria-label={`Diminuir ${label}`}>
          −
        </button>
        <input
          inputMode="decimal"
          value={value}
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
