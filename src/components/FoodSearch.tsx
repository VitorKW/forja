import { useEffect, useMemo, useState } from 'react';
import { fmt } from './ui';
import { loadFoods, nutrientsFor, portionOf, searchFoods, type Food } from '../game/foods';
import type { DietEntry, DietLog } from '../game/diet';

type NewEntry = Omit<DietEntry, 'id' | 'at'>;

/** Últimas refeições diferentes, para repetir com um toque. */
export function recentFoods(log: DietLog = {}, limit = 6): NewEntry[] {
  const all = Object.keys(log)
    .sort()
    .flatMap((d) => log[d]);
  const seen = new Set<string>();
  const out: NewEntry[] = [];
  for (let i = all.length - 1; i >= 0 && out.length < limit; i--) {
    const e = all[i];
    if (e.agua > 0 || e.label === 'Total do dia' || seen.has(e.label)) continue;
    seen.add(e.label);
    out.push({ label: e.label, proteina: e.proteina, kcal: e.kcal, agua: 0 });
  }
  return out;
}

const GRAMS = [50, 100, 150, 200];

/** Busca na tabela TACO com a quantidade em gramas. */
export default function FoodSearch({ onAdd, log }: { onAdd: (e: NewEntry, key: string) => void; log?: DietLog }) {
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const recents = useMemo(() => recentFoods(log), [log]);

  useEffect(() => {
    if (q && !foods) loadFoods().then(setFoods);
  }, [q, foods]);

  const results = useMemo(() => (foods && q.trim().length >= 2 ? searchFoods(foods, q) : []), [foods, q]);
  const g = Number(grams.replace(',', '.')) || 0;
  const portion = pick ? portionOf(pick) : null;
  const n = pick ? nutrientsFor(pick, g) : null;

  const choose = (f: Food) => {
    setPick(f);
    const p = portionOf(f);
    setGrams(String(p?.g ?? 100));
  };
  const add = () => {
    if (!pick || !n || g <= 0) return;
    onAdd({ label: `${pick.name} (${fmt(g, 0)} g)`, proteina: n.proteina, kcal: n.kcal, agua: 0 }, 'busca');
    setPick(null);
    setQ('');
  };

  if (pick && n) {
    return (
      <div className="food-pick">
        <div className="row between baseline">
          <strong>{pick.name}</strong>
          <button className="link small" onClick={() => setPick(null)}>
            Trocar
          </button>
        </div>
        <p className="muted small">
          Por 100 g: {pick.kcal} kcal · {fmt(pick.protein)} g de proteína · {fmt(pick.carbs)} g de carboidrato · {fmt(pick.fat)} g de gordura
          {pick.source === 'rótulo' ? ' (média de rótulos, varia por marca)' : ''}
        </p>
        <div className="chips grams">
          {portion && (
            <button className={`chip${g === portion.g ? ' on' : ''}`} onClick={() => setGrams(String(portion.g))}>
              {portion.label} <span className="muted small">({portion.g} g)</span>
            </button>
          )}
          {GRAMS.map((x) => (
            <button key={x} className={`chip${g === x ? ' on' : ''}`} onClick={() => setGrams(String(x))}>
              {x} g
            </button>
          ))}
        </div>
        <label className="setting">
          Quantidade (g)
          <input className="name-input" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} aria-label="Quantidade em gramas" />
        </label>
        <button className="primary" disabled={g <= 0} onClick={add}>
          Adicionar · {fmt(n.proteina)} g de proteína · {n.kcal} kcal
        </button>
      </div>
    );
  }

  return (
    <div className="food-search">
      <input
        className="search"
        type="search"
        placeholder="Buscar alimento (ex.: frango grelhado, arroz)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Buscar alimento na tabela TACO"
      />
      {q.trim().length >= 2 &&
        (!foods ? (
          <p className="muted small">Carregando a tabela…</p>
        ) : results.length ? (
          <ul className="food-results">
            {results.map((f) => (
              <li key={f.name}>
                <button onClick={() => choose(f)}>
                  <span className="grow">{f.name}</span>
                  <span className="muted small num">
                    {f.kcal} kcal · {fmt(f.protein)} g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Nada encontrado. Tente outra palavra ou use "Outro alimento".</p>
        ))}
      {!q && recents.length > 0 && (
        <div className="recent-foods">
          <span className="field-label">Repetir</span>
          <div className="recent-list">
            {recents.map((r) => (
              <button key={r.label} className="qchip" onClick={() => onAdd(r, 'recente')}>
                {r.label} <span className="muted small">· {fmt(r.proteina)} g</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="muted small">Valores por 100 g da Tabela Brasileira de Composição de Alimentos (TACO/UNICAMP).</p>
    </div>
  );
}
