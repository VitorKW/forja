import { fmt } from './ui';
import { EXERCISE_BY_ID } from '../game/exercises';
import { clock, durationSec, startedTogether, workoutStats, type WorkoutStats } from '../game/joint';
import type { Workout } from '../game/types';
import { useStore, type LiveInfo } from '../store';

export interface Side {
  name: string;
  /** Segundos de treino. */
  sec: number;
  stats: WorkoutStats;
  done?: boolean;
  /** Exercício atual (só durante o treino). */
  now?: string;
}

/** Placar do treino junto: os dois lado a lado. */
/** Durante o treino: aparece quando o par também está treinando (ou acabou de terminar). */
export function LiveJointBoard({ active, now }: { active: Workout; now: number }) {
  const profiles = useStore((s) => s.profiles);
  const currentId = useStore((s) => s.currentId);
  const me = profiles.find((p) => p.id === currentId);
  const other = profiles.find((p) => p.id !== currentId);
  const live = other?.live;
  if (!me || !other || !live || !startedTogether(live.startedAt, active.startedAt)) return null;
  const last = [...active.sets].reverse()[0];
  return (
    <JointBoard
      title="Treino junto"
      note={live.finishedAt ? `${other.name} terminou` : '+30 XP e 10 moedas ao terminarem'}
      me={{ name: me.name, sec: durationSec(active.startedAt, null, now), stats: workoutStats(active.sets), now: last?.exerciseId ?? '' }}
      other={{
        name: other.name,
        sec: durationSec(live.startedAt, live.finishedAt, now),
        stats: { sets: live.sets, volume: 0, km: 0, cardioMin: 0, ...pick(live) },
        done: !!live.finishedAt,
        now: live.last?.exerciseId ?? '',
      }}
    />
  );
}

/** Números do par vindos do "ao vivo" (versões antigas do app só mandam as séries). */
function pick(live: LiveInfo): Partial<WorkoutStats> {
  if (live.volume === undefined) return {};
  return { volume: live.volume, km: live.km ?? 0, cardioMin: live.cardioMin ?? 0, sets: live.strengthSets ?? live.sets };
}

export default function JointBoard({ me, other, title, note }: { me: Side; other: Side; title: string; note?: string }) {
  const cardio = me.stats.cardioMin + other.stats.cardioMin > 0;
  const strength = me.stats.sets + other.stats.sets > 0;
  const rows: { label: string; a: number; b: number; show: (v: number) => string }[] = [
    { label: 'Tempo', a: me.sec, b: other.sec, show: clock },
    ...(strength
      ? [
          { label: 'Séries', a: me.stats.sets, b: other.stats.sets, show: String },
          { label: 'Volume', a: me.stats.volume, b: other.stats.volume, show: (v: number) => `${fmt(v)} kg` },
        ]
      : []),
    ...(cardio
      ? [
          { label: 'Cardio', a: me.stats.cardioMin, b: other.stats.cardioMin, show: (v: number) => `${v} min` },
          { label: 'Distância', a: me.stats.km, b: other.stats.km, show: (v: number) => `${fmt(v)} km` },
        ]
      : []),
  ];

  return (
    <section className="panel joint-board" aria-label={title}>
      <div className="row between baseline">
        <span className="eyebrow">{title}</span>
        {note && <span className="muted small">{note}</span>}
      </div>
      <div className="jb-grid">
        <span />
        <strong className="jb-name">{me.name}</strong>
        <strong className="jb-name">
          {other.name}
          {other.done ? <span className="jb-done"> ✓</span> : <span className="live-dot" aria-label="treinando" />}
        </strong>
        {rows.map((r) => (
          <Row key={r.label} {...r} />
        ))}
        {(me.now || other.now) && (
          <>
            <span className="jb-label">Agora</span>
            <span className="jb-now">{me.now ? EXERCISE_BY_ID[me.now]?.name : '—'}</span>
            <span className="jb-now">{other.done ? 'terminou' : other.now ? EXERCISE_BY_ID[other.now]?.name : '—'}</span>
          </>
        )}
      </div>
    </section>
  );
}

function Row({ label, a, b, show }: { label: string; a: number; b: number; show: (v: number) => string }) {
  const max = Math.max(a, b, 1);
  return (
    <>
      <span className="jb-label">{label}</span>
      <Cell v={a} max={max} lead={a > b} show={show} />
      <Cell v={b} max={max} lead={b > a} show={show} />
    </>
  );
}

function Cell({ v, max, lead, show }: { v: number; max: number; lead: boolean; show: (v: number) => string }) {
  return (
    <span className={`jb-cell${lead ? ' lead' : ''}`}>
      <span className="num">{show(v)}</span>
      <span className="jb-bar" aria-hidden>
        <span style={{ width: `${(v / max) * 100}%` }} />
      </span>
    </span>
  );
}
