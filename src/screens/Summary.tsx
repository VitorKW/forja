import { useEffect, useMemo, useState } from 'react';
import Seal from '../components/Seal';
import { fmt } from '../components/ui';
import { ACHIEVEMENTS } from '../game/achievements';
import { EXERCISE_BY_ID } from '../game/exercises';
import { levelTitle } from '../game/rules';
import { ATTRIBUTES, ATTRIBUTE_LABEL } from '../game/types';
import { HEAT } from '../heat';
import { useProfile, useStore } from '../store';
import BossSprite from '../components/BossSprite';
import type { CampaignState } from '../game/campaign';
import { useGame, useProgress } from '../useProgress';
import JointBoard from '../components/JointBoard';
import { durationSec, partnerWorkoutOf, startedTogether, workoutStats } from '../game/joint';
import { JOINT } from '../game/duo';
import type { Workout } from '../game/types';

function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setV(target);
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

/** O único momento orquestrado do app: faíscas saindo da bigorna quando o treino termina. */
function Sparks({ count = 28 }: { count?: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = -90 + (Math.random() - 0.5) * 140;
        const dist = 60 + Math.random() * 110;
        const rad = (angle * Math.PI) / 180;
        return {
          i,
          x: Math.cos(rad) * dist,
          y: Math.sin(rad) * dist,
          delay: Math.random() * 0.25,
          color: HEAT[5 + Math.floor(Math.random() * 5)],
        };
      }),
    [count],
  );
  return (
    <div className="sparks" aria-hidden>
      {sparks.map((s) => (
        <span
          key={s.i}
          style={{ '--x': `${s.x}px`, '--y': `${s.y}px`, '--d': `${s.delay}s`, background: s.color, color: s.color } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** O golpe no chefe: a vida cai do antes para o depois; se ele cair, o próximo aparece. */
function BossHit({ before, after, damage }: { before: CampaignState; after: CampaignState; damage: number }) {
  const killed = after.defeated - before.defeated;
  const [hit, setHit] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHit(true), 500);
    return () => clearTimeout(t);
  }, []);
  const startPct = ((before.boss.hp - before.damage) / before.boss.hp) * 100;
  const endPct = killed > 0 ? 0 : ((after.boss.hp - after.damage) / after.boss.hp) * 100;

  return (
    <section className={`panel boss-hit${killed > 0 ? ' killed' : ''}`}>
      <div className="row gap">
        <BossSprite def={before.boss} px={5} defeated={hit && killed > 0} className={hit ? 'hit' : ''} />
        <div className="grow">
          <div className="small muted">{hit ? `−${damage} de vida` : 'Atacando...'}</div>
          <strong>{before.boss.name}</strong>
          <div className="hp">
            <div className="hp-fill" style={{ width: `${hit ? endPct : startPct}%`, transition: 'width 0.9s ease-out' }} />
          </div>
        </div>
      </div>
      {hit && killed > 0 && (
        <p className="boss-down">
          {killed > 1 ? `Você derrubou ${killed} chefes de uma vez!` : `Você derrotou ${before.boss.name}!`} O próximo é{' '}
          <strong>{after.boss.name}</strong>, {after.boss.epithet}.
        </p>
      )}
    </section>
  );
}

/** Treino junto: compara com o treino do par (terminado ou ainda em andamento). */
function JointSummary({ workout }: { workout: Workout }) {
  const g = useGame();
  const [now, setNow] = useState(Date.now());
  const other = g.profiles[g.partner];
  const otherDone = other ? partnerWorkoutOf(workout.id, g.me, g.joint, other.workouts) : undefined;
  const live = other?.live;
  const otherLive = !otherDone && live && !live.finishedAt && startedTogether(live.startedAt, workout.startedAt) ? live : undefined;
  useEffect(() => {
    if (!otherLive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [otherLive]);
  if (!other || (!otherDone && !otherLive)) return null;
  const me = { name: g.profile.name, sec: durationSec(workout.startedAt, workout.finishedAt), stats: workoutStats(workout.sets), done: true };
  return otherDone ? (
    <JointBoard
      title="Treino junto"
      note={`+${JOINT.xp} XP e ${JOINT.coins} moedas`}
      me={me}
      other={{ name: other.name, sec: durationSec(otherDone.startedAt, otherDone.finishedAt), stats: workoutStats(otherDone.sets), done: true }}
    />
  ) : (
    <JointBoard
      title="Treino junto"
      note={`${other.name} ainda está treinando`}
      me={me}
      other={{
        name: other.name,
        sec: durationSec(otherLive!.startedAt, null, now),
        stats: { sets: otherLive!.strengthSets ?? otherLive!.sets, volume: otherLive!.volume ?? 0, km: otherLive!.km ?? 0, cardioMin: otherLive!.cardioMin ?? 0 },
      }}
    />
  );
}

export default function Summary({ workoutId }: { workoutId: string }) {
  const p = useProgress();
  const close = useStore((s) => s.closeSummary);
  const workout = useProfile().workouts.find((w) => w.id === workoutId);
  const r = p.results[workoutId];
  const shown = useCountUp(r?.xpTotal ?? 0);

  if (!r || !workout) {
    return (
      <div className="app">
        <main className="screen">
          <p>Esse treino não existe mais.</p>
          <button className="primary" onClick={close}>
            Voltar à forja
          </button>
        </main>
      </div>
    );
  }

  const attrs = ATTRIBUTES.filter((a) => r.attrXp[a] > 0);
  const maxAttr = Math.max(1, ...attrs.map((a) => r.attrXp[a]));
  const leveled = r.levelAfter > r.levelBefore;
  const date = new Date(workout.finishedAt!).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="app">
      <main className="screen summary">
        <div className="strike">
          <Sparks />
          <div className="strike-num" aria-live="polite">
            +{shown}
            <span className="strike-unit">XP</span>
          </div>
          <p className="muted small">
            {workout.sets.length} {workout.sets.length === 1 ? 'registro' : 'registros'} em {date}
            {r.distance > 0 && `, ${fmt(r.distance)} km`}
            {r.multiplier > 1 && `, com bônus de constância ×${fmt(r.multiplier)}`}
          </p>
        </div>

        {leveled && (
          <section className="panel levelup">
            <div className="levelup-num">Nível {r.levelAfter}</div>
            <div className="muted">
              {levelTitle(r.levelAfter) !== levelTitle(r.levelBefore)
                ? `Você agora é ${levelTitle(r.levelAfter).toLowerCase()}.`
                : 'Seu personagem ficou mais forte.'}
            </div>
          </section>
        )}

        <JointSummary workout={workout} />

        <BossHit before={r.campaignBefore} after={r.campaignAfter} damage={r.xpTotal} />

        {r.records.map((id) => (
          <section key={id} className="panel record-win">
            Recorde pessoal em <strong>{EXERCISE_BY_ID[id]?.name.toLowerCase()}</strong>.
          </section>
        ))}

        {r.achievements.map((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id)!;
          return (
            <section key={id} className="panel achievement-new">
              <Seal name={a.name} unlocked size={52} />
              <div>
                <strong>{a.name}</strong>
                <div className="muted small">{a.description}</div>
              </div>
            </section>
          );
        })}

        <section className="panel">
          <h2>Onde o XP foi parar</h2>
          {attrs.map((a) => (
            <div key={a} className="attr-row">
              <span>{ATTRIBUTE_LABEL[a]}</span>
              <div className="xpbar small">
                <div className="fill" style={{ width: `${(r.attrXp[a] / maxAttr) * 100}%` }} />
              </div>
              <span className="xp-num">+{r.attrXp[a]}</span>
            </div>
          ))}
          {r.bonuses.map((b, i) => (
            <div key={i} className="bonus-row">
              <span>{b.label}</span>
              <span className="xp-num">+{b.xp}</span>
            </div>
          ))}
          {r.fatigued.length > 0 && (
            <p className="muted small">
              {r.fatigued.map((a) => ATTRIBUTE_LABEL[a]).join(' e ')} passou de 20 séries na semana, então parte do XP veio pela metade.
            </p>
          )}
        </section>

        <button className="primary big" onClick={close}>
          Voltar à forja
        </button>
      </main>
    </div>
  );
}
