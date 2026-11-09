import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart, LineChart, type Point } from '../components/Charts';
import { fmt } from '../components/ui';
import { EXERCISE_BY_ID } from '../game/exercises';
import { dayKey, estimate1RM, weekKey, nextWeek } from '../game/rules';
import { canBuy, SHOP, type ShopItem } from '../game/shop';
import { bestSetOf, MEASURES, measureSeries, weightTrend, type MeasureId } from '../game/evolution';
import { useStore } from '../store';
import { useGame } from '../useProgress';

const sprite = (name: string) => `${import.meta.env.BASE_URL}sprites/${name}.png`;
const shortDate = (day: string) => {
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
};

/** Loja: compra e equipa capas e bichinhos com as moedas. */
export function Shop() {
  const { profile, coins, duo } = useGame();
  const { buyItem, equip } = useStore();
  const purchases = profile.purchases ?? [];
  const equipped = profile.equipped ?? {};

  const action = (item: ShopItem) => {
    const owned = purchases.includes(item.id);
    const on = equipped[item.kind] === item.id;
    if (owned)
      return (
        <button className={on ? 'ghost small-btn' : 'primary small-btn'} onClick={() => equip(item.kind, on ? null : item.id)}>
          {on ? 'Tirar' : 'Usar'}
        </button>
      );
    if (item.needsRaid && (duo?.raidsWon ?? 0) < 1) return <span className="muted small">Vençam um chefe da semana</span>;
    const ok = canBuy(item, coins.balance, purchases, duo?.raidsWon ?? 0);
    return (
      <button
        className="primary small-btn"
        disabled={!ok}
        onClick={() => confirm(`Comprar ${item.name} por ${item.price} moedas?`) && buyItem(item.id)}
      >
        <span className="coin" aria-hidden /> {item.price}
      </button>
    );
  };

  return (
    <section className="panel">
      <div className="row between baseline">
        <h2>Loja</h2>
        <span className="coin-chip">
          <span className="coin" aria-hidden />
          <span className="num">{coins.balance}</span>
        </span>
      </div>
      <p className="muted small">
        Moedas vêm de chefes, conquistas, dias com as 3 missões, desafios e vitórias em dupla.
      </p>
      <div className="shop">
        {SHOP.map((item) => (
          <motion.div key={item.id} className={`shop-item${equipped[item.kind] === item.id ? ' on' : ''}`} layout>
            <div className="shop-art">
              {item.kind === 'capa' ? (
                <>
                  <img src={sprite(`capa_${item.id}`)} alt="" />
                  <img src={sprite(`corpo_${profile.look}`)} alt="" />
                </>
              ) : (
                <img className="pet-art" src={sprite(`pet_${item.id}`)} alt="" />
              )}
            </div>
            <strong className="small">{item.name}</strong>
            {action(item)}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** Evolução: XP por semana, recorde estimado por exercício e peso corporal. */
export function Evolution() {
  const { profile, progress } = useGame();
  const logWeight = useStore((s) => s.logWeight);
  const [kg, setKg] = useState('');
  const exercises = Object.keys(progress.records).filter((id) => EXERCISE_BY_ID[id]);
  const [exId, setExId] = useState<string>('');
  const chosen = exercises.includes(exId) ? exId : exercises[0];

  const weekly: Point[] = useMemo(() => {
    const sums = new Map<string, number>();
    for (const w of profile.workouts) {
      if (!w.finishedAt) continue;
      const k = weekKey(new Date(w.finishedAt));
      sums.set(k, (sums.get(k) ?? 0) + (progress.results[w.id]?.xpTotal ?? 0));
    }
    // Últimas 12 semanas até a atual, incluindo as vazias.
    const now = weekKey(new Date());
    const keys: string[] = [];
    let k = weekKey(new Date(Date.now() - 11 * 7 * 86400000));
    while (k <= now) {
      keys.push(k);
      k = nextWeek(k);
    }
    return keys.map((key) => ({ label: shortDate(key), value: sums.get(key) ?? 0 }));
  }, [profile.workouts, progress.results]);

  const strength: Point[] = useMemo(() => {
    if (!chosen) return [];
    return profile.workouts
      .filter((w) => w.finishedAt)
      .sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!))
      .flatMap((w) => {
        const best = Math.max(0, ...w.sets.filter((s) => s.exerciseId === chosen && !s.warmup).map((s) => estimate1RM(s.weight, s.reps) ?? 0));
        return best > 0 ? [{ label: shortDate(dayKey(new Date(w.finishedAt!))), value: Math.round(best * 10) / 10 }] : [];
      });
  }, [profile.workouts, chosen]);

  const sortedWeights = useMemo(() => [...(profile.bodyWeights ?? [])].sort((a, b) => a.day.localeCompare(b.day)), [profile.bodyWeights]);
  const weights: Point[] = sortedWeights.map((b) => ({ label: shortDate(b.day), value: b.kg }));
  const trend = useMemo(() => weightTrend(sortedWeights), [sortedWeights]);
  const best = useMemo(() => (chosen ? bestSetOf(profile.workouts, chosen) : null), [profile.workouts, chosen]);
  const unit = profile.settings.unit;
  const save = () => {
    const v = Number(kg.replace(',', '.'));
    if (v >= 25 && v <= 300) {
      logWeight(dayKey(new Date()), Math.round(v * 10) / 10);
      setKg('');
    }
  };

  return (
    <section className="panel">
      <h2>Evolução</h2>

      <h3>XP por semana</h3>
      <BarChart data={weekly} unit="XP" caption="XP por semana nas últimas 12 semanas" />

      <div className="row between baseline chart-head">
        <h3>Força estimada (1RM)</h3>
        {exercises.length > 1 && (
          <select className="mini-select" value={chosen} onChange={(e) => setExId(e.target.value)} aria-label="Exercício">
            {exercises.map((id) => (
              <option key={id} value={id}>
                {EXERCISE_BY_ID[id].name}
              </option>
            ))}
          </select>
        )}
      </div>
      {strength.length >= 2 ? (
        <LineChart data={strength} unit={profile.settings.unit} caption={`1RM estimado em ${EXERCISE_BY_ID[chosen]?.name}`} />
      ) : (
        <p className="muted small">Registre o mesmo exercício de força em dois treinos para ver a curva.</p>
      )}
      {best && (
        <p className="muted small chart-note">
          Melhor série: {fmt(best.best.weight)} {unit} × {best.best.reps} em {shortDate(best.best.day)} (1RM ≈ {fmt(best.best.oneRM)} {unit}) · carga máxima {fmt(best.heaviest)} {unit}
        </p>
      )}

      <h3 className="chart-head">Peso corporal</h3>
      {weights.length >= 2 ? (
        <>
          <LineChart data={weights} unit="kg" caption="Peso corporal ao longo do tempo, com média de 7 dias" trend={trend.avg} trendLabel="média 7 dias" />
          {trend.now !== null && (
            <p className="muted small chart-note">
              Tendência: <strong>{fmt(trend.now)} kg</strong>
              {trend.delta !== null
                ? ` (${trend.delta > 0 ? '+' : trend.delta < 0 ? '−' : '±'}${fmt(Math.abs(trend.delta))} kg em ${Math.round(trend.days / 7)} semanas)`
                : ' · com 4 semanas de registros aparece quanto mudou'}
            </p>
          )}
        </>
      ) : (
        <p className="muted small">{weights.length === 1 ? `Último registro: ${fmt(weights[0].value)} kg.` : 'Registre seu peso de vez em quando para acompanhar.'}</p>
      )}
      <div className="sync-join">
        <input className="search" inputMode="decimal" placeholder="Peso de hoje (kg)" value={kg} onChange={(e) => setKg(e.target.value)} aria-label="Peso de hoje em kg" />
        <button className="ghost" onClick={save}>
          Registrar
        </button>
      </div>

      <Measures />
    </section>
  );
}

/** Medidas (cm): gráfico de uma medida por vez e um formulário para as de hoje. */
function Measures() {
  const { profile } = useGame();
  const logMeasures = useStore((s) => s.logMeasures);
  const list = profile.measures ?? [];
  const [which, setWhich] = useState<MeasureId>('cintura');
  const [draft, setDraft] = useState<Partial<Record<MeasureId, string>>>({});
  const [open, setOpen] = useState(false);
  const { pts, change, since } = measureSeries(list, which);
  const used = MEASURES.filter((m) => list.some((x) => x.cm[m.id] !== undefined));
  const label = MEASURES.find((m) => m.id === which)!.label;

  const save = () => {
    const cm = Object.fromEntries(
      Object.entries(draft)
        .map(([k, v]) => [k, Math.round(Number(String(v).replace(',', '.')) * 10) / 10])
        .filter(([, v]) => Number.isFinite(v) && (v as number) > 0),
    );
    logMeasures(dayKey(new Date()), cm);
    setDraft({});
    setOpen(false);
  };

  return (
    <>
      <div className="row between baseline chart-head">
        <h3>Medidas</h3>
        {used.length > 1 && (
          <select className="mini-select" value={which} onChange={(e) => setWhich(e.target.value as MeasureId)} aria-label="Medida">
            {used.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {pts.length >= 2 ? (
        <>
          <LineChart data={pts.map((p) => ({ label: shortDate(p.day), value: p.value }))} unit="cm" caption={`${label} ao longo do tempo`} />
          {change !== null && since && (
            <p className="muted small chart-note">
              {label}: <strong>{change > 0 ? '+' : change < 0 ? '−' : '±'}{fmt(Math.abs(change))} cm</strong> desde {shortDate(since)}
            </p>
          )}
        </>
      ) : (
        <p className="muted small">
          {pts.length === 1 ? `${label}: ${fmt(pts[0].value)} cm em ${shortDate(pts[0].day)}. ` : ''}A balança às vezes não mexe, mas a fita mostra. Meça a cada 2–4 semanas, de manhã, no mesmo lugar.
        </p>
      )}
      {open ? (
        <>
          <div className="measure-form">
            {MEASURES.map((m) => (
              <label key={m.id}>
                {m.label}
                <input
                  className="search"
                  inputMode="decimal"
                  placeholder="cm"
                  value={draft[m.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [m.id]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <button className="ghost" onClick={save} disabled={!Object.values(draft).some((v) => v && Number(v.replace(',', '.')) > 0)}>
            Salvar medidas de hoje
          </button>
        </>
      ) : (
        <button className="link small" onClick={() => setOpen(true)}>
          + Registrar medidas de hoje
        </button>
      )}
    </>
  );
}

/** Fichas salvas: ver e apagar. */
export function Templates() {
  const { profile } = useGame();
  const deleteTemplate = useStore((s) => s.deleteTemplate);
  const templates = profile.templates ?? [];
  return (
    <section className="panel">
      <h2>Fichas de treino</h2>
      {templates.length === 0 ? (
        <p className="muted small">Durante um treino, toque em "Salvar estes exercícios como ficha". Na próxima vez, é só escolher a ficha.</p>
      ) : (
        <ul className="records">
          {templates.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <div className="muted small">{t.exercises.map((id) => EXERCISE_BY_ID[id]?.name).filter(Boolean).join(', ')}</div>
              </div>
              <button className="icon-btn" aria-label={`Apagar ficha ${t.name}`} onClick={() => confirm(`Apagar a ficha ${t.name}?`) && deleteTemplate(t.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
