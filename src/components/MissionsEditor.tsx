import { useState } from 'react';
import { DEFAULT_MISSIONS, MAX_MISSIONS, MIN_MISSIONS, MISSION_CATALOG, type MissionConfig } from '../game/extras';

/** Escolher de 3 a 5 missões do catálogo ou criar as suas. */
export default function MissionsEditor({ value, onSave, onClose }: { value?: MissionConfig; onSave: (m: MissionConfig) => void; onClose: () => void }) {
  const [active, setActive] = useState<string[]>(value?.active?.length ? value.active : DEFAULT_MISSIONS);
  const [custom, setCustom] = useState(value?.custom ?? []);
  const [text, setText] = useState('');
  const all = [...MISSION_CATALOG.map((m) => ({ id: m.id, label: m.label, mine: false })), ...custom.map((m) => ({ ...m, mine: true }))];
  const full = active.length >= MAX_MISSIONS;

  const toggle = (id: string) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : full ? a : [...a, id]));
  const add = () => {
    const label = text.trim().slice(0, 50);
    if (!label) return;
    const id = `c-${Date.now().toString(36)}`;
    setCustom((c) => [...c, { id, label }]);
    if (!full) setActive((a) => [...a, id]);
    setText('');
  };
  const remove = (id: string) => {
    setCustom((c) => c.filter((m) => m.id !== id));
    setActive((a) => a.filter((x) => x !== id));
  };

  return (
    <div className="missions-editor">
      <p className="muted small">
        Escolha de {MIN_MISSIONS} a {MAX_MISSIONS} ({active.length} escolhidas). Cada uma vale 10 XP; cumprir 3 ou mais no dia dá moedas.
      </p>
      <ul className="mission-pick">
        {all.map((m) => {
          const on = active.includes(m.id);
          return (
            <li key={m.id}>
              <button className={`habit${on ? ' on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => toggle(m.id)}>
                <span className="check" aria-hidden />
                <span className="grow">{m.label}</span>
              </button>
              {m.mine && (
                <button className="icon-btn" aria-label={`Apagar ${m.label}`} onClick={() => remove(m.id)}>
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="sync-join">
        <input className="search" maxLength={50} placeholder="Criar missão (ex.: Fiz 20 flexões)" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Nova missão" />
        <button className="ghost" disabled={!text.trim()} onClick={add}>
          Criar
        </button>
      </div>
      <div className="backup-row">
        <button className="ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary" disabled={active.length < MIN_MISSIONS} onClick={() => onSave({ active, custom })}>
          Salvar
        </button>
      </div>
    </div>
  );
}
