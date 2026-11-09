import { motion } from 'motion/react';
import Character from '../components/Character';
import { XpBar, fmt } from '../components/ui';
import { countsAsWorkout, dayKey, FREEZE, freezeOffer, levelTitle, RULES } from '../game/rules';
import { ATTRIBUTES, ATTRIBUTE_LABEL, type Attribute } from '../game/types';
import { heatColor } from '../heat';
import { useStore } from '../store';
import { useGame } from '../useProgress';
import CheerButtons from '../components/CheerButtons';
import { activeMissions, HABIT_XP } from '../game/extras';
import MissionsEditor from '../components/MissionsEditor';
import ProgramCard from '../components/ProgramCard';
import LiveCard from '../components/LiveCard';
import { useMemo, useState } from 'react';
import BossSprite from '../components/BossSprite';
import { monthKey, monthName, shiftMonth } from '../game/recap';

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

export default function Home({ onOpenBosses, onOpenDuo }: { onOpenBosses: () => void; onOpenDuo: () => void }) {
  const { progress: p, profile, profiles, partner, all, coins, habits, me } = useGame();
  const openRecap = useStore((s) => s.openRecap);
  const { workouts, look } = profile;
  const toggleHabit = useStore((s) => s.toggleHabit);
  const freezeWeek = useStore((s) => s.freezeWeek);
  const offer = useMemo(() => freezeOffer(workouts, profile.settings, profile.frozenWeeks ?? []), [workouts, profile.settings, profile.frozenWeeks]);
  const setMissions = useStore((s) => s.setMissions);
  const [editMissions, setEditMissions] = useState(false);
  const missions = activeMissions(profile.missions);
  const other = profiles[partner];
  // Treino mais recente do par nos últimos 3 dias, para incentivar.
  const partnerLast = other?.workouts
    .filter((w) => w.finishedAt && Date.now() - new Date(w.finishedAt).getTime() < 3 * 86400000)
    .sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!))[0];
  const levels = Object.fromEntries(ATTRIBUTES.map((a) => [a, p.attrLevels[a].level])) as Record<Attribute, number>;
  const tired = ATTRIBUTES.filter((a) => p.weekSets[a] > RULES.fatigueSetsPerWeek);
  const close = ATTRIBUTES.filter((a) => p.weekSets[a] >= 16 && p.weekSets[a] <= RULES.fatigueSetsPerWeek);

  // Os 7 dias reais da semana atual e se houve treino em cada um.
  const [y, m, d] = p.week.key.split('-').map(Number);
  // Mesma regra da meta: só treino que conta (3 séries ou 10 min de cardio) marca o dia.
  const trained = new Set(workouts.filter((w) => w.finishedAt && countsAsWorkout(w)).map((w) => dayKey(new Date(w.finishedAt!))));
  const today = dayKey(new Date());
  const habitsToday = habits[me][today] ?? [];
  const manualToday = profile.habits?.[today] ?? [];
  // Primeira semana do mês: a retrospectiva do mês passado aparece aqui.
  const lastMonth = shiftMonth(monthKey(new Date()), -1);
  const showRecap = new Date().getDate() <= 7 && workouts.some((w) => w.finishedAt?.startsWith(lastMonth));
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
          <div className="row gap-sm">
            <span className="coin-chip" aria-label={` moedas`}>
              <span className="coin" aria-hidden />
              <span className="num">{coins.balance}</span>
            </span>
            <span className="title-chip" style={{ color: heatColor(Math.min(10, p.level.level + 3)) }}>
              {levelTitle(p.level.level)}
            </span>
          </div>
        </div>
        <div className="stage">
          <Character levels={levels} playerLevel={p.level.level} look={look} capa={profile.equipped?.capa} pet={profile.equipped?.pet} />
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

      {offer && (
        <motion.section className="card warn freeze" {...rise(1)}>
          <span className="eyebrow">Constância em risco</span>
          <h2>A semana passada ficou abaixo da meta</h2>
          <p className="muted small">
            Sua constância caiu de {offer.streakIfFrozen} para {offer.streakNow} semanas (bônus de XP ×{fmt(1 + 0.1 * Math.min(5, offer.streakIfFrozen))} → ×{fmt(1 + 0.1 * Math.min(5, offer.streakNow))}). Dá para congelar uma semana a cada {FREEZE.everyWeeks}.
          </p>
          <button
            className="primary"
            disabled={coins.balance < FREEZE.cost}
            onClick={() => confirm(`Congelar a semana passada por ${FREEZE.cost} moedas?`) && freezeWeek(offer.week)}
          >
            Congelar por {FREEZE.cost} moedas
          </button>
          {coins.balance < FREEZE.cost && <p className="muted small">Você tem {coins.balance} moedas.</p>}
        </motion.section>
      )}

      {showRecap && (
        <motion.button className="card recap-teaser" onClick={() => openRecap(lastMonth)} whileTap={{ scale: 0.98 }} {...rise(1)}>
          <span className="eyebrow">Retrospectiva</span>
          <strong>Seu {monthName(lastMonth)} na forja</strong>
          <span className="muted small">Treinos, recordes e o que vocês fizeram juntos. Toque para ver.</span>
        </motion.button>
      )}

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

      <motion.div {...rise(2)}>
        <ProgramCard profile={profile} />
      </motion.div>

      <motion.section className="card habits" {...rise(2)}>
        <div className="row between baseline">
          <h2>Missões de hoje</h2>
          <span className="muted small">
            +{HABIT_XP} XP cada ·{' '}
            <button className="link small" onClick={() => setEditMissions((v) => !v)}>
              {editMissions ? 'fechar' : 'editar'}
            </button>
          </span>
        </div>
        {editMissions ? (
          <MissionsEditor
            value={profile.missions}
            onClose={() => setEditMissions(false)}
            onSave={(m) => {
              setMissions(m);
              setEditMissions(false);
            }}
          />
        ) : (
        <div className="habit-list">
          {missions.map((h) => {
            const on = habitsToday.includes(h.id);
            const byDiet = on && !manualToday.includes(h.id);
            return (
              <motion.button
                key={h.id}
                className={`habit${on ? ' on' : ''}`}
                aria-pressed={on}
                disabled={byDiet}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  toggleHabit(today, h.id);
                  if (!on) navigator.vibrate?.(15);
                }}
              >
                <span className="check" aria-hidden />
                <span>{h.label}</span>
                {byDiet && <span className="habit-tag">pela dieta</span>}
              </motion.button>
            );
          })}
        </div>
        )}
      </motion.section>

      <LiveCard />

      {partnerLast && (
        <motion.section className="card partner-card" {...rise(3)}>
          <button className="partner-text" onClick={onOpenDuo}>
            <span className="avatar" aria-hidden>
              {other.name.trim().charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{other.name} treinou</strong>
              <span className="muted small">
                {' '}
                +{all[partner].results[partnerLast.id]?.xpTotal ?? 0} XP
              </span>
            </span>
          </button>
          <CheerButtons toProfileId={other.id} workoutId={partnerLast.id} />
        </motion.section>
      )}

      <motion.button className="card boss-card" onClick={onOpenBosses} whileTap={{ scale: 0.98 }} {...rise(4)}>
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
        <motion.section className="card warn" {...rise(5)}>
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
