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
  return Math.ceil(((hp / (1 + reps / 30)) + 0.01) * 2) / 2;
}

export default function Bosses() {
  const p = useProgress();
  const unit = useStore((s) => s.settings.unit);

  return (
    <>
      <h1>Chefes</h1>
      <p className="muted small">
        Cada chefe tem a vida do seu 1RM estimado + 2,5%. Supere essa marca numa série de até 12 reps para derrotá-lo.
      </p>
      {BOSS_IDS.map((id) => {
        const b = p.bosses[id];
        const ex = EXERCISE_BY_ID[id];
        if (b.base === null) {
          return (
            <section key={id} className="card boss sleeping">
              <h2>💤 {BOSS_NAME[id]}</h2>
              <p className="muted small">Adormecido. Registre uma série de {ex.name} (até 12 reps) para despertá-lo.</p>
            </section>
          );
        }
        const hp = bossHp(b.base);
        return (
          <section key={id} className="card boss">
            <div className="row between">
              <h2>⚔️ {BOSS_NAME[id]}</h2>
              <span className="badge">{b.defeats}× derrotado</span>
            </div>
            <div className="hp">
              <div className="hp-fill" style={{ width: `${Math.min(100, ((b.best ?? 0) / hp) * 100)}%` }} />
              <span>
                {fmt(b.best ?? 0)} / {fmt(hp)} {unit}
              </span>
            </div>
            <p className="small">
              Para vencer: <strong>{fmt(weightToBeat(hp, 5))} {unit} × 5</strong> ou <strong>{fmt(weightToBeat(hp, 8))} {unit} × 8</strong>
            </p>
          </section>
        );
      })}
    </>
  );
}
