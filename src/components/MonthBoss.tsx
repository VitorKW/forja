import { motion } from 'motion/react';
import { fmt } from './ui';
import { MONTH } from '../game/monthly';
import { useGame } from '../useProgress';

/** Chefe do mês: vida grande + escudo que só cai com os treinos dos dois. */
export default function MonthBoss() {
  const { profiles, monthly: m } = useGame();
  if (!m) return null;
  const total = m.damage[0] + m.damage[1];
  const left = Math.max(0, m.hp - total);
  const share = (i: 0 | 1) => (Math.min(m.damage[i], m.hp) / m.hp) * 100;
  const monthName = new Date(`${m.month}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <motion.section className="card raid month-boss" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row between">
        <span className="eyebrow">Desafio de {monthName}</span>
        <span className="muted small">
          {m.defeated ? 'vencido' : `${m.daysLeft} dia${m.daysLeft === 1 ? '' : 's'}`} · {m.won} no total
        </span>
      </div>
      <div className="month-stage">
        <img
          src={`${import.meta.env.BASE_URL}sprites/chefe-mes.png`}
          width={112}
          height={112}
          alt={m.boss.name}
          className={`boss-sprite breathe${m.defeated ? ' defeated' : ''}`}
        />
        <div className="grow">
          <h2 className="boss-name">{m.boss.name}</h2>
          <p className="muted small">{m.boss.epithet}</p>
          <p className={`shield small${m.shieldDown ? ' down' : ''}`}>{m.shieldDown ? '🛡️ Escudo quebrado' : '🛡️ Escudo de pé'}</p>
        </div>
      </div>

      <div className="raid-bar" role="meter" aria-valuenow={Math.round((total / m.hp) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Dano no chefe do mês">
        <div className="raid-fill p0" style={{ width: `${share(0)}%` }} />
        <div className="raid-fill p1" style={{ width: `${Math.min(share(1), 100 - share(0))}%` }} />
        <span>{m.defeated ? 'Derrotado!' : left === 0 ? 'Sem vida, falta o escudo' : `${fmt(left, 0)} de vida`}</span>
      </div>

      <ul className="shield-list">
        {[0, 1].map((i) => {
          const done = m.workouts[i] >= m.need[i];
          return (
            <li key={i}>
              <i className={`swatch p${i}`} />
              <span className="grow">{profiles[i].name}</span>
              <span className="num small">{fmt(m.damage[i], 0)} XP</span>
              <span className={`num small${done ? ' ok' : ''}`} aria-label={`${m.workouts[i]} de ${m.need[i]} treinos`}>
                {done ? '✓' : ''} {Math.min(m.workouts[i], m.need[i])}/{m.need[i]} treinos
              </span>
            </li>
          );
        })}
      </ul>
      <p className="small center muted">
        {m.defeated
          ? `Caiu! +${MONTH.coins} moedas para cada um. Outro chefe no mês que vem, mais forte.`
          : `O XP dos dois tira vida, mas o escudo só cai quando cada um fizer a meta semanal × ${MONTH.weeksForShield} treinos no mês. Vale +${MONTH.coins} moedas para cada.`}
      </p>
    </motion.section>
  );
}
