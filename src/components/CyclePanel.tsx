import { useState } from 'react';
import { dayKey } from '../game/rules';
import { cycleInfo, cycleLength } from '../game/wellness';
import { useStore } from '../store';
import { useGame } from '../useProgress';

const br = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** Ciclo menstrual: opcional e privado (fica só neste celular). */
export default function CyclePanel() {
  const { profile, profiles, partner } = useGame();
  const setCycle = useStore((s) => s.setCycle);
  const cfg = profile.cycle ?? { on: false, starts: [] };
  const today = dayKey(new Date());
  const [date, setDate] = useState(today);
  const info = cycleInfo(cfg, today);
  const starts = [...cfg.starts].sort().reverse();

  return (
    <section className="panel">
      <h2>Ciclo menstrual</h2>
      <label className="setting">
        Acompanhar o ciclo
        <input type="checkbox" checked={cfg.on} onChange={(e) => setCycle({ ...cfg, on: e.target.checked })} />
      </label>
      <p className="muted small">
        Opcional. Fica <strong>só neste celular</strong>: não vai para a nuvem e {profiles[partner]?.name ?? 'o par'} não vê. Serve para o app não cobrar carga
        nova na menstruação e nos dias antes dela.
      </p>
      {cfg.on && (
        <>
          <div className="sync-join">
            <input className="search" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Primeiro dia da menstruação" />
            <button className="ghost" disabled={!date || cfg.starts.includes(date)} onClick={() => setCycle({ ...cfg, starts: [...cfg.starts, date].sort() })}>
              Registrar início
            </button>
          </div>
          {info && (
            <p className="small">
              Hoje: dia {info.day} · {info.label}. Ciclo médio de {cycleLength(cfg.starts)} dias.
            </p>
          )}
          {starts.length > 0 && (
            <ul className="records">
              {starts.slice(0, 6).map((d) => (
                <li key={d}>
                  <span>Início em {br(d)}</span>
                  <button className="icon-btn" aria-label={`Apagar início em ${br(d)}`} onClick={() => setCycle({ ...cfg, starts: cfg.starts.filter((x) => x !== d) })}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
