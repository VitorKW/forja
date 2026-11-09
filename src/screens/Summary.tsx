import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../game/achievements';
import { EXERCISE_BY_ID } from '../game/exercises';
import { levelTitle } from '../game/rules';
import { ATTRIBUTES, ATTRIBUTE_LABEL } from '../game/types';
import { useStore } from '../store';
import { useProgress } from '../useProgress';
import { fmt } from '../components/ui';

function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export default function Summary({ workoutId }: { workoutId: string }) {
  const p = useProgress();
  const close = useStore((s) => s.closeSummary);
  const workout = useStore((s) => s.workouts.find((w) => w.id === workoutId));
  const r = p.results[workoutId];
  const shown = useCountUp(r?.xpTotal ?? 0);

  if (!r || !workout) {
    return (
      <div className="app">
        <main className="screen">
          <p>Treino não encontrado.</p>
          <button className="primary" onClick={close}>
            Voltar
          </button>
        </main>
      </div>
    );
  }

  const maxAttr = Math.max(1, ...ATTRIBUTES.map((a) => r.attrXp[a]));
  const leveled = r.levelAfter > r.levelBefore;

  return (
    <div className="app">
      <main className="screen summary">
        <div className="big-xp">
          <div className="muted small">XP ganho</div>
          <div className="num">+{shown}</div>
          {r.multiplier > 1 && <div className="badge hot">constância ×{fmt(r.multiplier)}</div>}
        </div>

        {leveled && (
          <section className="card levelup">
            <div className="small">SUBIU DE NÍVEL!</div>
            <div className="level">Nível {r.levelAfter}</div>
            <div className="muted">{levelTitle(r.levelAfter)}</div>
          </section>
        )}

        {r.bossDefeats.map((b) => (
          <section key={b} className="card boss-win">
            ⚔️ Chefe derrotado: <strong>{EXERCISE_BY_ID[b].name}</strong>. Ele vai voltar mais forte.
          </section>
        ))}

        {r.achievements.map((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id)!;
          return (
            <section key={id} className="card achievement-new">
              <span className="ach-icon">{a.icon}</span>
              <div>
                <div className="small muted">Conquista desbloqueada</div>
                <strong>{a.name}</strong>
              </div>
            </section>
          );
        })}

        <section className="card">
          <h2>Atributos</h2>
          {ATTRIBUTES.filter((a) => r.attrXp[a] > 0).map((a) => (
            <div key={a} className="attr-row">
              <span>{ATTRIBUTE_LABEL[a]}</span>
              <div className="xpbar small">
                <div className="fill grow-in" style={{ width: `${(r.attrXp[a] / maxAttr) * 100}%` }} />
              </div>
              <span className="num-small">+{r.attrXp[a]}</span>
            </div>
          ))}
          {r.fatigued.length > 0 && (
            <p className="muted small">
              ⚠️ Fadiga em {r.fatigued.map((a) => ATTRIBUTE_LABEL[a]).join(', ')}: mais de 20 séries na semana rendem metade do XP.
            </p>
          )}
        </section>

        <section className="card">
          <h2>Bônus</h2>
          {r.bonuses.map((b, i) => (
            <div key={i} className="row between">
              <span>{b.label}</span>
              <span className="num-small">+{b.xp}</span>
            </div>
          ))}
        </section>

        <p className="muted small center">
          {workout.sets.length} séries · {new Date(workout.finishedAt!).toLocaleDateString('pt-BR')}
        </p>

        <button className="primary big" onClick={close}>
          Voltar à forja
        </button>
      </main>
    </div>
  );
}
