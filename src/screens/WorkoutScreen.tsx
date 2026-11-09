import { useEffect, useMemo, useRef, useState } from 'react';
import { Stepper, fmt } from '../components/ui';
import { EXERCISES, EXERCISE_BY_ID } from '../game/exercises';
import { cardioXp, computeProgress, isSuspiciousWeight, suggestLoad } from '../game/rules';
import { ATTRIBUTES, ATTRIBUTE_LABEL, type Exercise, type Template } from '../game/types';
import { useProfile, useStore } from '../store';

const RIR_OPTIONS: { label: string; value: number | null }[] = [
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
  { label: '?', value: null },
];
const REST_SECONDS = 90;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const { active, workouts, settings, templates = [] } = useProfile();
  const { addSet, removeSet, setDeload, finishWorkout, discardWorkout, saveTemplate } = useStore();
  const [queue, setQueue] = useState<Template | null>(null);
  const now = useNow();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [picking, setPicking] = useState(true);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [distance, setDistance] = useState(0);
  const [rir, setRir] = useState<number | null>(2);
  const [warmup, setWarmup] = useState(false);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; text: string }[]>([]);
  const floaterId = useRef(0);

  // XP ao vivo: simula o treino atual como se terminasse agora.
  const preview = useMemo(() => {
    if (!active) return 0;
    const p = computeProgress([...workouts, { ...active, finishedAt: new Date().toISOString() }], settings);
    return p.results[active.id]?.xpTotal ?? 0;
  }, [active, workouts, settings]);

  const prevXp = useRef(preview);
  const prevCount = useRef(active?.sets.length ?? 0);
  useEffect(() => {
    const count = active?.sets.length ?? 0;
    if (count > prevCount.current) {
      const gained = preview - prevXp.current;
      const id = ++floaterId.current;
      setFloaters((f) => [...f, { id, text: `+${gained} XP` }]);
      setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1200);
      navigator.vibrate?.(30);
    }
    prevXp.current = preview;
    prevCount.current = count;
  }, [preview, active?.sets.length]);

  if (!active) return null;

  const elapsed = (now - new Date(active.startedAt).getTime()) / 1000;
  const rest = restUntil ? (restUntil - now) / 1000 : 0;
  const cardio = exercise?.kind === 'cardio';
  const suggestion = exercise && !cardio ? suggestLoad(workouts, exercise.id) : null;
  const doneIds = new Set(active.sets.map((s) => s.exerciseId));

  const startTemplate = (t: Template) => {
    setQueue(t);
    const first = t.exercises.map((id) => EXERCISE_BY_ID[id]).find(Boolean);
    if (first) choose(first);
  };
  const saveAsTemplate = () => {
    const ids = [...new Set(active.sets.map((s) => s.exerciseId))].filter((id) => EXERCISE_BY_ID[id]);
    if (!ids.length) return alert('Registre pelo menos um exercício para salvar como ficha.');
    const name = prompt('Nome da ficha (ex.: Treino A, Pernas):', `Ficha ${templates.length + 1}`);
    if (name?.trim()) saveTemplate(name.trim().slice(0, 30), ids);
  };

  const choose = (ex: Exercise) => {
    setExercise(ex);
    setPicking(false);
    const all = [...workouts.flatMap((w) => w.sets), ...active.sets];
    const last = [...all].reverse().find((s) => s.exerciseId === ex.id);
    if (ex.kind === 'cardio') {
      setReps(last?.reps ?? 30);
      setDistance(last?.distance ?? 0);
    } else {
      setWeight(last?.weight ?? 20);
      setReps(last?.reps ?? 10);
    }
  };

  const register = () => {
    if (!exercise) return;
    if (!cardio && isSuspiciousWeight(workouts, exercise.id, weight)) {
      if (!confirm(`${fmt(weight)} ${settings.unit} é bem acima do seu máximo em ${exercise.name}. Confirmar?`)) return;
    }
    if (cardio) {
      addSet({ exerciseId: exercise.id, weight: 0, reps, rir: null, warmup: false, ...(exercise.perKm && distance > 0 ? { distance } : {}) });
      return;
    }
    addSet({ exerciseId: exercise.id, weight, reps, rir: warmup ? null : rir, warmup });
    if (!cardio) setRestUntil(Date.now() + REST_SECONDS * 1000);
  };

  const finish = () => {
    if (active.sets.length === 0) {
      if (confirm('Nenhuma série registrada. Sair do treino?')) discardWorkout();
      return;
    }
    finishWorkout();
  };

  // Agrupa as séries por exercício, na ordem em que apareceram.
  const groups: { ex: Exercise; sets: typeof active.sets }[] = [];
  for (const s of active.sets) {
    const ex = EXERCISE_BY_ID[s.exerciseId];
    if (!ex) continue;
    const g = groups.find((x) => x.ex.id === ex.id);
    if (g) g.sets.push(s);
    else groups.push({ ex, sets: [s] });
  }

  return (
    <div className="app">
      <header className="workout-head">
        <div>
          <div className="muted small">Treino em andamento</div>
          <div className="timer">{mmss(elapsed)}</div>
        </div>
        <div className="xp-live" aria-live="polite">
          {preview} XP
          {floaters.map((f) => (
            <span key={f.id} className="floater">
              {f.text}
            </span>
          ))}
        </div>
      </header>

      <main className="screen">
        {queue && !picking && (
          <div className="queue" aria-label={`Ficha ${queue.name}`}>
            <span className="eyebrow">{queue.name}</span>
            <div className="queue-chips">
              {queue.exercises.map((id) => {
                const ex = EXERCISE_BY_ID[id];
                if (!ex) return null;
                return (
                  <button key={id} className={`qchip${exercise?.id === id ? ' on' : ''}${doneIds.has(id) ? ' done' : ''}`} onClick={() => choose(ex)}>
                    {ex.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {picking ? (
          <ExercisePicker onPick={choose} onCancel={exercise ? () => setPicking(false) : undefined} templates={templates} onTemplate={startTemplate} />
        ) : (
          exercise && (
            <section className="panel">
              <div className="row between">
                <h2>{exercise.name}</h2>
                <button className="link" onClick={() => setPicking(true)}>
                  Trocar
                </button>
              </div>
              <div className="muted small">
                {ATTRIBUTE_LABEL[exercise.primary]}
                {exercise.secondary && ` + ${ATTRIBUTE_LABEL[exercise.secondary]}`}
              </div>

              {cardio ? (
                <>
                  <div className="steppers">
                    <Stepper label="Duração" value={reps} onChange={setReps} step={5} min={1} suffix="min" />
                    {exercise.perKm ? (
                      <Stepper label="Distância (opcional)" value={distance} onChange={setDistance} step={0.5} suffix="km" />
                    ) : (
                      <div />
                    )}
                  </div>
                  <p className="muted small">
                    Rende cerca de {Math.round(cardioXp(exercise.id, reps, exercise.perKm ? distance : 0))} XP, antes de bônus.
                  </p>
                </>
              ) : (
                <>
                  {suggestion && (suggestion.weight !== weight || suggestion.reps !== reps) && (
                    <button className="suggest" onClick={() => { setWeight(suggestion.weight); setReps(suggestion.reps); }}>
                      <span>
                        Sugestão: <strong className="num">{fmt(suggestion.weight)} {settings.unit} × {suggestion.reps}</strong>
                        <span className="muted small"> {suggestion.note}</span>
                      </span>
                      <span className="link">Usar</span>
                    </button>
                  )}
                  <div className="steppers">
                    <Stepper label="Carga" value={weight} onChange={setWeight} step={2.5} suffix={settings.unit} />
                    <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />
                  </div>
                  <div className="field">
                    <span className="field-label">RIR (reps na reserva)</span>
                    <div className="chips">
                      {RIR_OPTIONS.map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          disabled={warmup}
                          className={`chip${!warmup && rir === o.value ? ' on' : ''}`}
                          onClick={() => setRir(o.value)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={warmup} onChange={(e) => setWarmup(e.target.checked)} />
                    Série de aquecimento
                  </label>
                </>
              )}

              <button className="primary big" onClick={register}>
                {cardio ? 'Registrar atividade' : 'Registrar série'}
              </button>
            </section>
          )
        )}

        {rest > 0 && (
          <div className="rest">
            <span>Descanso: {mmss(rest)}</span>
            <button className="link" onClick={() => setRestUntil(null)}>
              Pular
            </button>
          </div>
        )}

        {groups.map((g) => (
          <section key={g.ex.id} className="panel compact">
            <h3>{g.ex.name}</h3>
            <ol className="sets">
              {g.sets.map((s, i) => (
                <li key={s.id}>
                  <span className="muted">{i + 1}.</span>
                  {g.ex.kind === 'cardio' ? (
                    <span>
                      {s.reps} min{s.distance ? `, ${fmt(s.distance)} km` : ''}
                    </span>
                  ) : (
                    <span>
                      {fmt(s.weight)} {settings.unit} × {s.reps}
                      {s.warmup ? <em className="muted"> aquec.</em> : s.rir !== null && <em className="muted"> RIR {s.rir === 4 ? '4+' : s.rir}</em>}
                    </span>
                  )}
                  <button className="link danger" aria-label="Remover série" onClick={() => removeSet(s.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <label className="toggle panel compact">
          <input type="checkbox" checked={active.deload} onChange={(e) => setDeload(e.target.checked)} />
          <span>
            Treino de deload <span className="muted small">(conta como semana cumprida)</span>
          </span>
        </label>

        {active.sets.length > 0 && !queue && (
          <button className="link center" onClick={saveAsTemplate}>
            Salvar estes exercícios como ficha
          </button>
        )}

        <div className="row gap">
          <button className="ghost" onClick={() => confirm('Descartar este treino?') && discardWorkout()}>
            Descartar
          </button>
          <button className="primary grow" onClick={finish}>
            Concluir treino
          </button>
        </div>
      </main>
    </div>
  );
}

function ExercisePicker({
  onPick,
  onCancel,
  templates,
  onTemplate,
}: {
  onPick: (e: Exercise) => void;
  onCancel?: () => void;
  templates: Template[];
  onTemplate: (t: Template) => void;
}) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const list = EXERCISES.filter((e) => norm(e.name).includes(norm(q)));

  return (
    <section className="panel">
      <div className="row between">
        <h2>Escolha o exercício</h2>
        {onCancel && (
          <button className="link" onClick={onCancel}>
            Voltar
          </button>
        )}
      </div>
      {templates.length > 0 && !q && (
        <div className="pick-group">
          <div className="muted small">Suas fichas</div>
          <div className="template-list">
            {templates.map((t) => (
              <button key={t.id} className="template" onClick={() => onTemplate(t)}>
                <strong>{t.name}</strong>
                <span className="muted small">{t.exercises.length} exercícios</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <input className="search" placeholder="Buscar exercício..." value={q} onChange={(e) => setQ(e.target.value)} />
      {[
        { key: 'cardio', label: 'Caminhada, cardio e esportes', items: list.filter((e) => e.kind === 'cardio') },
        ...ATTRIBUTES.map((a) => ({ key: a, label: ATTRIBUTE_LABEL[a], items: list.filter((e) => e.kind === 'forca' && e.primary === a) })),
      ].map((g) =>
        g.items.length === 0 ? null : (
          <div key={g.key} className="pick-group">
            <div className="muted small">{g.label}</div>
            {g.items.map((e) => (
              <button key={e.id} className="pick" onClick={() => onPick(e)}>
                {e.name}
              </button>
            ))}
          </div>
        ),
      )}
    </section>
  );
}
