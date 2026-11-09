import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stepper, fmt } from '../components/ui';
import RestTimer, { unlockSound, useRest } from '../components/RestTimer';
import { EXERCISES, EXERCISE_BY_ID } from '../game/exercises';
import { cardioXp, computeProgress, countsAsWorkout, dayKey, estimate1RM, isSuspiciousWeight, recordTarget, suggestLoad } from '../game/rules';
import { cycleInfo, easeOff, lastTop, recoveryAdvice } from '../game/wellness';
import ExecutionHint from '../components/ExecutionHint';
import { buildProgram, loadTarget, prescription } from '../game/program';
import { ATTRIBUTES, ATTRIBUTE_LABEL, type Exercise, type Template } from '../game/types';
import { currentProfile, useProfile, useStore } from '../store';
import { notifyPartner } from '../push';
import { LiveJointBoard } from '../components/JointBoard';
import { BARBELL, BARS, NEEDS_WARMUP, platesFor, warmupFor } from '../game/gym';
import HoldTimer from '../components/HoldTimer';

const RIR_OPTIONS: { label: string; value: number | null }[] = [
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
  { label: '?', value: null },
];
const REST_OPTIONS = [45, 60, 90, 120, 150, 180, 240];

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
  const { active, workouts, settings, templates = [], program } = useProfile();
  const { addSet, removeSet, setDeload, finishWorkout, discardWorkout, saveTemplate, updateSettings, setNote } = useStore();
  const { notes = {}, wellness, cycle } = useProfile();
  const restSeconds = settings.restSeconds ?? 90;
  const [queue, setQueue] = useState<Template | null>(null);
  const now = useNow();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [picking, setPicking] = useState(true);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [distance, setDistance] = useState(0);
  const [rir, setRir] = useState<number | null>(2);
  const [warmup, setWarmup] = useState(false);
  // Super-série: alterna entre dois exercícios e só descansa depois do par.
  const [superset, setSuperset] = useState<{ a: Exercise; b: Exercise } | null>(null);
  const [pickingPair, setPickingPair] = useState(false);
  const timer = useRest(active?.id ?? '');
  const stopRest = useCallback(() => timer.stop(), [timer.stop]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Sessão do programa periodizado, se este treino for uma.
  const plan = active?.plan;
  const planWeek = useMemo(() => (plan && program?.id === plan.program ? buildProgram(program)[plan.week - 1] : undefined), [plan, program]);
  const planSession = plan ? planWeek?.sessions[plan.session] : undefined;
  useEffect(() => {
    if (planSession && !queue) startTemplate({ id: 'plano', name: `Programa · ${planSession.name}`, exercises: planSession.slots.map((s) => s.exerciseId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSession]);

  if (!active) return null;

  const elapsed = (now - new Date(active.startedAt).getTime()) / 1000;
  const cardio = exercise?.kind === 'cardio';
  const slot = exercise ? planSession?.slots.find((s) => s.exerciseId === exercise.id) : undefined;
  // Dia ruim de recuperação ou fase do ciclo que pede calma: a sugestão não sobe a carga.
  const today = dayKey(new Date());
  const holdReason = recoveryAdvice(wellness ?? {}, today)
    ? 'Recuperação baixa hoje: não precisa subir.'
    : cycleInfo(cycle, today)?.easy
      ? 'Fase do ciclo que pede calma: não precisa subir.'
      : null;
  const top = exercise ? lastTop(workouts, exercise.id) : null;
  const target = slot ? easeOff(loadTarget(workouts, slot, !!planWeek?.deload), top, holdReason) : null;
  const slotDone = (id: string) => active.sets.filter((s) => s.exerciseId === id && !s.warmup).length;
  const suggestion = exercise && !cardio && !slot ? easeOff(suggestLoad(workouts, exercise.id), top, holdReason) : null;
  const nextSlot = slot && slotDone(slot.exerciseId) >= slot.sets ? planSession?.slots.find((s) => slotDone(s.exerciseId) < s.sets) : undefined;
  const doneIds = new Set(active.sets.map((s) => s.exerciseId));
  // Anilhas (só em kg e exercícios de barra) e aquecimento antes da primeira série de trabalho.
  const bar = settings.barKg ?? 20;
  const plates = exercise && !cardio && settings.unit === 'kg' && BARBELL.has(exercise.id) && weight >= bar ? platesFor(weight, bar) : null;
  const lastWork = exercise
    ? [...workouts.flatMap((w) => w.sets)].reverse().find((s) => s.exerciseId === exercise.id && !s.warmup)
    : undefined;
  const workTarget = target?.weight ?? suggestion?.weight ?? lastWork?.weight ?? 0;
  const workReps = target?.reps ?? suggestion?.reps ?? lastWork?.reps ?? reps;
  const hasWork = exercise ? active.sets.some((s) => s.exerciseId === exercise.id && !s.warmup) : true;
  const warmups = exercise && !cardio && !hasWork && NEEDS_WARMUP.has(exercise.id) ? warmupFor(workTarget, BARBELL.has(exercise.id), bar) : [];

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
    // No programa, já começa com a carga e as reps do dia.
    const s = planSession?.slots.find((x) => x.exerciseId === ex.id);
    if (s) {
      const t = loadTarget(workouts, s, !!planWeek?.deload);
      if (ex.kind === 'cardio') setReps(t.reps);
      else {
        if (t.weight !== null) setWeight(t.weight);
        setReps(t.reps);
        setRir(s.rir);
      }
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
    // Recorde? Avisa o par (só se já havia uma marca para superar).
    const est = warmup ? null : estimate1RM(weight, reps);
    if (est) {
      let best = 0;
      for (const w of [...workouts, active])
        for (const s of w.sets) if (s.exerciseId === exercise.id && !s.warmup) best = Math.max(best, estimate1RM(s.weight, s.reps) ?? 0);
      if (best > 0 && est > recordTarget(best)) {
        const st = useStore.getState();
        notifyPartner(st.profiles.findIndex((p) => p.id === st.currentId), {
          title: `${currentProfile(st).name} bateu recorde! 🏆`,
          body: `${exercise.name}: ${fmt(weight)} kg × ${reps}.`,
          tag: `recorde-${exercise.id}`,
        });
      }
    }
    addSet({ exerciseId: exercise.id, weight, reps, rir: warmup ? null : rir, warmup });
    unlockSound();
    // Aquecimento sugerido: passa para a próxima etapa e, no fim, volta para a carga de trabalho.
    if (warmup && warmups.length) {
      const next = warmups.find((s) => s.weight > weight);
      if (next) {
        setWeight(next.weight);
        setReps(next.reps);
      } else {
        setWarmup(false);
        setWeight(workTarget);
        setReps(workReps);
      }
    }
    if (superset && !warmup) {
      // Primeiro exercício do par: vai direto para o segundo, sem descanso.
      if (exercise.id === superset.a.id) return choose(superset.b);
      if (exercise.id === superset.b.id) choose(superset.a);
    }
    const rest = slot && !warmup ? slot.rest : restSeconds;
    timer.start(warmup ? Math.min(60, rest) : rest);
  };

  const finish = () => {
    if (active.sets.length === 0) {
      if (confirm('Nenhuma série registrada. Sair do treino?')) discardWorkout();
      return;
    }
    if (!countsAsWorkout(active) && !confirm('Treino curto: as séries valem XP, mas para ganhar o bônus de treino e contar o dia na meta são 3 séries de trabalho ou 10 minutos de cardio. Terminar mesmo assim?')) return;
    const s = useStore.getState();
    const name = currentProfile(s).name;
    const series = active.sets.filter((x) => !x.warmup).length;
    finishWorkout();
    notifyPartner(s.profiles.findIndex((p) => p.id === s.currentId), {
      title: `${name} terminou o treino 💪`,
      body: `${series} ${series === 1 ? 'registro' : 'registros'}, +${preview} XP. Manda um incentivo!`,
      tag: 'treino',
    });
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
        <LiveJointBoard active={active} now={now} />
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
        {pickingPair && exercise ? (
          <ExercisePicker
            onPick={(b) => {
              if (b.id !== exercise.id && b.kind !== 'cardio') setSuperset({ a: exercise, b });
              setPickingPair(false);
            }}
            onCancel={() => setPickingPair(false)}
            templates={[]}
            onTemplate={() => {}}
          />
        ) : picking ? (
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
              <ExecutionHint exerciseId={exercise.id} />
              <button
                className="ex-note"
                onClick={() => {
                  const v = prompt(`Anotação para ${exercise.name} (ex.: banco na posição 4, pegada fechada):`, notes[exercise.id] ?? '');
                  if (v !== null) setNote(exercise.id, v);
                }}
              >
                {notes[exercise.id] ? <>📝 {notes[exercise.id]}</> : <span className="muted small">+ Anotação (ajuste do aparelho, pegada…)</span>}
              </button>
              {superset ? (
                <div className="superset">
                  <span>
                    Super-série: <strong>{superset.a.name}</strong> ↔ <strong>{superset.b.name}</strong>
                    <span className="muted small"> · descanso depois do par</span>
                  </span>
                  <button className="link small" onClick={() => setSuperset(null)}>
                    Sair
                  </button>
                </div>
              ) : (
                !cardio && (
                  <button className="link small" onClick={() => setPickingPair(true)}>
                    + Super-série com outro exercício
                  </button>
                )
              )}

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
                  {slot && target && (
                    <div className="plan-target">
                      <div className="row between baseline">
                        <span className="eyebrow">Meta do programa</span>
                        <span className="num small">
                          {Math.min(slotDone(slot.exerciseId), slot.sets)}/{slot.sets} séries
                        </span>
                      </div>
                      <strong className="num">{prescription(slot)}</strong>
                      <span className="muted small">
                        {target.weight !== null ? `Hoje: ${fmt(target.weight)} ${settings.unit} × ${target.reps}. ` : ''}
                        {target.note} Descanso {mmss(slot.rest)}.
                      </span>
                    </div>
                  )}
                  {suggestion && (suggestion.weight !== weight || suggestion.reps !== reps) && (
                    <button className="suggest" onClick={() => { setWeight(suggestion.weight); setReps(suggestion.reps); }}>
                      <span>
                        Sugestão: <strong className="num">{fmt(suggestion.weight)} {settings.unit} × {suggestion.reps}</strong>
                        <span className="muted small"> {suggestion.note}</span>
                      </span>
                      <span className="link">Usar</span>
                    </button>
                  )}
                  {warmups.length > 0 && (
                    <div className="warmup-hint">
                      <span className="field-label">Aquecimento sugerido até {fmt(workTarget)} {settings.unit}</span>
                      <div className="recent-list">
                        {warmups.map((s) => (
                          <button
                            key={s.weight}
                            className="qchip"
                            onClick={() => {
                              setWeight(s.weight);
                              setReps(s.reps);
                              setWarmup(true);
                            }}
                          >
                            <span className="num">{fmt(s.weight)} × {s.reps}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="steppers">
                    <Stepper label="Carga" value={weight} onChange={setWeight} step={2.5} suffix={settings.unit} />
                    {!exercise.timed && <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />}
                  </div>
                  {exercise.timed && <HoldTimer seconds={reps * 10} onChange={(s) => setReps(Math.max(1, Math.round(s / 10)))} />}
                  {plates && (
                    <div className="plates muted small">
                      <span>
                        {plates.perSide.length ? (
                          <>
                            Cada lado: <strong className="num">{plates.perSide.map((p) => fmt(p, 2)).join(' + ')}</strong>
                          </>
                        ) : (
                          'Só a barra'
                        )}
                        {plates.left > 0 && ` (faltam ${fmt(plates.left, 2)} kg para fechar)`}
                      </span>
                      <select value={bar} onChange={(e) => updateSettings({ barKg: Number(e.target.value) })} aria-label="Peso da barra">
                        {BARS.map((b) => (
                          <option key={b} value={b}>
                            barra {b} kg
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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

              {cardio && slot && <p className="muted small">Meta do programa: {prescription(slot)} em ritmo forte.</p>}
              <button className="primary big" onClick={register}>
                {cardio ? 'Registrar atividade' : 'Registrar série'}
              </button>
              {nextSlot && EXERCISE_BY_ID[nextSlot.exerciseId] && (
                <button className="ghost" onClick={() => choose(EXERCISE_BY_ID[nextSlot.exerciseId])}>
                  Próximo: {EXERCISE_BY_ID[nextSlot.exerciseId].name} →
                </button>
              )}
            </section>
          )
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
                      {g.ex.timed ? `${s.weight ? `${fmt(s.weight)} ${settings.unit} · ` : ''}${s.reps * 10} s` : `${fmt(s.weight)} ${settings.unit} × ${s.reps}`}
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
            Treino de deload <span className="muted small">(semana leve: metade dos dias da meta já cumpre, uma vez a cada 4 semanas)</span>
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
        <div className="rest-setting muted small">
          Descanso entre séries:
          <select value={restSeconds} onChange={(e) => updateSettings({ restSeconds: Number(e.target.value) })} aria-label="Descanso entre séries">
            {REST_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {mmss(s)}
              </option>
            ))}
          </select>
        </div>
      </main>
      <RestTimer rest={timer.rest} now={now} onAdd={(s) => timer.add(s)} onStop={stopRest} />
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
      <input className="search" type="search" aria-label="Buscar exercício" placeholder="Buscar exercício..." value={q} onChange={(e) => setQ(e.target.value)} />
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
