import { useState } from 'react';
import { motion } from 'motion/react';
import Character from '../components/Character';
import { ATTRIBUTES, type Attribute } from '../game/types';
import { useStore, type Look } from '../store';
import { markSeen } from '../game/changelog';

const START_LEVELS = Object.fromEntries(ATTRIBUTES.map((a) => [a, 1])) as Record<Attribute, number>;

/** Primeira abertura: nome, visual, nome do par e meta. Ou entrar no modo demonstração. */
export default function Welcome({ onDemo }: { onDemo: () => void }) {
  const finishOnboarding = useStore((s) => s.finishOnboarding);
  // Quem acabou de chegar não precisa ver as novidades.
  const finish: typeof finishOnboarding = (a) => {
    markSeen();
    finishOnboarding(a);
  };
  const setSyncCode = useStore((s) => s.setSyncCode);
  const [me, setMe] = useState('');
  const [partner, setPartner] = useState('');
  const [look, setLook] = useState<Look>('a');
  const [goal, setGoal] = useState(3);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  return (
    <div className="app">
      <main className="screen welcome">
        <motion.div className="welcome-hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span className="eyebrow">Forja</span>
          <h1>
            Treino que vira <span className="grad-text">jogo</span>.
          </h1>
          <p className="muted lead">Cada série dá XP, sobe atributos e equipa seu personagem. Em dupla, vocês enfrentam chefes juntos.</p>
          <div className="welcome-char">
            <Character levels={START_LEVELS} playerLevel={1} look={look} scale={5} />
          </div>
        </motion.div>

        <section className="panel">
          <label className="setting">
            Seu nome
            <input className="name-input" maxLength={20} value={me} placeholder="Como te chamam" onChange={(e) => setMe(e.target.value)} />
          </label>
          <div className="setting">
            Visual
            <div className="seg">
              {(['a', 'b'] as Look[]).map((l) => (
                <button key={l} className={look === l ? 'on' : ''} aria-pressed={look === l} onClick={() => setLook(l)}>
                  {l === 'a' ? 'Cabelo curto' : 'Cabelo longo'}
                </button>
              ))}
            </div>
          </div>
          <label className="setting">
            Nome do seu par
            <input className="name-input" maxLength={20} value={partner} placeholder="Quem treina com você" onChange={(e) => setPartner(e.target.value)} />
          </label>
          <label className="setting">
            Meta semanal
            <select value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} dias
                </option>
              ))}
            </select>
          </label>
          <button className="primary big" disabled={!me.trim()} onClick={() => finish({ me, look, partner: partner || 'Par', weeklyGoal: goal })}>
            Começar
          </button>
        </section>

        {joining ? (
          <section className="panel">
            <p className="muted small">Seu par já usa o Forja? Digite o código que aparece no Perfil dele, em Sincronizar celulares.</p>
            <div className="sync-join">
              <input className="search" placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Código de sincronização" />
              <button
                className="ghost"
                disabled={code.trim().length < 12}
                onClick={() => {
                  setSyncCode(code.trim().toUpperCase().replace(/\s+/g, ''));
                  finish({ me: '', look, partner: '', weeklyGoal: goal });
                }}
              >
                Entrar
              </button>
            </div>
          </section>
        ) : (
          <button className="link center" onClick={() => setJoining(true)}>
            Já tenho um código do meu par
          </button>
        )}

        <button className="ghost" onClick={onDemo}>
          Só quero ver como é (dados de exemplo)
        </button>
      </main>
    </div>
  );
}
