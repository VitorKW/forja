import { fmt } from '../components/ui';
import { EXERCISE_BY_ID } from '../game/exercises';
import { bossHp } from '../game/rules';
import { BOSS_IDS, type BossId } from '../game/types';
import { useStore } from '../store';
import { useProgress } from '../useProgress';

const BOSS_NAME: Record<BossId, string> = {
  agachamento: 'O Colosso do Agachamento',
  supino: 'A Muralha do Supino',
  terra: 'O Golem do Terra',
};

/** Carga mínima para vencer o chefe com N reps (arredondada para cima em 0,5). */
function weightToBeat(hp: number, reps: number) {
  return Math.ceil((hp / (1 + reps / 30) + 0.01) * 2) / 2;
}

export default function Bosses() {
  const p = useProgress();
  const unit = useStore((s) => s.settings.unit);

  return (
    <>
      <h1>Chefes</h1>
      <p className="muted lead">Cada chefe é um recorde seu. Para vencer, supere seu 1RM estimado em 2,5% numa série de até 12 repetições.</p>

      {BOSS_IDS.map((id) => {
        const b = p.bosses[id];
        const ex = EXERCISE_BY_ID[id];
        if (b.base === null) {
          return (
            <section key={id} className="panel boss sleeping">
              <h2>{BOSS_NAME[id]}</h2>
              <p className="muted small">Ainda dormindo. Registre uma série de {ex.name.toLowerCase()} com até 12 repetições para acordá-lo.</p>
            </section>
          );
        }
        const hp = bossHp(b.base);
        const pct = Math.min(100, ((b.best ?? 0) / hp) * 100);
        return (
          <section key={id} className="panel boss">
            <div className="row between baseline">
              <h2>{BOSS_NAME[id]}</h2>
              <span className="muted small">{b.defeats === 0 ? 'invicto' : `vencido ${b.defeats}×`}</span>
            </div>
            <div className="hp" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Seu melhor 1RM comparado à vida do chefe">
              <div className="hp-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="row between small">
              <span className="muted">Seu melhor: {fmt(b.best ?? 0)} {unit}</span>
              <span>Vida: {fmt(hp)} {unit}</span>
            </div>
            <div className="beat">
              <span className="muted small">Para vencer</span>
              <div className="beat-options">
                <span className="plate">
                  <strong>{fmt(weightToBeat(hp, 5))}</strong> {unit} × 5
                </span>
                <span className="plate">
                  <strong>{fmt(weightToBeat(hp, 8))}</strong> {unit} × 8
                </span>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
