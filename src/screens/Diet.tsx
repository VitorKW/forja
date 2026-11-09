import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart, type Point } from '../components/Charts';
import FoodSearch from '../components/FoodSearch';
import { fmt } from '../components/ui';
import { ACTIVITY, KCAL_GOALS, kcalFor, kcalGoalFor, kcalStatus, proteinFor, QUICK_FOODS, totals, WATER_STEPS, waterFor, type DietGoals, type KcalInput } from '../game/diet';
import { countsAsWorkout, dayKey } from '../game/rules';
import { useStore } from '../store';
import { goalsOf, useGame } from '../useProgress';

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.04 + i * 0.06, type: 'spring', stiffness: 380, damping: 32 } as const,
});

function Meter({ label, value, goal, unit, tone, format = (n: number) => fmt(n, 0), status, note }: { label: string; value: number; goal: number; unit: string; tone: string; format?: (n: number) => string; status?: 'done' | 'over'; note?: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const state = status ?? (goal > 0 && value >= goal ? 'done' : undefined);
  return (
    <div className={`meter${state ? ` ${state}` : ''}`}>
      <div className="row between baseline">
        <span className="meter-label">{label}</span>
        <span className="num">
          {format(value)}
          <span className="muted small"> {goal > 0 ? `/ ${format(goal)} ${unit}` : unit}</span>
        </span>
      </div>
      <div className="meter-track" role="meter" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className={`meter-fill ${tone}`} initial={false} animate={{ width: `${goal > 0 ? pct : 0}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
      </div>
      {note && <p className="muted small meter-note">{note}</p>}
    </div>
  );
}

const liters = (ml: number) => fmt(ml / 1000, 2);

/** Calorias são um alvo: perto da meta está certo, muito acima avisa. */
function KcalMeter({ value, goal }: { value: number; goal: number }) {
  const st = kcalStatus(value, goal);
  const note =
    st === 'acima' ? `${fmt(value - goal, 0)} kcal acima da meta` : st === 'ok' ? 'Dentro da meta' : st === 'abaixo' ? `Faltam ${fmt(goal - value, 0)} kcal` : undefined;
  return <Meter label="Calorias" value={value} goal={goal} unit="kcal" tone="kcal" status={st === 'ok' ? 'done' : st === 'acima' ? 'over' : undefined} note={value > 0 ? note : undefined} />;
}

/** Estimativa da meta de calorias (Mifflin-St Jeor). Os dados não ficam salvos. */
function KcalCalc({ weight, onUse }: { weight?: number; onUse: (kcal: number) => void }) {
  const [f, setF] = useState({ sex: 'm' as KcalInput['sex'], age: '', height: '', weight: weight ? String(weight) : '', activity: 'moderado' as KcalInput['activity'], goal: 'manter' as KcalInput['goal'] });
  const n = (s: string) => Number(s.replace(',', '.')) || 0;
  const ok = n(f.age) >= 14 && n(f.age) <= 100 && n(f.height) >= 120 && n(f.height) <= 230 && n(f.weight) >= 30 && n(f.weight) <= 300;
  const kcal = ok ? kcalFor({ sex: f.sex, age: n(f.age), heightCm: n(f.height), weightKg: n(f.weight), activity: f.activity, goal: f.goal }) : null;
  return (
    <details className="custom-food kcal-calc">
      <summary>Calcular minha meta de calorias</summary>
      <div className="seg" role="group" aria-label="Sexo">
        <button className={f.sex === 'm' ? 'on' : ''} onClick={() => setF({ ...f, sex: 'm' })}>
          Homem
        </button>
        <button className={f.sex === 'f' ? 'on' : ''} onClick={() => setF({ ...f, sex: 'f' })}>
          Mulher
        </button>
      </div>
      <div className="custom-grid">
        <input className="search" inputMode="numeric" placeholder="Idade" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} aria-label="Idade" />
        <input className="search" inputMode="numeric" placeholder="Altura (cm)" value={f.height} onChange={(e) => setF({ ...f, height: e.target.value })} aria-label="Altura em centímetros" />
        <input className="search" inputMode="decimal" placeholder="Peso (kg)" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} aria-label="Peso em kg" />
      </div>
      <label className="setting">
        Atividade
        <select value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value as KcalInput['activity'] })}>
          {ACTIVITY.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="setting">
        Objetivo
        <select value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value as KcalInput['goal'] })}>
          {KCAL_GOALS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      {kcal !== null ? (
        <button className="ghost" onClick={() => onUse(kcal)}>
          Usar {fmt(kcal, 0)} kcal por dia
        </button>
      ) : (
        <p className="muted small">Preencha idade, altura e peso.</p>
      )}
      <p className="muted small">Estimativa pela equação de Mifflin-St Jeor: perder = 20% abaixo do gasto, ganhar = 10% acima. Ajuste pelo que a balança mostrar em 2–3 semanas.</p>
    </details>
  );
}

function GoalsForm({ goals, weight, onSave }: { goals: DietGoals; weight?: number; onSave: (g: DietGoals) => void }) {
  const [p, setP] = useState(String(goals.proteina));
  const [k, setK] = useState(goals.kcal ? String(goals.kcal) : '');
  const [kr, setKr] = useState(goals.kcalRest ? String(goals.kcalRest) : '');
  const [a, setA] = useState(liters(goals.agua));
  const num = (s: string) => Number(s.replace(',', '.')) || 0;
  return (
    <div className="goals-form">
      <p className="muted small">A meta nova vale de hoje em diante: os dias passados continuam com a meta que tinham.</p>
      <label className="setting">
        Proteína (g)
        <input className="name-input" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} />
      </label>
      {weight && (
        <button className="link small" onClick={() => setP(String(proteinFor(weight)))}>
          Usar 1,8 g por kg ({fmt(weight)} kg → {proteinFor(weight)} g)
        </button>
      )}
      <label className="setting">
        Água (litros)
        <input className="name-input" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
      </label>
      {weight && (
        <button className="link small" onClick={() => setA(liters(waterFor(weight)))}>
          Usar 35 ml por kg ({liters(waterFor(weight))} L)
        </button>
      )}
      <label className="setting">
        Calorias (kcal)
        <input className="name-input" inputMode="numeric" placeholder="sem meta" value={k} onChange={(e) => setK(e.target.value)} />
      </label>
      <label className="setting">
        Calorias em dia sem treino
        <input className="name-input" inputMode="numeric" placeholder="igual" value={kr} onChange={(e) => setKr(e.target.value)} aria-label="Calorias em dia sem treino" />
      </label>
      <KcalCalc weight={weight} onUse={(v) => setK(String(v))} />
      <button
        className="primary"
        onClick={() =>
          onSave({
            proteina: Math.max(0, Math.round(num(p))),
            kcal: Math.max(0, Math.round(num(k))),
            ...(num(kr) > 0 ? { kcalRest: Math.round(num(kr)) } : {}),
            agua: Math.max(0, Math.round(num(a) * 1000)),
          })
        }
      >
        Salvar metas
      </button>
    </div>
  );
}

export default function Diet() {
  const { profile, profiles, partner } = useGame();
  const { addFood, removeFood, setDietGoals, saveMeal, deleteMeal, addMeal } = useStore();
  const [picking, setPicking] = useState<Set<string> | null>(null);
  const [mealEdit, setMealEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState({ label: '', proteina: '', kcal: '' });
  const [flash, setFlash] = useState<string | null>(null);
  const today = dayKey(new Date());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dayKey(d);
  })();
  const [day, setDay] = useState(today);
  const goals = goalsOf(profile);
  const entries = profile.dietLog?.[today] ?? [];
  const dayEntries = profile.dietLog?.[day] ?? [];
  const t = totals(entries);
  const other = profiles[partner];
  const ot = other ? totals(other.dietLog?.[today]) : null;
  const og = other ? goalsOf(other) : null;
  const weight = profile.bodyWeights?.at(-1)?.kg;
  const trainingDay = !!profile.active || profile.workouts.some((w) => w.finishedAt && dayKey(new Date(w.finishedAt)) === today && countsAsWorkout(w));
  const kcalGoal = kcalGoalFor(goals, trainingDay);
  const meals = profile.meals ?? [];

  const add = (e: { label: string; proteina: number; kcal: number; agua: number; carbs?: number; fat?: number }, key: string) => {
    addFood(e, day);
    navigator.vibrate?.(12);
    setFlash(key);
    setTimeout(() => setFlash((f) => (f === key ? null : f)), 500);
  };

  const history: Point[] = useMemo(() => {
    const out: Point[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      out.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, value: totals(profile.dietLog?.[k]).proteina });
    }
    return out;
  }, [profile.dietLog]);

  const toNum = (s: string) => Number(s.replace(',', '.')) || 0;
  const customOk = toNum(custom.proteina) > 0 || toNum(custom.kcal) > 0;

  return (
    <>
      <h1>Dieta</h1>
      <p className="muted lead">Registro rápido, sem contar grama por grama. Bater proteína e água marca as missões do dia sozinho.</p>

      <motion.section className="card" {...rise(0)}>
        <div className="row between baseline">
          <h2>Hoje</h2>
          <button className="link small" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Fechar' : 'Metas'}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {editing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <GoalsForm
                goals={goals}
                weight={weight}
                onSave={(g) => {
                  setDietGoals(g);
                  setEditing(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <Meter label="Proteína" value={t.proteina} goal={goals.proteina} unit="g" tone="protein" />
        <Meter label="Água" value={t.agua} goal={goals.agua} unit="L" tone="water" format={liters} />
        <KcalMeter value={t.kcal} goal={kcalGoal} />
        {goals.kcalRest ? <p className="muted small">Hoje: {trainingDay ? 'dia de treino' : 'dia sem treino'} (a meta muda quando você termina um treino).</p> : null}
        {(t.carbs > 0 || t.fat > 0) && (
          <p className="macros muted small">
            Carboidrato <span className="num">{fmt(t.carbs, 0)} g</span> · Gordura <span className="num">{fmt(t.fat, 0)} g</span>
            <span className="faint"> (só alimentos da busca e dos atalhos)</span>
          </p>
        )}
      </motion.section>

      <motion.section className="card" {...rise(1)}>
        <div className="row between baseline">
          <h2>{day === today ? 'Comi agora' : 'Esqueci de registrar'}</h2>
          <div className="seg" role="group" aria-label="Dia do registro">
            <button className={day === today ? 'on' : ''} onClick={() => setDay(today)}>
              Hoje
            </button>
            <button className={day === yesterday ? 'on' : ''} onClick={() => setDay(yesterday)}>
              Ontem
            </button>
          </div>
        </div>
        {meals.length > 0 && (
          <div className="meals">
            <div className="row between baseline">
              <span className="field-label">Refeições</span>
              <button className="link small" onClick={() => setMealEdit((v) => !v)}>
                {mealEdit ? 'Pronto' : 'Editar'}
              </button>
            </div>
            <div className="recent-list">
              {meals.map((m) => (
                <button
                  key={m.id}
                  className="qchip"
                  onClick={() => {
                    if (mealEdit) {
                      if (confirm(`Apagar a refeição "${m.name}"?`)) deleteMeal(m.id);
                      return;
                    }
                    addMeal(m.id, day);
                    navigator.vibrate?.(12);
                  }}
                  aria-label={mealEdit ? `Apagar ${m.name}` : `Adicionar ${m.name}: ${m.items.map((i) => i.label).join(', ')}`}
                >
                  {mealEdit && '× '}
                  {m.name} <span className="muted small">· {fmt(m.items.reduce((s, i) => s + i.proteina, 0), 0)} g</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <FoodSearch onAdd={add} log={profile.dietLog} />
        <span className="field-label">Atalhos</span>
        <div className="food-grid">
          {QUICK_FOODS.map((f) => (
            <motion.button
              key={f.id}
              className={`food${flash === f.id ? ' flash' : ''}`}
              whileTap={{ scale: 0.92 }}
              onClick={() => add({ label: `${f.label} (${f.portion})`, proteina: f.proteina, kcal: f.kcal, carbs: f.carbs, fat: f.fat, agua: 0 }, f.id)}
              aria-label={`Adicionar ${f.label} (${f.portion}): ${f.proteina} g de proteína, ${f.kcal} kcal`}
            >
              <span className="food-icon" aria-hidden>
                {f.icon}
              </span>
              <span className="food-name">{f.label}</span>
              <span className="food-portion">{f.portion}</span>
              <span className="food-p num">{f.proteina} g</span>
            </motion.button>
          ))}
        </div>
        <div className="water-row">
          {WATER_STEPS.map((w) => (
            <motion.button
              key={w.ml}
              className={`water${flash === `agua${w.ml}` ? ' flash' : ''}`}
              whileTap={{ scale: 0.94 }}
              onClick={() => add({ label: `${w.label} de água`, proteina: 0, kcal: 0, agua: w.ml }, `agua${w.ml}`)}
            >
              <span aria-hidden>💧</span> {w.label} <span className="num">+{w.ml} ml</span>
            </motion.button>
          ))}
        </div>
        <details className="custom-food">
          <summary>Outro alimento</summary>
          <div className="custom-grid">
            <input className="search" placeholder="Nome (opcional)" value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} aria-label="Nome do alimento" />
            <input className="search" inputMode="decimal" placeholder="Proteína (g)" value={custom.proteina} onChange={(e) => setCustom({ ...custom, proteina: e.target.value })} aria-label="Proteína em gramas" />
            <input className="search" inputMode="numeric" placeholder="Calorias" value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} aria-label="Calorias" />
            <button
              className="primary"
              disabled={!customOk}
              onClick={() => {
                add(
                  {
                    label: custom.label.trim() || 'Refeição',
                    proteina: Math.max(0, Math.round(toNum(custom.proteina))),
                    kcal: Math.max(0, Math.round(toNum(custom.kcal))),
                    agua: 0,
                  },
                  'custom',
                );
                setCustom({ label: '', proteina: '', kcal: '' });
              }}
            >
              Adicionar
            </button>
          </div>
        </details>
      </motion.section>

      {dayEntries.length > 0 && (
        <motion.section className="card" {...rise(2)}>
          <div className="row between baseline">
            <h2>{day === today ? 'Registros de hoje' : `Registros de ontem (${fmt(totals(dayEntries).proteina, 0)} g de proteína)`}</h2>
            <button className="link small" onClick={() => setPicking(picking ? null : new Set())}>
              {picking ? 'Cancelar' : 'Salvar refeição'}
            </button>
          </div>
          {picking && (
            <div className="meal-save">
              <p className="muted small">Marque os alimentos da refeição (ex.: seu café da manhã de sempre).</p>
              <button
                className="primary"
                disabled={!picking.size}
                onClick={() => {
                  const name = prompt('Nome da refeição:', meals.length ? `Refeição ${meals.length + 1}` : 'Café da manhã');
                  if (!name?.trim()) return;
                  saveMeal(
                    name.trim().slice(0, 30),
                    dayEntries.filter((e) => picking.has(e.id)).map(({ id: _id, at: _at, ...rest }) => rest),
                  );
                  setPicking(null);
                }}
              >
                Salvar {picking.size || ''} {picking.size === 1 ? 'alimento' : 'alimentos'}
              </button>
            </div>
          )}
          <ul className="records">
            <AnimatePresence initial={false}>
              {[...dayEntries].reverse().map((e) => (
                <motion.li key={e.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                  {picking && (
                    <input
                      type="checkbox"
                      aria-label={`Incluir ${e.label}`}
                      checked={picking.has(e.id)}
                      onChange={(ev) => {
                        const s = new Set(picking);
                        if (ev.target.checked) s.add(e.id);
                        else s.delete(e.id);
                        setPicking(s);
                      }}
                    />
                  )}
                  <div className="grow">
                    <strong>{e.label}</strong>
                    <div className="muted small">
                      {new Date(e.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {[e.proteina ? `${e.proteina} g de proteína` : '', e.kcal ? `${e.kcal} kcal` : '', e.agua ? `${e.agua} ml` : ''].filter(Boolean).map((s) => ` · ${s}`)}
                    </div>
                  </div>
                  <button className="icon-btn" aria-label={`Apagar ${e.label}`} onClick={() => removeFood(day, e.id)}>
                    ×
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>
      )}

      {other && ot && og && (
        <motion.section className="card" {...rise(3)}>
          <h2>{other.name} hoje</h2>
          <Meter label="Proteína" value={ot.proteina} goal={og.proteina} unit="g" tone="protein p1" />
          <Meter label="Água" value={ot.agua} goal={og.agua} unit="L" tone="water p1" format={liters} />
        </motion.section>
      )}

      <motion.section className="card" {...rise(4)}>
        <h2>Proteína nos últimos 14 dias</h2>
        <BarChart data={history} unit="g" caption="Proteína por dia nos últimos 14 dias" />
        <p className="muted small">Meta atual: {goals.proteina} g por dia.</p>
      </motion.section>
    </>
  );
}
