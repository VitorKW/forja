import { useState, type ChangeEvent } from 'react';
import { EXERCISE_BY_ID } from '../game/exercises';
import type { SetEntry, Workout } from '../game/types';
import { useStore } from '../store';

/** Corrige as séries de um treino já terminado (carga, reps, RIR, km, apagar). O XP é recalculado. */
export default function EditSets({ workout, unit, onDone }: { workout: Workout; unit: string; onDone: () => void }) {
  const editWorkout = useStore((s) => s.editWorkout);
  const [sets, setSets] = useState<SetEntry[]>(workout.sets);
  // Rascunho em texto, para dar para digitar vírgula (62,5).
  const [draft, setDraft] = useState<Record<string, { w: string; r: string; d: string }>>(() =>
    Object.fromEntries(workout.sets.map((s) => [s.id, { w: String(s.weight).replace('.', ','), r: String(s.reps), d: String(s.distance ?? 0).replace('.', ',') }])),
  );
  const num = (s: string) => Number(s.trim().replace(',', '.'));
  const field = (id: string, k: 'w' | 'r' | 'd') => ({
    value: draft[id]?.[k] ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: e.target.value } })),
  });
  const parsed = sets.map((s) => {
    const d = draft[s.id];
    return { ...s, weight: num(d.w), reps: Math.round(num(d.r)), ...(s.distance !== undefined || num(d.d) > 0 ? { distance: num(d.d) } : {}) };
  });
  const valid = parsed.every((s) => isFinite(s.weight) && s.weight >= 0 && isFinite(s.reps) && s.reps >= 0 && (s.distance === undefined || (isFinite(s.distance) && s.distance >= 0)));

  return (
    <section className="panel edit-sets">
      <h2>Corrigir séries</h2>
      <p className="muted small">O XP, os recordes e a meta da semana são recalculados com os números certos.</p>
      <ol className="sets">
        {sets.map((s) => {
          const ex = EXERCISE_BY_ID[s.exerciseId];
          const cardio = ex?.kind === 'cardio';
          return (
            <li key={s.id}>
              <span className="grow edit-name">
                {ex?.name ?? s.exerciseId}
                {s.warmup && <em className="muted"> aquec.</em>}
              </span>
              {cardio ? (
                <>
                  <input className="mini" inputMode="numeric" {...field(s.id, 'r')} aria-label="Minutos" />
                  <span className="muted small">min</span>
                  {ex?.perKm && (
                    <>
                      <input className="mini" inputMode="decimal" {...field(s.id, 'd')} aria-label="Distância em km" />
                      <span className="muted small">km</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <input className="mini" inputMode="decimal" {...field(s.id, 'w')} aria-label={`Carga em ${unit}`} />
                  <span className="muted small">×</span>
                  <input className="mini" inputMode="numeric" {...field(s.id, 'r')} aria-label="Repetições" />
                </>
              )}
              <button className="link danger" aria-label="Apagar série" onClick={() => setSets((xs) => xs.filter((x) => x.id !== s.id))}>
                ×
              </button>
            </li>
          );
        })}
      </ol>
      <div className="row gap">
        <button className="ghost" onClick={onDone}>
          Cancelar
        </button>
        <button
          className="primary grow"
          disabled={!valid || !sets.length}
          onClick={() => {
            editWorkout(workout.id, parsed);
            onDone();
          }}
        >
          Salvar correção
        </button>
      </div>
      {!sets.length && <p className="muted small">Para tirar o treino inteiro, apague-o no histórico do Perfil.</p>}
    </section>
  );
}
