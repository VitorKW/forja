import Character from '../components/Character';
import { XpBar, fmt } from '../components/ui';
import { levelTitle, RULES } from '../game/rules';
import { ATTRIBUTES, ATTRIBUTE_LABEL, type Attribute } from '../game/types';
import { useStore } from '../store';
import { useProgress } from '../useProgress';

export default function Home() {
  const p = useProgress();
  const startWorkout = useStore((s) => s.startWorkout);
  const levels = Object.fromEntries(ATTRIBUTES.map((a) => [a, p.attrLevels[a].level])) as Record<Attribute, number>;
  const tired = ATTRIBUTES.filter((a) => p.weekSets[a] > RULES.fatigueSetsPerWeek);
  const close = ATTRIBUTES.filter((a) => p.weekSets[a] >= 16 && p.weekSets[a] <= RULES.fatigueSetsPerWeek);

  return (
    <>
      <header className="hero">
        <Character levels={levels} />
        <div className="hero-info">
          <div className="title">{levelTitle(p.level.level)}</div>
          <div className="level">Nível {p.level.level}</div>
          <XpBar info={p.level} />
          <div className="muted small">
            {fmt(p.level.into, 0)} / {fmt(p.level.need, 0)} XP
          </div>
        </div>
      </header>

      <section className="card">
        <div className="row between">
          <h2>Meta da semana</h2>
          <span className={`badge${p.multiplier > 1 ? ' hot' : ''}`} title="Multiplicador de constância">
            ×{fmt(p.multiplier, 1)} XP
          </span>
        </div>
        <div className="dots">
          {Array.from({ length: p.week.goal }, (_, i) => (
            <span key={i} className={`dot${i < p.week.days ? ' on' : ''}`} />
          ))}
        </div>
        <p className="muted small">
          {p.week.done
            ? 'Meta cumprida! Agora é treinar se quiser... ou descansar. Dia de descanso também forja.'
            : `${p.week.days} de ${p.week.goal} dias. Faltam ${p.week.goal - p.week.days}.`}
        </p>
        {p.streak > 0 && <p className="small">🔥 {p.streak} semana(s) de constância</p>}
      </section>

      {(tired.length > 0 || close.length > 0) && (
        <section className="card warn">
          {tired.map((a) => (
            <p key={a}>⚠️ {ATTRIBUTE_LABEL[a]} sobrecarregado ({p.weekSets[a]} séries nesta semana). O XP dele está pela metade.</p>
          ))}
          {close.map((a) => (
            <p key={a}>
              {ATTRIBUTE_LABEL[a]}: {p.weekSets[a]}/{RULES.fatigueSetsPerWeek} séries na semana.
            </p>
          ))}
        </section>
      )}

      <button className="primary big" onClick={startWorkout}>
        Começar treino
      </button>

      {p.workoutsDone === 0 && (
        <p className="muted small center">Registre sua primeira série para acender a forja. ✨</p>
      )}
    </>
  );
}
