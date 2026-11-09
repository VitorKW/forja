import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/**
 * Descanso entre séries. Guarda o fim como horário (não como contagem), então continua certo
 * se o celular bloquear a tela ou o app for para o fundo. No fim: vibra e toca um bipe curto.
 */

let audio: AudioContext | null = null;

/** Chame dentro de um toque: o iPhone só libera som depois de um gesto do usuário. */
export function unlockSound() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    /* sem som: só vibra */
  }
}

function beep() {
  if (!audio) return;
  try {
    const t = audio.currentTime;
    [0, 0.18].forEach((d, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = 'square';
      o.frequency.value = i ? 1320 : 990;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
      o.connect(g).connect(audio!.destination);
      o.start(t + d);
      o.stop(t + d + 0.15);
    });
  } catch {
    /* ignora */
  }
}

const KEY = 'forja-rest';

/** Estado do descanso, salvo na sessão para sobreviver a recarregar a página. */
export function useRest(workoutId: string) {
  const [until, setUntilState] = useState<{ end: number; total: number } | null>(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { id: string; end: number; total: number } | null;
      return raw && raw.id === workoutId && raw.end > Date.now() ? { end: raw.end, total: raw.total } : null;
    } catch {
      return null;
    }
  });
  const set = (v: { end: number; total: number } | null) => {
    setUntilState(v);
    try {
      if (v) sessionStorage.setItem(KEY, JSON.stringify({ id: workoutId, ...v }));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* ignora */
    }
  };
  return {
    rest: until,
    start: (seconds: number) => set({ end: Date.now() + seconds * 1000, total: seconds }),
    add: (seconds: number) => until && set({ end: Math.max(Date.now() + 5000, until.end + seconds * 1000), total: Math.max(5, until.total + seconds) }),
    stop: () => set(null),
  };
}

function mmss(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function RestTimer({ rest, now, onAdd, onStop }: { rest: { end: number; total: number } | null; now: number; onAdd: (s: number) => void; onStop: () => void }) {
  const [over, setOver] = useState(false);
  const fired = useRef<number | null>(null);
  const left = rest ? (rest.end - now) / 1000 : 0;

  useEffect(() => {
    if (!rest || left > 0 || fired.current === rest.end) return;
    fired.current = rest.end;
    // Só avisa se acabou agora (não se o app voltou do fundo muito depois).
    if (now - rest.end < 5000) {
      navigator.vibrate?.([220, 120, 220]);
      beep();
    }
    setOver(true);
    onStop();
  }, [rest, left, now, onStop]);

  useEffect(() => {
    if (!over) return;
    const t = setTimeout(() => setOver(false), 3500);
    return () => clearTimeout(t);
  }, [over]);
  // Começou outro descanso: some o aviso antigo.
  useEffect(() => {
    if (rest) setOver(false);
  }, [rest]);

  const pct = rest ? Math.min(100, Math.max(0, (left / rest.total) * 100)) : 0;

  return (
    <AnimatePresence mode="wait">
      {rest && left > 0 ? (
        <motion.div key="rest" className="rest-bar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} role="timer" aria-live="off">
          <div className="rest-fill" style={{ width: `${pct}%` }} />
          <div className="rest-body">
            <div>
              <div className="muted small">Descanso</div>
              <div className="rest-time num">{mmss(left)}</div>
            </div>
            <div className="rest-actions">
              <button className="rest-btn" onClick={() => onAdd(-15)} aria-label="Menos 15 segundos">
                −15
              </button>
              <button className="rest-btn" onClick={() => onAdd(15)} aria-label="Mais 15 segundos">
                +15
              </button>
              <button className="rest-btn skip" onClick={onStop}>
                Pular
              </button>
            </div>
          </div>
        </motion.div>
      ) : over ? (
        <motion.div key="go" className="rest-bar go" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} role="status">
          <div className="rest-body">
            <strong>Descanso acabou. Próxima série!</strong>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
