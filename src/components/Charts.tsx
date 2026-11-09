import { useRef, useState } from 'react';
import { fmt } from './ui';

/**
 * Gráficos simples de uma série (sem legenda: o título do card diz o que é).
 * Marcas finas, grade discreta, só o último valor rotulado, dica ao tocar/passar o dedo,
 * e uma tabela escondida para leitores de tela.
 */

const W = 320;
const H = 150;
const PAD = { l: 34, r: 12, t: 14, b: 22 };
const iw = W - PAD.l - PAD.r;
const ih = H - PAD.t - PAD.b;

export interface Point {
  label: string;
  value: number;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** and: barras (índice pela faixa); senão, ponto mais próximo (linhas). */
function useHover(count: number, band = false) {
  const ref = useRef<SVGSVGElement>(null);
  const [i, setI] = useState<number | null>(null);
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || count === 0) return;
    const x = ((e.clientX - r.left) / r.width) * W - PAD.l;
    const k = band ? Math.floor(x / (iw / count)) : count > 1 ? Math.round(x / (iw / (count - 1))) : 0;
    setI(Math.max(0, Math.min(count - 1, k)));
  };
  return { ref, i, onMove, onLeave: () => setI(null) };
}

function Table({ data, unit, caption }: { data: Point[]; unit: string; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {data.map((d, k) => (
          <tr key={k}>
            <th>{d.label}</th>
            <td>
              {fmt(d.value)} {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Grid({ max, min = 0 }: { max: number; min?: number }) {
  const ticks = [min, (min + max) / 2, max];
  return (
    <g className="chart-grid">
      {ticks.map((t, k) => {
        const y = PAD.t + ih - ((t - min) / (max - min || 1)) * ih;
        return (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} />
            <text x={PAD.l - 6} y={y + 3} textAnchor="end">
              {fmt(t, 0)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Tip({ x, y, text }: { x: number; y: number; text: string }) {
  const left = Math.max(8, Math.min(92, (x / W) * 100));
  return (
    <div className="chart-tip" style={{ left: `${left}%`, top: `${(y / H) * 100}%` }}>
      {text}
    </div>
  );
}

export function BarChart({ data, unit, caption }: { data: Point[]; unit: string; caption: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const slot = iw / Math.max(1, data.length);
  const bw = Math.max(4, slot - 6);
  const { ref, i, onMove, onLeave } = useHover(data.length, true);
  const xOf = (k: number) => PAD.l + k * slot + (slot - bw) / 2;
  const hOf = (v: number) => (v / max) * ih;
  const last = data.length - 1;

  return (
    <div className="chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave}>
        <Grid max={max} />
        {data.map((d, k) => {
          const h = hOf(d.value);
          const x = xOf(k);
          const y = PAD.t + ih - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <path
              key={k}
              className={`bar${i === k ? ' on' : ''}${i !== null && i !== k ? ' dim' : ''}`}
              d={h <= 0 ? '' : `M${x},${PAD.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${PAD.t + ih} Z`}
            />
          );
        })}
        {data.map((d, k) => {
          const step = Math.ceil(data.length / 6);
          // Rótulos a cada `step` barras, sem encostar no último.
          return (k % step === 0 && last - k >= step) || k === last ? (
            <text key={k} className="chart-x" x={xOf(k) + bw / 2} y={H - 6} textAnchor="middle">
              {d.label}
            </text>
          ) : null;
        })}
        {last >= 0 && i === null && data[last].value > 0 && (
          <text className="chart-label" x={xOf(last) + bw / 2} y={PAD.t + ih - hOf(data[last].value) - 4} textAnchor="middle">
            {fmt(data[last].value, 0)}
          </text>
        )}
      </svg>
      {i !== null && data[i] && <Tip x={xOf(i) + bw / 2} y={PAD.t + ih - hOf(data[i].value)} text={`${data[i].label}: ${fmt(data[i].value, 0)} ${unit}`} />}
      <Table data={data} unit={unit} caption={caption} />
    </div>
  );
}

export function LineChart({ data, unit, caption }: { data: Point[]; unit: string; caption: string }) {
  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.max(1, hi * 0.1);
  const min = Math.max(0, Math.floor(lo - span * 0.25));
  const max = Math.ceil(hi + span * 0.25);
  const { ref, i, onMove, onLeave } = useHover(data.length);
  const xOf = (k: number) => PAD.l + (data.length > 1 ? (k / (data.length - 1)) * iw : iw / 2);
  const yOf = (v: number) => PAD.t + ih - ((v - min) / (max - min || 1)) * ih;
  const d = data.map((p, k) => `${k ? 'L' : 'M'}${xOf(k)},${yOf(p.value)}`).join(' ');
  const last = data.length - 1;

  return (
    <div className="chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave}>
        <Grid max={max} min={min} />
        <path className="line" d={d} />
        {i !== null && <line className="crosshair" x1={xOf(i)} x2={xOf(i)} y1={PAD.t} y2={PAD.t + ih} />}
        {data.map((p, k) =>
          k === last || k === i ? <circle key={k} className="dot" cx={xOf(k)} cy={yOf(p.value)} r={4} /> : null,
        )}
        {[0, last].filter((k, n, arr) => k >= 0 && arr.indexOf(k) === n).map((k) => (
          <text key={k} className="chart-x" x={xOf(k)} y={H - 6} textAnchor={k === 0 && last > 0 ? 'start' : 'end'}>
            {data[k].label}
          </text>
        ))}
        {last >= 0 && i === null && (
          <text className="chart-label" x={xOf(last) - 6} y={yOf(data[last].value) - 8} textAnchor="end">
            {fmt(data[last].value)} {unit}
          </text>
        )}
      </svg>
      {i !== null && data[i] && <Tip x={xOf(i)} y={yOf(data[i].value)} text={`${data[i].label}: ${fmt(data[i].value)} ${unit}`} />}
      <Table data={data} unit={unit} caption={caption} />
    </div>
  );
}
