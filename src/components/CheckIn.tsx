import { useState } from 'react';
import { motion } from 'motion/react';
import { dayKey } from '../game/rules';
import { cycleInfo, LEVELS, recoveryAdvice, type Level } from '../game/wellness';
import { useStore, type Profile } from '../store';

/** "Como você está hoje": sono, disposição e (se ligado) o ciclo. Um toque em cada. */
export default function CheckIn({ profile }: { profile: Profile }) {
  const { checkIn, setCycle } = useStore();
  const today = dayKey(new Date());
  const day = profile.wellness?.[today] ?? {};
  const [editing, setEditing] = useState(false);
  const answered = !!day.sleep && !!day.energy;
  const advice = recoveryAdvice(profile.wellness ?? {}, today);
  const cycle = cycleInfo(profile.cycle, today);
  const label = (v: Level | undefined, k: 'sleep' | 'energy') => LEVELS.find((l) => l.v === v)?.[k] ?? '—';

  return (
    <motion.section className="card checkin" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row between baseline">
        <h2>Como você está hoje</h2>
        {answered && !editing && (
          <button className="link small" onClick={() => setEditing(true)}>
            Mudar
          </button>
        )}
      </div>

      {answered && !editing ? (
        <p className="muted small">
          Sono: <strong>{label(day.sleep, 'sleep')}</strong> · Disposição: <strong>{label(day.energy, 'energy')}</strong>
        </p>
      ) : (
        (['sleep', 'energy'] as const).map((k) => (
          <div key={k} className="checkin-row">
            <span className="field-label">{k === 'sleep' ? 'Como dormiu?' : 'Disposição agora'}</span>
            <div className="seg" role="group" aria-label={k === 'sleep' ? 'Sono' : 'Disposição'}>
              {LEVELS.map((l) => (
                <button
                  key={l.v}
                  className={day[k] === l.v ? 'on' : ''}
                  aria-pressed={day[k] === l.v}
                  onClick={() => {
                    checkIn(today, { [k]: l.v });
                    if (k === 'energy' || day.energy) setEditing(false);
                  }}
                >
                  {l[k]}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {advice && (
        <div className="advice">
          <strong>{advice.title}</strong>
          <p className="muted small">{advice.text}</p>
        </div>
      )}

      {cycle && (
        <div className="advice" style={{ borderColor: 'var(--p1)' }}>
          <span className="cycle-pill">
            Dia {cycle.day} · {cycle.label}
          </span>
          <p className="muted small">
            {cycle.text}
            {cycle.phase !== 'menstrual' && cycle.phase !== 'atrasado' && ` Próxima menstruação em ~${cycle.nextIn} dias.`}
          </p>
          {cycle.phase !== 'menstrual' && (
            <button
              className="link small"
              onClick={() => profile.cycle && setCycle({ ...profile.cycle, starts: [...new Set([...profile.cycle.starts, today])].sort() })}
            >
              Menstruação começou hoje
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}
