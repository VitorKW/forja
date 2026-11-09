import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import CheerButtons from './CheerButtons';
import { fmt } from './ui';
import { EXERCISE_BY_ID } from '../game/exercises';
import { useGame } from '../useProgress';
import { useStore } from '../store';
import { notifyStart } from '../push';

/** Treino que tem menos de 4 horas ainda conta como "agora". */
const LIVE_MS = 4 * 3600000;

/** O par está treinando agora: séries, último exercício e incentivo na hora. */
export default function LiveCard() {
  const { profiles, partner } = useGame();
  const startWorkout = useStore((s) => s.startWorkout);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const other = profiles[partner];
  const live = other?.live;
  if (!live || live.finishedAt || now - new Date(live.startedAt).getTime() > LIVE_MS) return null;
  const mins = Math.max(1, Math.round((now - new Date(live.startedAt).getTime()) / 60000));
  const last = live.last && EXERCISE_BY_ID[live.last.exerciseId];

  return (
    <motion.section className="card live-card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="row between baseline">
        <span className="live-pill">
          <span className="live-dot" /> ao vivo
        </span>
        <span className="muted small">há {mins} min</span>
      </div>
      <h2>
        {other.name} está treinando{live.session ? `: ${live.session}` : ''}
      </h2>
      <p className="muted small">
        {live.sets} {live.sets === 1 ? 'série' : 'séries'}
        {last && live.last
          ? ` · agora: ${last.name}${last.kind === 'cardio' ? ` ${live.last.reps} min` : ` ${fmt(live.last.weight)} kg × ${live.last.reps}`}`
          : ''}
      </p>
      <CheerButtons toProfileId={other.id} workoutId={live.id} />
      <button
        className="primary"
        onClick={() => {
          startWorkout();
          notifyStart('treino junto');
        }}
      >
        Treinar junto
      </button>
      <p className="muted small">Abre seu treino com o placar dos dois lado a lado: tempo, séries, volume e km.</p>
    </motion.section>
  );
}
