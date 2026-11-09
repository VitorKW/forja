import { useEffect, useRef, useState } from 'react';
import { markSeen, unseen } from '../game/changelog';

/** Mostra uma vez o que mudou desde a última versão que a pessoa abriu. */
export default function WhatsNew() {
  // Só a última versão não vista e no máximo uma anterior, para não virar textão.
  const [list, setList] = useState(() => unseen().slice(0, 2));
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!list.length) return;
    close.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  });

  if (!list.length) return null;
  function dismiss() {
    markSeen();
    setList([]);
  }

  return (
    <div className="news-wrap" onClick={dismiss}>
      <div className="news panel" role="dialog" aria-modal="true" aria-labelledby="news-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="news-title">Novidades</h2>
        {list.map((r) => (
          <section key={r.version}>
            <p className="muted small">{new Date(`${r.date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
            <ul>
              {r.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
        <button ref={close} className="primary" onClick={dismiss}>
          Bora treinar
        </button>
      </div>
    </div>
  );
}
