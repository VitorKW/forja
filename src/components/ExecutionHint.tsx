import { EXEC_FRAMES, executionOf } from '../game/execution';

const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Bonequinho fazendo o movimento + dica. Com movimento reduzido, mostra só o primeiro quadro. */
export default function ExecutionHint({ exerciseId }: { exerciseId: string }) {
  const ex = executionOf(exerciseId);
  if (!ex) return null;
  const base = `${import.meta.env.BASE_URL}sprites/exec-${ex.anim}`;
  return (
    <div className="how">
      {reduce ? (
        <span
          role="img"
          aria-label="Execução do exercício"
          className="how-still"
          style={{ backgroundImage: `url(${base}.png)`, backgroundSize: `${EXEC_FRAMES * 100}% 100%` }}
        />
      ) : (
        <img src={`${base}.gif`} alt="Animação da execução do exercício" width={72} height={72} />
      )}
      <p className="muted small">{ex.cue}</p>
    </div>
  );
}
