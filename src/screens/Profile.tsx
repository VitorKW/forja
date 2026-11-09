import { useState } from 'react';
import Seal from '../components/Seal';
import { XpBar } from '../components/ui';
import { ACHIEVEMENTS } from '../game/achievements';
import { ATTRIBUTES, ATTRIBUTE_LABEL } from '../game/types';
import { heatColor } from '../heat';
import { useProfile, useStore, type Look } from '../store';
import { useProgress } from '../useProgress';
import { TIER_NAME } from '../components/Character';
import { fmt } from '../components/ui';
import { EXERCISE_BY_ID } from '../game/exercises';
import type { Attribute } from '../game/types';

const GEAR: Record<Attribute, string> = {
  empurrar: 'Ombreiras',
  puxar: 'Manoplas',
  core: 'Peitoral',
  pernas: 'Grevas',
  folego: 'Capa',
};

/** Liga os dois celulares pelo mesmo código. */
function SyncPanel() {
  const code = useStore((s) => s.syncCode);
  const status = useStore((s) => s.syncStatus);
  const setSyncCode = useStore((s) => s.setSyncCode);
  const [typed, setTyped] = useState('');
  const [copied, setCopied] = useState(false);

  const create = async () => {
    const { newCode } = await import('../sync');
    setSyncCode(newCode());
  };
  const join = () => {
    const c = typed.trim().toUpperCase().replace(/\s+/g, '');
    if (c.length >= 12) setSyncCode(c);
  };
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sem permissão de copiar: o código continua visível */
    }
  };

  return (
    <section className="panel">
      <h2>Sincronizar celulares</h2>
      {code ? (
        <>
          <p className="muted small">Os dois perfis aparecem atualizados nos celulares que usam este código.</p>
          <div className="sync-code">
            <span className="num">{code}</span>
            <button className="link" onClick={copy}>
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className={`sync-status ${status?.state ?? 'connecting'}`}>
            <span className="sync-dot" />
            {status?.state === 'ok' ? 'Sincronizado' : status?.state === 'error' ? status.message : 'Conectando...'}
          </p>
          <button className="ghost" onClick={() => confirm('Parar de sincronizar neste celular? Os dados daqui continuam salvos.') && setSyncCode(null)}>
            Parar de sincronizar
          </button>
        </>
      ) : (
        <>
          <p className="muted small">Cada um usa o próprio celular e vê o progresso do outro. Crie um código num celular e digite o mesmo no outro.</p>
          <button className="primary big" onClick={create}>
            Criar código
          </button>
          <div className="sync-join">
            <input className="search" placeholder="Já tenho um código" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" aria-label="Código de sincronização" />
            <button className="ghost" onClick={join} disabled={typed.trim().length < 12}>
              Entrar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default function Profile() {
  const p = useProgress();
  const { id, name, look, workouts, settings } = useProfile();
  const { updateSettings, openSummary, deleteWorkout, resetCurrent, renameProfile, setLook } = useStore();
  const history = [...workouts].filter((w) => w.finishedAt).reverse();
  const unlocked = Object.keys(p.achievements).length;
  const records = Object.entries(p.records)
    .filter(([exId]) => EXERCISE_BY_ID[exId])
    .sort((a, b) => b[1].best - a[1].best)
    .slice(0, 8);

  return (
    <>
      <h1>{name}</h1>

      <section className="panel">
        <label className="setting">
          Nome
          <input className="name-input" value={name} maxLength={20} onChange={(e) => renameProfile(id, e.target.value)} aria-label="Nome do perfil" />
        </label>
        <div className="setting">
          Visual
          <div className="seg">
            {(['a', 'b'] as Look[]).map((l) => (
              <button key={l} className={look === l ? 'on' : ''} aria-pressed={look === l} onClick={() => setLook(id, l)}>
                {l === 'a' ? 'Cabelo curto' : 'Cabelo longo'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Atributos e equipamento</h2>
        {ATTRIBUTES.map((a) => {
          const lvl = p.attrLevels[a].level;
          const tierName = TIER_NAME(lvl);
          return (
            <div key={a} className="attr-block">
              <div className="attr-row">
                <span>{ATTRIBUTE_LABEL[a]}</span>
                <XpBar info={p.attrLevels[a]} small label={`Progresso de ${ATTRIBUTE_LABEL[a]}`} />
                <span className="attr-level" style={{ color: lvl > 1 ? heatColor(lvl + 2) : undefined }}>
                  {lvl}
                </span>
              </div>
              <div className="muted small gear">{tierName ? `${GEAR[a]} ${tierName}` : `${GEAR[a]}: libera no nível 2`}</div>
            </div>
          );
        })}
        <p className="muted small">Materiais: couro no nível 2, aço no 4, brasa no 6 e ouro no 8. Elmo no nível 5 do personagem, coroa no 10.</p>
      </section>

      <section className="panel">
        <h2>Marcas</h2>
        <div className="stats">
          <div>
            <strong>{p.workoutsDone}</strong>
            <span className="muted small">treinos</span>
          </div>
          <div>
            <strong>{fmt(p.distanceTotal)}</strong>
            <span className="muted small">km andados</span>
          </div>
          <div>
            <strong>{p.campaign.defeated}</strong>
            <span className="muted small">chefes</span>
          </div>
        </div>
        {records.length > 0 && (
          <>
            <h3>Recordes de força (1RM estimado)</h3>
            <ul className="records">
              {records.map(([exId, r]) => (
                <li key={exId}>
                  <span>{EXERCISE_BY_ID[exId].name}</span>
                  <span className="xp-num">
                    {fmt(r.best)} {settings.unit}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <div className="row between baseline">
          <h2>Conquistas</h2>
          <span className="muted small">
            {unlocked} de {ACHIEVEMENTS.length}
          </span>
        </div>
        <ul className="ach-list">
          {ACHIEVEMENTS.map((a) => {
            const got = !!p.achievements[a.id];
            return (
              <li key={a.id} className={got ? 'got' : ''}>
                <Seal name={a.name} unlocked={got} />
                <div>
                  <strong>{a.name}</strong>
                  <div className="muted small">{a.description}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Histórico</h2>
        {history.length === 0 && <p className="muted small">Seus treinos concluídos aparecem aqui.</p>}
        <ul className="history">
          {history.slice(0, 30).map((w) => (
            <li key={w.id}>
              <button className="history-item" onClick={() => openSummary(w.id)}>
                <span>{new Date(w.finishedAt!).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                <span className="muted small">
                  {w.sets.length} séries{w.deload ? ', deload' : ''}
                </span>
              </button>
              <span className="xp-num">+{p.results[w.id]?.xpTotal ?? 0}</span>
              <button
                className="icon-btn"
                aria-label="Apagar treino"
                onClick={() => confirm('Apagar este treino? O XP será recalculado.') && deleteWorkout(w.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <SyncPanel />

      <section className="panel">
        <h2>Configurações</h2>
        <label className="setting">
          Meta semanal
          <select value={settings.weeklyGoal} onChange={(e) => updateSettings({ weeklyGoal: Number(e.target.value) })}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} dias
              </option>
            ))}
          </select>
        </label>
        <label className="setting">
          Unidade de carga
          <select value={settings.unit} onChange={(e) => updateSettings({ unit: e.target.value as 'kg' | 'lb' })}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <button
          className="ghost danger"
          onClick={() => confirm(`Apagar todos os treinos e o progresso de ${name}? Isso não pode ser desfeito.`) && resetCurrent()}
        >
          Apagar os dados de {name}
        </button>
      </section>
    </>
  );
}
