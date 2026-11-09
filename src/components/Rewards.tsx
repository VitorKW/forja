import { useState } from 'react';
import { fmt } from './ui';
import { REWARD_COST, REWARD_IDEAS, redemptionFeed, rewardCatalog } from '../game/rewards';
import { useStore } from '../store';
import { useGame } from '../useProgress';

/** Prêmios de verdade que o casal combina e paga com as moedas do jogo. */
export default function Rewards() {
  const { profiles, me, coins } = useGame();
  const { addReward, deleteReward, redeemReward } = useStore();
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [adding, setAdding] = useState(false);
  const mine = profiles[me];
  const list = rewardCatalog(...profiles.map((p) => p.rewards));
  const feed = redemptionFeed(profiles).slice(0, 5);
  const myIds = new Set((mine.rewards ?? []).map((r) => r.id));
  const n = Number(cost);
  const valid = name.trim().length >= 2 && n >= REWARD_COST.min && n <= REWARD_COST.max;

  const save = () => {
    if (!valid) return;
    addReward(name, n);
    setName('');
    setCost('');
    setAdding(false);
  };

  return (
    <section className="card">
      <div className="row between baseline">
        <h2>Recompensas do casal</h2>
        <span className="muted small num">🪙 {fmt(coins.balance, 0)}</span>
      </div>
      <p className="muted small">Combinem prêmios de verdade e paguem com as moedas do jogo. Quem resgata paga.</p>

      {list.length === 0 && !adding && (
        <div className="idea-chips">
          {REWARD_IDEAS.map((r) => (
            <button key={r.name} className="idea-chip" onClick={() => addReward(r.name, r.cost)}>
              + {r.name} · {r.cost}
            </button>
          ))}
        </div>
      )}

      <ul className="rewards">
        {list.map((r) => {
          const can = coins.balance >= r.cost;
          return (
            <li key={r.id}>
              <span className="grow">
                <strong>{r.name}</strong>
                {!can && <span className="muted small"> · faltam {fmt(r.cost - coins.balance, 0)}</span>}
              </span>
              <button
                className={can ? 'primary small-btn' : 'ghost small-btn'}
                disabled={!can}
                onClick={() => confirm(`Resgatar "${r.name}" por ${r.cost} moedas?`) && redeemReward(r)}
              >
                🪙 {fmt(r.cost, 0)}
              </button>
              {myIds.has(r.id) && (
                <button className="icon-btn" aria-label={`Apagar ${r.name}`} onClick={() => confirm(`Apagar "${r.name}" da lista?`) && deleteReward(r.id)}>
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="reward-form">
          <input className="search" maxLength={40} placeholder="Ex.: rodízio de pizza" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da recompensa" />
          <input className="search" inputMode="numeric" placeholder="Moedas" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ''))} aria-label="Preço em moedas" />
          <button className="primary" disabled={!valid} onClick={save}>
            Salvar
          </button>
        </div>
      ) : (
        <button className="link small" onClick={() => setAdding(true)}>
          + Nova recompensa
        </button>
      )}

      {feed.length > 0 && (
        <>
          <h3 className="chart-head">Resgatadas</h3>
          <ul className="records">
            {feed.map((r) => (
              <li key={r.id}>
                <span className="grow">
                  {r.by}: <strong>{r.name}</strong>
                </span>
                <span className="muted small">{new Date(r.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
