import Character from '../components/Character';
import { XpBar, fmt } from '../components/ui';
import { dayKey, levelTitle, RULES } from '../game/rules';
import { ATTRIBUTES, ATTRIBUTE_LABEL, type Attribute } from '../game/types';
import { heatColor } from '../heat';
import { useProfile, useStore } from '../store';
import { useProgress } from '../useProgress';
import BossSprite from '../components/BossSprite';

const DAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const DAY_NAMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

export default function Home() {
  const p = useProgress();
  const { workouts, look } = useProfile();
  const startWorkout = useStore((s) => s.startWorkout);
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

  return (
    <>
      <header className="forge">
        <Character levels={levels} playerLevel={p.level.level} look={look} />
        <div className="forge-level">
          <div className="row between baseline">
            <span className="level-num">Nível {p.level.level}</span>
            <span className="level-title" style={{ color: heatColor(Math.min(10, p.level.level + 3)) }}>
              {levelTitle(p.level.level)}
            </span>
          </div>
          <XpBar info={p.level} label="Progresso até o próximo nível" />
          <div className="muted small">
            {fmt(p.level.into, 0)} de {fmt(p.level.need, 0)} XP para o nível {p.level.level + 1}
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="row between baseline">
          <h2>Esta semana</h2>
          <span className="muted small">
            meta de {p.week.goal} dias{p.multiplier > 1 && <strong className="mult"> ×{fmt(p.multiplier)} XP</strong>}
          </span>
        </div>
        <ol className="week" aria-label="Dias treinados nesta semana">
          {days.map((day, i) => (
            <li key={i} className={`${day.done ? 'done' : ''}${day.today ? ' today' : ''}`} aria-label={`${day.name}: ${day.done ? 'treinou' : 'sem treino'}`}>
              <span className="mark" />
              <span className="letter">{day.letter}</span>
            </li>
          ))}
        </ol>
        <p className="muted small">
          {p.week.done
            ? 'Meta cumprida. Treinar de novo rende XP; descansar também faz parte.'
            : left === 1
              ? 'Falta 1 dia para cumprir a meta.'
              : `Faltam ${left} dias para cumprir a meta.`}
          {p.streak > 0 && ` Constância de ${p.streak} semana${p.streak > 1 ? 's' : ''}.`}
        </p>
      </section>

      <section className="panel boss-mini">
        <BossSprite def={p.campaign.boss} px={4} className="breathe" />
        <div className="grow">
          <div className="muted small">Chefe da vez</div>
          <strong>{p.campaign.boss.name}</strong>
          <div className="hp">
            <div className="hp-fill" style={{ width: `${((p.campaign.boss.hp - p.campaign.damage) / p.campaign.boss.hp) * 100}%` }} />
          </div>
          <div className="muted small">
            {fmt(p.campaign.boss.hp - p.campaign.damage, 0)} de vida restante
          </div>
        </div>
      </section>

      {(tired.length > 0 || close.length > 0) && (
        <section className="panel warn">
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
        </section>
      )}

      <button className="primary big" onClick={startWorkout}>
        Começar treino
      </button>

      {p.workoutsDone === 0 && (
        <p className="muted small center">Cada atributo que sobe de nível dá uma peça de equipamento: ombreiras, manoplas, peitoral, grevas e capa.</p>
      )}
    </>
  );
}
