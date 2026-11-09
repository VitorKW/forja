import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import Character, { characterLayers } from '../components/Character';
import { fmt } from '../components/ui';
import { EXERCISE_BY_ID } from '../game/exercises';
import { computeRecap, monthKey, monthLabel, monthName, shiftMonth, type Recap as RecapData } from '../game/recap';
import { ATTRIBUTES, type Attribute } from '../game/types';
import { drawRecap, shareImage } from '../recapImage';
import { useStore } from '../store';
import { useGame } from '../useProgress';

const sprite = (name: string) => `${import.meta.env.BASE_URL}sprites/${name}.png`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function stats(r: RecapData) {
  return [
    { label: 'treinos', value: fmt(r.workouts, 0) },
    { label: 'XP ganho', value: fmt(r.xp, 0) },
    { label: 'dias ativos', value: fmt(r.days, 0) },
    { label: 'séries de força', value: fmt(r.strengthSets, 0) },
    { label: 'carga levantada', value: r.volume >= 1000 ? `${fmt(r.volume / 1000, 1)} t` : `${fmt(r.volume, 0)} kg` },
    r.km > 0 ? { label: 'km andados', value: fmt(r.km) } : { label: 'min de cardio', value: fmt(r.cardioMin, 0) },
  ];
}

function highlights(r: RecapData, partnerName: string): string[] {
  const out: string[] = [];
  if (r.records.length) {
    const top = r.records[0];
    out.push(
      `${r.records.length} recorde${r.records.length > 1 ? 's' : ''}: ${EXERCISE_BY_ID[top.exerciseId]?.name} ${fmt(top.best)} kg${r.records.length > 1 ? ' e mais' : ''}`,
    );
  }
  if (r.joint) out.push(`Treinou com ${partnerName} ${r.joint} ${r.joint === 1 ? 'vez' : 'vezes'}`);
  if (r.topExercise) out.push(`Favorito: ${EXERCISE_BY_ID[r.topExercise.exerciseId]?.name} (${r.topExercise.sets} registros)`);
  if (r.favoriteWeekday) out.push(`Dia preferido: ${r.favoriteWeekday}`);
  if (r.missions) out.push(`${r.missions} missões cumpridas${r.fullMissionDays ? `, ${r.fullMissionDays} dias completos` : ''}`);
  if (r.cheers) out.push(`${r.cheers} incentivo${r.cheers > 1 ? 's' : ''} de ${partnerName}`);
  return out;
}

export default function Recap({ month }: { month: string }) {
  const { profiles, all, me, partner, timelines, habits, joint } = useGame();
  const open = useStore((s) => s.openRecap);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const profile = profiles[me];
  const other = profiles[partner];

  const recapOf = (i: number) =>
    computeRecap(month, { workouts: profiles[i].workouts, xpEvents: timelines[i], habits: habits[i], cheers: profiles[i].cheers ?? [], joint });
  const r = useMemo(() => recapOf(me), [month, profiles, timelines, habits, joint, me]); // eslint-disable-line react-hooks/exhaustive-deps
  const o = useMemo(() => (other ? recapOf(partner) : null), [month, profiles, timelines, habits, joint, partner]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = all[me];
  const levels = Object.fromEntries(ATTRIBUTES.map((a) => [a, p.attrLevels[a].level])) as Record<Attribute, number>;
  const current = monthKey(new Date());
  const title = cap(monthLabel(month));
  const list = highlights(r, other?.name ?? 'o par');

  const share = async () => {
    setBusy(true);
    setNote(null);
    try {
      const blob = await drawRecap({
        eyebrow: 'Retrospectiva',
        title: cap(monthName(month)),
        name: `${month.slice(0, 4)} · ${profile.name}`,
        stats: stats(r),
        highlights: list,
        layers: characterLayers(levels, p.level.level, profile.look, profile.equipped?.capa).map(sprite),
        pet: profile.equipped?.pet ? sprite(`pet_${profile.equipped.pet}`) : undefined,
      });
      const res = await shareImage(blob, `forja-${month}.png`, `Minha retrospectiva de ${monthLabel(month)}`);
      if (res === 'downloaded') setNote('Imagem salva.');
    } catch {
      setNote('Não consegui gerar a imagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar recap-top">
        <button className="link" onClick={() => open(null)}>
          ‹ Voltar
        </button>
        <div className="month-nav">
          <button className="icon-btn" aria-label="Mês anterior" onClick={() => open(shiftMonth(month, -1))}>
            ‹
          </button>
          <button className="icon-btn" aria-label="Próximo mês" disabled={month >= current} onClick={() => open(shiftMonth(month, 1))}>
            ›
          </button>
        </div>
      </header>
      <main className="screen">
        <motion.section key={month} className="card recap-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          <div className="recap-head">
            <div>
              <span className="eyebrow">Retrospectiva</span>
              <h1>{title}</h1>
              <p className="muted">{profile.name}</p>
            </div>
            <Character levels={levels} playerLevel={p.level.level} look={profile.look} capa={profile.equipped?.capa} scale={4.5} />
          </div>

          {r.workouts === 0 && r.xp === 0 ? (
            <p className="muted">Nada registrado em {monthLabel(month)}.</p>
          ) : (
            <>
              <div className="recap-stats">
                {stats(r).map((s, i) => (
                  <motion.div key={s.label} className="recap-stat" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                    <span className={`num${i === 0 ? ' grad-text' : ''}`}>{s.value}</span>
                    <span className="muted small">{s.label}</span>
                  </motion.div>
                ))}
              </div>
              {list.length > 0 && (
                <ul className="recap-list">
                  {list.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </motion.section>

        {o && other && (r.workouts > 0 || o.workouts > 0) && (
          <section className="card">
            <h2>Vocês dois em {monthLabel(month).split(' de ')[0]}</h2>
            {[
              { label: 'Treinos', v: [r.workouts, o.workouts] },
              { label: 'XP', v: [r.xp, o.xp] },
              { label: 'Séries de força', v: [r.strengthSets, o.strengthSets] },
              { label: 'Missões', v: [r.missions, o.missions] },
            ].map((row) => {
              const max = Math.max(1, ...row.v);
              const names = [profile.name, other.name];
              return (
                <div key={row.label} className="versus">
                  <span className="muted small">{row.label}</span>
                  {row.v.map((v, k) => (
                    <div key={k} className="duel-row">
                      <span className="duel-name">{names[k]}</span>
                      <div className="duel-track">
                        <div className={`duel-fill p${k === 0 ? me : partner}`} style={{ width: `${(v / max) * 100}%` }} />
                      </div>
                      <span className="num duel-val">{fmt(v, 0)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {r.joint > 0 && <p className="muted small">Treinaram juntos {r.joint} {r.joint === 1 ? 'vez' : 'vezes'}.</p>}
          </section>
        )}

        {r.workouts > 0 && (
          <button className="primary big" onClick={share} disabled={busy}>
            {busy ? 'Gerando imagem...' : 'Compartilhar imagem'}
          </button>
        )}
        {note && <p className="muted small center">{note}</p>}
      </main>
    </div>
  );
}
