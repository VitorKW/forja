import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EXERCISE_BY_ID } from '../game/exercises';
import { GOALS, SPLIT_LABEL, buildProgram, prescription, programToday, type Goal, type ProgramConfig } from '../game/program';
import { nextWeek, weekKey } from '../game/rules';
import { useStore, type Profile } from '../store';
import { notifyStart } from '../push';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

function Setup({ profile, onDone, onCancel }: { profile: Profile; onDone: (p: ProgramConfig) => void; onCancel?: () => void }) {
  const prev = profile.program;
  const [goal, setGoal] = useState<Goal>(prev?.goal ?? 'hipertrofia');
  const [days, setDays] = useState(prev?.days ?? Math.max(2, Math.min(6, profile.settings.weeklyGoal)));
  const [weeks, setWeeks] = useState<6 | 8>(prev?.weeks ?? 6);
  const [when, setWhen] = useState<'agora' | 'segunda'>('agora');
  const week1 = buildProgram({ goal, days, weeks })[0];

  return (
    <div className="bet-form program-setup">
      <div className="field">
        <span className="field-label">Objetivo</span>
        <div className="chips">
          {GOALS.map((g) => (
            <button key={g.id} className={`chip${goal === g.id ? ' on' : ''}`} onClick={() => setGoal(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
        <p className="muted small">{GOALS.find((g) => g.id === goal)?.hint}</p>
      </div>
      <div className="field">
        <span className="field-label">Dias por semana</span>
        <div className="chips">
          {[2, 3, 4, 5, 6].map((d) => (
            <button key={d} className={`chip${days === d ? ' on' : ''}`} onClick={() => setDays(d)}>
              {d}
            </button>
          ))}
        </div>
        <p className="muted small">Divisão: {SPLIT_LABEL[days]}.</p>
      </div>
      <div className="field">
        <span className="field-label">Duração do bloco</span>
        <div className="chips">
          {([6, 8] as const).map((w) => (
            <button key={w} className={`chip${weeks === w ? ' on' : ''}`} onClick={() => setWeeks(w)}>
              {w} semanas
            </button>
          ))}
        </div>
        <p className="muted small">A última semana é de deload (metade das séries, carga mais leve) para recuperar.</p>
      </div>
      <div className="field">
        <span className="field-label">Começar</span>
        <div className="chips">
          <button className={`chip${when === 'agora' ? ' on' : ''}`} onClick={() => setWhen('agora')}>
            Nesta semana
          </button>
          <button className={`chip${when === 'segunda' ? ' on' : ''}`} onClick={() => setWhen('segunda')}>
            Na segunda
          </button>
        </div>
      </div>
      <details className="custom-food">
        <summary>Ver a semana 1</summary>
        {week1.sessions.map((s) => (
          <div key={s.name} className="plan-preview">
            <strong>{s.name}</strong>
            <ul>
              {s.slots.map((x) => (
                <li key={x.exerciseId}>
                  <span>{EXERCISE_BY_ID[x.exerciseId]?.name}</span>
                  <span className="num muted">{prescription(x)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>
      <button
        className="primary big"
        onClick={() => {
          const start = weekKey(new Date());
          onDone({ id: uid(), goal, days, weeks, startWeek: when === 'agora' ? start : nextWeek(start) });
        }}
      >
        {prev ? 'Começar novo bloco' : 'Montar programa'}
      </button>
      {onCancel && (
        <button className="link center" onClick={onCancel}>
          Cancelar
        </button>
      )}
      <p className="muted small">Referência geral, não é prescrição. Sentiu dor ou tem lesão? Fale com um profissional.</p>
    </div>
  );
}

export default function ProgramCard({ profile }: { profile: Profile }) {
  const { setProgram, startWorkout } = useStore();
  const [editing, setEditing] = useState(false);
  const cfg = profile.program;

  if (!cfg || editing) {
    return (
      <section className="card program">
        <span className="eyebrow">Programa de treino</span>
        <h2>{cfg ? 'Novo bloco' : 'Treino montado para você'}</h2>
        {!cfg && !editing ? (
          <>
            <p className="muted small">Um bloco de 6 ou 8 semanas com divisão, séries, reps e RIR que evoluem toda semana. O app sugere a carga de cada exercício.</p>
            <button className="ghost" onClick={() => setEditing(true)}>
              Montar meu programa
            </button>
          </>
        ) : (
          <Setup
            profile={profile}
            onDone={(p) => {
              setProgram(p);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        )}
      </section>
    );
  }

  const today = programToday(cfg, profile.workouts);
  const goal = GOALS.find((g) => g.id === cfg.goal)?.label;

  if (today.week < 1) {
    return (
      <section className="card program">
        <span className="eyebrow">Programa · {goal}</span>
        <h2>Começa na segunda</h2>
        <p className="muted small">
          {SPLIT_LABEL[cfg.days]}, {cfg.weeks} semanas.
        </p>
        <button className="link small" onClick={() => setEditing(true)}>
          Mudar
        </button>
      </section>
    );
  }

  if (today.finished || !today.current) {
    return (
      <section className="card program">
        <span className="eyebrow">Programa · {goal}</span>
        <h2>Bloco concluído 🎉</h2>
        <p className="muted small">Foram {cfg.weeks} semanas. Monte o próximo: as cargas de partida vêm do que você fez agora.</p>
        <div className="backup-row">
          <button className="primary" onClick={() => setEditing(true)}>
            Próximo bloco
          </button>
          <button className="ghost" onClick={() => setProgram(null)}>
            Encerrar
          </button>
        </div>
      </section>
    );
  }

  const wk = today.current;
  const next = today.next !== null ? wk.sessions[today.next] : null;

  return (
    <section className="card program">
      <div className="row between baseline">
        <span className="eyebrow">Programa · {goal}</span>
        <span className="muted small">
          Semana {today.week} de {cfg.weeks}
        </span>
      </div>
      <h2>
        {wk.phase}
        {wk.deload && <span className="bet-tag deload-tag">recuperação</span>}
      </h2>
      <ol className="plan-weeks" aria-label="Semanas do bloco">
        {Array.from({ length: cfg.weeks }, (_, i) => (
          <li key={i} className={i + 1 < today.week ? 'done' : i + 1 === today.week ? 'now' : ''} />
        ))}
      </ol>
      <ul className="plan-sessions">
        {wk.sessions.map((s, i) => (
          <li key={i} className={today.done.includes(i) ? 'done' : i === today.next ? 'next' : ''}>
            <span className="check" aria-hidden />
            <span className="grow">{s.name}</span>
            <span className="muted small">{s.slots.length} exercícios</span>
          </li>
        ))}
      </ul>
      <AnimatePresence initial={false}>
        {next && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button
              className="primary big"
              onClick={() => {
                startWorkout({ program: cfg.id, week: today.week, session: today.next!, name: next.name, deload: wk.deload });
                notifyStart(next.name);
              }}
            >
              Começar {next.name}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {!next && <p className="muted small">Semana cumprida! As próximas sessões liberam na segunda.</p>}
      <button className="link small center" onClick={() => setEditing(true)}>
        Trocar programa
      </button>
    </section>
  );
}
