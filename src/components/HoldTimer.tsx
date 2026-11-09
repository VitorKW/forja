import { useEffect, useState } from 'react';
import { Stepper } from './ui';
import { beep, unlockSound } from './RestTimer';

/**
 * Cronômetro de isometria (prancha). Guarda o início, então segue certo mesmo se a
 * tela piscar. A série é registrada em blocos de 10 s (é assim que o XP conta).
 */
export default function HoldTimer({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (start === null) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [start]);

  const running = start !== null;
  const elapsed = running ? Math.floor((now - start) / 1000) : seconds;

  // Bipe a cada 30 s para saber o tempo sem olhar.
  useEffect(() => {
    if (running && elapsed > 0 && elapsed % 30 === 0) beep();
  }, [running, elapsed]);

  return (
    <div className="hold">
      <div className={`hold-clock num${running ? ' on' : ''}`} aria-live="off">
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
      </div>
      <button
        className={running ? 'primary' : 'ghost'}
        onClick={() => {
          if (running) {
            const s = Math.max(10, Math.round(elapsed / 10) * 10);
            onChange(s);
            setStart(null);
            navigator.vibrate?.([40, 60, 40]);
          } else {
            unlockSound();
            setNow(Date.now());
            setStart(Date.now());
          }
        }}
      >
        {running ? 'Parar' : 'Cronometrar'}
      </button>
      {!running && <Stepper label="Tempo" value={seconds} onChange={(v) => onChange(Math.max(10, v))} step={10} min={10} suffix="s" />}
    </div>
  );
}
