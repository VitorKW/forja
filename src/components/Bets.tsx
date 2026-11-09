import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { fmt } from './ui';
import { BET_DAYS, BET_METRIC, BET_METRICS, BET_STAKES, type BetMetric, type BetView } from '../game/bets';
import { notifyPartner } from '../push';
import { useStore } from '../store';
import { useGame } from '../useProgress';

function daysLeft(end: number, now = Date.now()) {
  const d = Math.ceil((end - now) / 86400000);
  return d <= 1 ? 'acaba hoje' : `faltam ${d} dias`;
}

function Terms({ v }: { v: BetView }) {
  const m = BET_METRIC[v.bet.metric];
  return (
    <div className="muted small">
      {v.bet.days} dias{v.bet.stake > 0 ? ` · ${v.bet.stake} moedas` : ''}
      {v.bet.prize ? ` · ${v.bet.prize}` : ''}
      {!v.bet.stake && !v.bet.prize ? ' · só pela honra' : ''}
      <span className="sr-only"> ({m.label})</span>
    </div>
  );
}

function NewBet({ balance, onDone }: { balance: number; onDone: () => void }) {
  const { proposeBet } = useStore();
  const { profiles, me, partner } = useGame();
  const [metric, setMetric] = useState<BetMetric>('treinos');
  const [days, setDays] = useState<number>(7);
  const [stake, setStake] = useState<number>(BET_STAKES.find((s) => s > 0 && s <= balance) ?? 0);
  const [prize, setPrize] = useState('');

  const send = () => {
    const bet = proposeBet({ metric, days, stake, ...(prize.trim() ? { prize: prize.trim().slice(0, 60) } : {}) });
    notifyPartner(me, {
      title: `${profiles[me].name} propôs uma aposta`,
      body: `${BET_METRIC[bet.metric].label} em ${days} dias${stake ? `, valendo ${stake} moedas` : ''}. Aceita?`,
      tag: `aposta-${bet.id}`,
    });
    onDone();
  };

  return (
    <div className="bet-form">
      <div className="field">
        <span className="field-label">Desafio</span>
        <div className="chips wrap">
          {BET_METRICS.map((m) => (
            <button key={m.id} className={`chip${metric === m.id ? ' on' : ''}`} onClick={() => setMetric(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Duração</span>
        <div className="chips">
          {BET_DAYS.map((d) => (
            <button key={d} className={`chip${days === d ? ' on' : ''}`} onClick={() => setDays(d)}>
              {d} dias
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Moedas (você tem {fmt(balance, 0)})</span>
        <div className="chips">
          {BET_STAKES.map((s) => (
            <button key={s} className={`chip${stake === s ? ' on' : ''}`} disabled={s > balance} onClick={() => setStake(s)}>
              {s || 'Nenhuma'}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span className="field-label">Prêmio de verdade (opcional)</span>
        <input className="search" maxLength={60} placeholder="Ex.: quem perder paga o açaí" value={prize} onChange={(e) => setPrize(e.target.value)} />
      </label>
      <button className="primary big" onClick={send}>
        Propor para {profiles[partner].name}
      </button>
    </div>
  );
}

export default function Bets() {
  const { profiles, me, partner, bets, coins } = useGame();
  const { cancelBet, answerBet } = useStore();
  const [creating, setCreating] = useState(false);
  const names = [profiles[0].name, profiles[1].name];
  const open = bets.list.filter((v) => v.status === 'proposta' || v.status === 'valendo');
  const done = bets.list.filter((v) => v.status === 'encerrada').slice(0, 3);
  const record = bets.list.reduce<[number, number]>((r, v) => (v.status === 'encerrada' && v.winner !== null ? ((r[v.winner]++, r)) : r), [0, 0]);

  const answer = (v: BetView, accepted: boolean) => {
    answerBet(v.bet.id, accepted);
    notifyPartner(me, {
      title: accepted ? `${names[me]} aceitou a aposta!` : `${names[me]} recusou a aposta`,
      body: accepted ? `${BET_METRIC[v.bet.metric].label}: valendo a partir de hoje, por ${v.bet.days} dias.` : BET_METRIC[v.bet.metric].label,
      tag: `aposta-${v.bet.id}`,
    });
  };

  return (
    <section className="card bets">
      <div className="row between baseline">
        <h2>Apostas</h2>
        {(record[0] > 0 || record[1] > 0) && (
          <span className="muted small">
            {names[0]} {record[0]} × {record[1]} {names[1]}
          </span>
        )}
      </div>

      {open.length === 0 && !creating && <p className="muted small">Desafiem um ao outro: quem perder passa as moedas (ou paga o prêmio combinado).</p>}

      <ul className="bet-list">
        <AnimatePresence initial={false}>
          {open.map((v) => {
            const m = BET_METRIC[v.bet.metric];
            const mine = v.by === me;
            const max = Math.max(1, ...v.values);
            return (
              <motion.li key={v.bet.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`bet ${v.status}`}>
                {v.status === 'proposta' && !mine && <span className="eyebrow">{names[v.by]} desafiou você</span>}
                <div className="row between baseline">
                  <strong>{m.label}</strong>
                  {v.status === 'valendo' && v.end && <span className="bet-tag">{daysLeft(v.end)}</span>}
                </div>
                <Terms v={v} />
                {v.status === 'proposta' &&
                  (mine ? (
                    <div className="row between bet-actions">
                      <span className="muted small">Esperando {names[partner]} responder.</span>
                      <button className="link small" onClick={() => cancelBet(v.bet.id)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="row gap bet-actions">
                      <button className="ghost" onClick={() => answer(v, false)}>
                        Recusar
                      </button>
                      <button className="primary grow" disabled={v.bet.stake > coins.balance} onClick={() => answer(v, true)}>
                        {v.bet.stake > coins.balance ? 'Moedas insuficientes' : 'Aceitar'}
                      </button>
                    </div>
                  ))}
                {v.status === 'valendo' &&
                  [0, 1].map((i) => (
                    <div key={i} className="duel-row">
                      <span className="duel-name">{names[i]}</span>
                      <div className="duel-track">
                        <div className={`duel-fill p${i}`} style={{ width: `${(v.values[i] / max) * 100}%` }} />
                      </div>
                      <span className="num duel-val">
                        {fmt(v.values[i], 0)} <span className="muted small">{m.unit}</span>
                      </span>
                    </div>
                  ))}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <AnimatePresence initial={false}>
        {creating && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <NewBet balance={Math.max(0, coins.balance)} onDone={() => setCreating(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <button className={creating ? 'link center' : 'ghost'} onClick={() => setCreating((c) => !c)}>
        {creating ? 'Fechar' : 'Propor aposta'}
      </button>

      {done.length > 0 && (
        <ul className="trophies">
          {done.map((v) => (
            <li key={v.bet.id}>
              <span aria-hidden>{v.winner === null ? '🤝' : '🎲'}</span>
              <span className="grow">
                {BET_METRIC[v.bet.metric].label}{' '}
                <span className="muted small">
                  {fmt(v.values[0], 0)} × {fmt(v.values[1], 0)}
                </span>
              </span>
              <strong>{v.winner === null ? 'Empate' : `${names[v.winner]}${v.bet.stake ? ` +${v.bet.stake}` : ''}`}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
