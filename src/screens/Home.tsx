import { motion } from 'motion/react';
import Character from '../components/Character';
import { XpBar, fmt } from '../components/ui';
import { dayKey, levelTitle, RULES } from '../game/rules';
import { ATTRIBUTES, ATTRIBUTE_LABEL, type Attribute } from '../game/types';
import { heatColor } from '../heat';
import { useProfile } from '../store';
import { useProgress } from '../useProgress';
import BossSprite from '../components/BossSprite';

const DAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const DAY_NAMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.04 + i * 0.06, type: 'spring', stiffness: 380, damping: 32 } as const,
});

/** Anel de progresso da meta semanal. */
function Ring({ value, goal }: { value: number; goal: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const t = Math.min(1, value / goal);
  return (
    <svg className="ring" width="68" height="68" viewBox="0 0 68 68" aria-hidden>
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd166" />
          <stop offset="0.5" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ff4d4d" />
        </linearGradient>
      </defs>
      <circle cx="34" cy="34" r={r} className="ring-track" />
      <motion.circle
        cx="34"
        cy="34"
        r={r}
        className="ring-fill"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - t) }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}
        transform="rotate(-90 34 34)"
      />
    </svg>
  );
}

export default function Home({ onOpenBosses }: { onOpenBosses: () => void }) {
  const p = useProgress();
  const { workouts, look } = useProfile();
  const levels = Object.fromEntries(ATTRIBUTES.map((a) => [a, p.attrLevels[a].level])) as Record<Attribute, number>;
  const tired = ATTRIBUTES.filter((a) => p.weekSets[a] > RULES.fatigueSetsPerWeek);
  const close = ATTRIBUTES.filter((a) => p.weekSets[a] >= 16 && p.weekSets[a] <= RULES.fatigueSetsPerWeek);

  // Os 7 dias reais da semana atual e se houve treino em cada um.
  const [y, m, d] = p.week.key.split('-').map(Number);
  const trained = new Set(workouts.filter((w) => w.finishedAt).map((w) => dayKey(new Date(w.finishedAt!))));
  const today = dayKey(new Date());
  const days = DAY_LETTERS.map((letter, i) => {
    const key = dayKey(new Date(y, m - 1, d + i));
    return { letter, name: DAY_NAMES[i], done: trained.has(key), today: key === today };
  });
  const left = Math.max(0, p.week.goal - p.week.days);
  const { boss, damage } = p.campaign;
  const hpPct = ((boss.hp - damage) / boss.hp) * 100;

  return (
    <>
      <motion.section className="card hero" {...rise(0)}>
        <div className="hero-top">
          <div className="lvl-badge">
            <span className="lvl-label">NV</span>
            <span className="lvl-num">{p.level.level}</span>
          </div>
          <span className="title-chip" style={{ color: heatColor(Math.min(10, p.level.level + 3)) }}>
            {levelTitle(p.level.level)}
          </span>
        </div>
        <div className="stage">
          <Character levels={levels} playerLevel={p.level.level} look={look} />
        </div>
        <div className="hero-xp">
          <XpBar info={p.level} label="Progresso até o próximo nível" />
          <div className="row between small">
            <span className="muted">Próximo nível</span>
            <span className="num">
              {fmt(p.level.into, 0)} <span className="muted">/ {fmt(p.level.need, 0)} XP</span>
            </span>
          </div>
        </div>
      </motion.section>

      <motion.section className="card week-card" {...rise(1)}>
        <div className="week-ring">
          <Ring value={p.week.days} goal={p.week.goal} />
          <div className="ring-label">
            <span className="num">{Math.min(p.week.days, 99)}</span>
            <span className="muted">/{p.week.goal}</span>
          </div>
        </div>
        <div className="grow">
          <div className="row between baseline">
            <h2>Esta semana</h2>
            {p.multiplier > 1 && <span className="mult-chip">×{fmt(p.multiplier)} XP</span>}
          </div>
          <ol className="week" aria-label="Dias treinados nesta semana">
            {days.map((day, i) => (
              <li key={i} className={`${day.done ? 'done' : ''}${day.today ? ' today' : ''}`} aria-label={`${day.name}: ${day.done ? 'treinou' : 'sem treino'}`}>
                <span className="dot" />
                <span className="letter">{day.letter}</span>
              </li>
            ))}
          </ol>
          <p className="muted small">
            {p.week.done ? 'Meta cumprida. Descansar também conta.' : left === 1 ? 'Falta 1 dia para a meta.' : `Faltam ${left} dias para a meta.`}
            {p.streak > 0 && ` ${p.streak} semana${p.streak > 1 ? 's' : ''} seguida${p.streak > 1 ? 's' : ''}.`}
          </p>
        </div>
      </motion.section>

      <motion.button className="card boss-card" onClick={onOpenBosses} whileTap={{ scale: 0.98 }} {...rise(2)}>
        <div className="boss-tile">
          <BossSprite def={boss} px={4} className="breathe" />
        </div>
        <div className="grow">
          <div className="eyebrow">Chefe da vez</div>
          <strong className="boss-card-name">{boss.name}</strong>
          <div className="hp">
            <div className="hp-fill" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="muted small">{fmt(boss.hp - damage, 0)} de vida restante</div>
        </div>
        <span className="chev" aria-hidden>
          ›
        </span>
      </motion.button>

      {(tired.length > 0 || close.length > 0) && (
        <motion.section className="card warn" {...rise(3)}>
          {tired.map((a) => (
            <p key={a}>
              {ATTRIBUTE_LABEL[a]} passou de {RULES.fatigueSetsPerWeek} séries nesta semana ({p.weekSets[a]}). Novas séries dele rendem metade do XP.
            </p>
          ))}
          {close.map((a) => (
            <p key={a}>
              {ATTRIBUTE_LABEL[a]} está com {p.weekSets[a]} de {RULES.fatigueSetsPerWeek} séries na semana.
            </p>
          ))}
        </motion.section>
      )}

      {p.workoutsDone === 0 && (
        <p className="muted small center">
          Toque em Treinar para começar. Cada atributo que sobe de nível dá uma peça de equipamento ao seu personagem.
        </p>
      )}
    </>
  );
}
