import { useMemo, useState } from 'react';
import { countsAsWorkout, dayKey } from '../game/rules';
import type { Workout } from '../game/types';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pad = (n: number) => String(n).padStart(2, '0');

function trainedDays(ws: Workout[]): Set<string> {
  return new Set(ws.filter((w) => w.finishedAt && countsAsWorkout(w)).map((w) => dayKey(new Date(w.finishedAt!))));
}

/** O ano dos dois: uma linha por mês, um quadrado por dia, cor de quem treinou. */
export default function YearCalendar({ names, workouts }: { names: [string, string]; workouts: [Workout[], Workout[]] }) {
  const today = dayKey(new Date());
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [picked, setPicked] = useState<string | null>(null);
  const days = useMemo(() => workouts.map(trainedDays) as [Set<string>, Set<string>], [workouts]);
  const firstYear = useMemo(() => {
    const all = [...days[0], ...days[1]].sort();
    return all.length ? Number(all[0].slice(0, 4)) : thisYear;
  }, [days, thisYear]);

  const count = (i: 0 | 1) => [...days[i]].filter((d) => d.startsWith(`${year}-`)).length;
  const both = [...days[0]].filter((d) => d.startsWith(`${year}-`) && days[1].has(d)).length;

  const describe = (key: string) => {
    const a = days[0].has(key);
    const b = days[1].has(key);
    const [y, m, d] = key.split('-');
    const when = `${d}/${m}/${y}`;
    if (a && b) return `${when}: os dois treinaram`;
    if (a) return `${when}: ${names[0]} treinou`;
    if (b) return `${when}: ${names[1]} treinou`;
    return `${when}: ninguém treinou`;
  };

  return (
    <section className="card">
      <div className="row between baseline">
        <h2>O ano de vocês</h2>
        <div className="month-nav">
          <button className="icon-btn" aria-label="Ano anterior" disabled={year <= firstYear} onClick={() => setYear(year - 1)}>
            ‹
          </button>
          <span className="num">{year}</span>
          <button className="icon-btn" aria-label="Próximo ano" disabled={year >= thisYear} onClick={() => setYear(year + 1)}>
            ›
          </button>
        </div>
      </div>

      <div className="cal" role="grid" aria-label={`Dias de treino em ${year}`}>
        {MONTHS.map((label, m) => {
          const len = new Date(year, m + 1, 0).getDate();
          return (
            <div key={m} className="cal-row" role="row">
              <span className="cal-month muted" role="rowheader">
                {label}
              </span>
              {Array.from({ length: 31 }, (_, i) => {
                if (i >= len) return <span key={i} className="cal-cell none" aria-hidden />;
                const key = `${year}-${pad(m + 1)}-${pad(i + 1)}`;
                const a = days[0].has(key);
                const b = days[1].has(key);
                const cls = a && b ? 'both' : a ? 'p0' : b ? 'p1' : key > today ? 'future' : '';
                return (
                  <button
                    key={i}
                    role="gridcell"
                    className={`cal-cell ${cls}${key === today ? ' today' : ''}${key === picked ? ' picked' : ''}`}
                    aria-label={describe(key)}
                    title={describe(key)}
                    onClick={() => setPicked(key === picked ? null : key)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="muted small cal-picked" aria-live="polite">
        {picked ? describe(picked) : 'Toque num dia para ver quem treinou.'}
      </p>
      <div className="raid-legend cal-legend">
        <span>
          <i className="swatch p0" />
          {names[0]} <strong className="num">{count(0)}</strong>
        </span>
        <span>
          <i className="swatch p1" />
          {names[1]} <strong className="num">{count(1)}</strong>
        </span>
        <span>
          <i className="swatch both" />
          Os dois <strong className="num">{both}</strong>
        </span>
      </div>
    </section>
  );
}
