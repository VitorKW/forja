import { motion } from 'motion/react';
import { fmt } from '../components/ui';
import CheerButtons from '../components/CheerButtons';
import { CHEERS } from '../game/extras';
import { COINS } from '../game/shop';
import { dayKey } from '../game/rules';
import { useGame } from '../useProgress';

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.04 + i * 0.06, type: 'spring', stiffness: 380, damping: 32 } as const,
});

function when(iso: string) {
  const d = new Date(iso);
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (dayKey(d) === today) return 'hoje';
  if (dayKey(d) === yesterday) return 'ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export default function Duo() {
  const { profiles, all, me, partner, duo } = useGame();
  if (!duo) return null;
  const mine = profiles[me];
  const other = profiles[partner];
  const { raid, challenge } = duo;
  const total = raid.damage[0] + raid.damage[1];
  const left = Math.max(0, raid.hp - total);
  const share = (i: 0 | 1) => (Math.min(raid.damage[i], raid.hp) / raid.hp) * 100;
  const maxCh = Math.max(1, ...challenge.values);
  const leader = challenge.values[0] === challenge.values[1] ? null : challenge.values[0] > challenge.values[1] ? 0 : 1;

  const partnerRecent = other.workouts
    .filter((w) => w.finishedAt)
    .sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!))
    .slice(0, 6);
  const received = [...(mine.cheers ?? [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);

  return (
    <>
      <h1>Dupla</h1>
      <p className="muted lead">
        {profiles[0].name} e {profiles[1].name}: o que um faz ajuda o outro.
      </p>

      <motion.section className="card raid" {...rise(0)}>
        <div className="row between">
          <span className="eyebrow">Chefe da semana</span>
          <span className="muted small">{duo.raidsWon} derrotado{duo.raidsWon === 1 ? '' : 's'} juntos</span>
        </div>
        <div className="raid-stage">
          <img
            src={`${import.meta.env.BASE_URL}sprites/${raid.boss.sprite}.png`}
            width={156}
            height={156}
            alt={raid.boss.name}
            className={`boss-sprite breathe${raid.defeated ? ' defeated' : ''}`}
          />
        </div>
        <h2 className="boss-name center">{raid.boss.name}</h2>
        <p className="muted small center">{raid.boss.epithet}</p>
        <div className="raid-bar" role="meter" aria-valuenow={Math.round((total / raid.hp) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Dano da dupla">
          <div className="raid-fill p0" style={{ width: `${share(0)}%` }} />
          <div className="raid-fill p1" style={{ width: `${Math.min(share(1), 100 - share(0))}%` }} />
          <span>{raid.defeated ? 'Derrotado!' : `${fmt(left, 0)} de vida`}</span>
        </div>
        <div className="raid-legend">
          {[0, 1].map((i) => (
            <span key={i}>
              <i className={`swatch p${i}`} />
              {profiles[i].name} <strong className="num">{fmt(raid.damage[i], 0)}</strong>
            </span>
          ))}
        </div>
        <p className="small center muted">
          {raid.defeated
            ? `Vitória da dupla: +${COINS.raid} moedas para cada um. Novo chefe na segunda.`
            : 'Todo XP de treino desta semana, dos dois, vira dano. Ele foge no domingo à noite.'}
        </p>
      </motion.section>

      <motion.section className="card couple" {...rise(1)}>
        <div className="couple-num">
          <span className="num">{duo.coupleStreak + (duo.coupleWeekDone ? 1 : 0)}</span>
          <span className="muted small">semana{duo.coupleStreak + (duo.coupleWeekDone ? 1 : 0) === 1 ? '' : 's'}</span>
        </div>
        <div className="grow">
          <h2>Sequência do casal</h2>
          <p className="muted small">
            {duo.coupleWeekDone
              ? 'Os dois já bateram a meta desta semana.'
              : [0, 1]
                  .filter((i) => !all[i].week.done)
                  .map((i) => `${profiles[i].name}: faltam ${Math.max(0, all[i].week.goal - all[i].week.days)}`)
                  .join('. ') + '.'}{' '}
            Cada semana em que os dois cumprem a meta vale +{COINS.coupleWeek} moedas.
          </p>
        </div>
      </motion.section>

      <motion.section className="card" {...rise(2)}>
        <span className="eyebrow">Desafio da semana</span>
        <h2 style={{ marginTop: 4 }}>{challenge.label}</h2>
        {[0, 1].map((i) => (
          <div key={i} className="duel-row">
            <span className="duel-name">{profiles[i].name}</span>
            <div className="duel-track">
              <div className={`duel-fill p${i}`} style={{ width: `${(challenge.values[i] / maxCh) * 100}%` }} />
            </div>
            <span className="num duel-val">
              {fmt(challenge.values[i])} <span className="muted small">{challenge.unit}</span>
            </span>
          </div>
        ))}
        <p className="muted small">
          {leader === null ? 'Empatados até agora.' : `${profiles[leader].name} está na frente.`} Quem vencer leva +{COINS.challenge} moedas. Placar geral:{' '}
          {profiles[0].name} {duo.challengeWins[0]} × {duo.challengeWins[1]} {profiles[1].name}.
        </p>
      </motion.section>

      <motion.section className="card" {...rise(3)}>
        <h2>Treinos de {other.name}</h2>
        {partnerRecent.length === 0 && <p className="muted small">Quando {other.name} treinar, aparece aqui para você incentivar.</p>}
        <ul className="feed">
          {partnerRecent.map((w) => (
            <li key={w.id}>
              <div className="grow">
                <strong>{when(w.finishedAt!)}</strong>
                <div className="muted small">
                  {w.sets.length} registro{w.sets.length === 1 ? '' : 's'}, <span className="xp-inline">+{all[partner].results[w.id]?.xpTotal ?? 0} XP</span>
                </div>
              </div>
              <CheerButtons toProfileId={other.id} workoutId={w.id} />
            </li>
          ))}
        </ul>
      </motion.section>

      {received.length > 0 && (
        <motion.section className="card" {...rise(4)}>
          <h2>Incentivos para você</h2>
          <ul className="feed">
            {received.map((c) => (
              <li key={c.id}>
                <span className="cheer-big" aria-hidden>
                  {CHEERS.find((x) => x.id === c.kind)?.icon}
                </span>
                <div className="grow">
                  <strong>
                    {c.from}: {CHEERS.find((x) => x.id === c.kind)?.label}
                  </strong>
                  <div className="muted small">{when(c.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </>
  );
}
