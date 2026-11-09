import BossSprite from '../components/BossSprite';
import { fmt } from '../components/ui';
import { bossAt } from '../game/campaign';
import { useProgress } from '../useProgress';

export default function Bosses() {
  const p = useProgress();
  const { boss, damage, defeated } = p.campaign;
  const left = boss.hp - damage;
  const pct = (left / boss.hp) * 100;
  const typicalWorkout = 250;
  const workoutsLeft = Math.max(1, Math.ceil(left / typicalWorkout));

  // Trilha: os vencidos mais recentes, o atual e os 3 próximos (em silhueta).
  const from = Math.max(0, defeated - 3);
  const trail = Array.from({ length: defeated - from + 4 }, (_, i) => bossAt(from + i));

  return (
    <>
      <h1>Chefes</h1>
      <p className="muted lead">Todo XP que você ganha, em qualquer treino, vira dano no chefe da vez.</p>

      <section className="panel boss-stage">
        <div className="boss-count muted small">Chefe {boss.index + 1}</div>
        <div className="boss-portrait">
          <BossSprite def={boss} px={Math.round(boss.size)} className="breathe" />
        </div>
        <h2 className="boss-name">{boss.name}</h2>
        <p className="muted small boss-epithet">{boss.epithet}</p>
        <div className="hp big" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Vida de ${boss.name}`}>
          <div className="hp-fill" style={{ width: `${pct}%` }} />
          <span>
            {fmt(left, 0)} de {fmt(boss.hp, 0)}
          </span>
        </div>
        <p className="small center">
          {damage === 0 && defeated === 0
            ? 'Conclua um treino para dar o primeiro golpe.'
            : `Uns ${workoutsLeft} treino${workoutsLeft > 1 ? 's' : ''} típico${workoutsLeft > 1 ? 's' : ''} para derrubá-lo.`}
        </p>
      </section>

      <section className="panel">
        <div className="row between baseline">
          <h2>Jornada</h2>
          <span className="muted small">{defeated === 0 ? 'nenhum derrotado ainda' : `${defeated} derrotado${defeated > 1 ? 's' : ''}`}</span>
        </div>
        <ol className="trail">
          {trail.map((b) => {
            const state = b.index < defeated ? 'won' : b.index === defeated ? 'now' : 'next';
            return (
              <li key={b.index} className={state}>
                <BossSprite def={b} px={3} hidden={state === 'next'} defeated={state === 'won'} />
                <span className="small">{state === 'next' ? '???' : b.name}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
