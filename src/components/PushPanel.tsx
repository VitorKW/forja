import { useEffect, useState } from 'react';
import { HABIT_IDS } from '../game/extras';
import { dayKey, weekKey } from '../game/rules';
import { disablePush, enablePush, pushSlot, pushSupport, sendStatus, testPush } from '../push';
import { useStore } from '../store';
import { useGame } from '../useProgress';

/** Liga e desliga os lembretes neste celular. */
export function PushPanel() {
  const code = useStore((s) => s.syncCode);
  const { profiles, me } = useGame();
  const [slot, setSlot] = useState(pushSlot());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const support = pushSupport();
  if (support === 'off') return null;

  const on = async () => {
    if (!code) return;
    setBusy(true);
    setNote(null);
    const r = await enablePush(code, me);
    setBusy(false);
    if (r === 'ok') {
      setSlot(me);
      setNote('Pronto! Mandei uma notificação de teste.');
      testPush(code, me).catch(() => undefined);
    } else if (r === 'denied') setNote('As notificações estão bloqueadas. Libere nos Ajustes do celular (Notificações → Forja) e tente de novo.');
    else setNote('Não consegui ligar agora. Confira a internet e tente de novo.');
  };
  const off = async () => {
    if (!code) return;
    setBusy(true);
    await disablePush(code).catch(() => undefined);
    setBusy(false);
    setSlot(null);
    setNote(null);
  };
  const test = async () => {
    if (!code || slot === null) return;
    setBusy(true);
    const sent = await testPush(code, slot).catch(() => -1);
    setBusy(false);
    setNote(sent > 0 ? 'Teste enviado. Deve chegar em alguns segundos.' : 'Não encontrei este celular no servidor. Desligue e ligue de novo.');
  };

  return (
    <section className="panel">
      <h2>Lembretes</h2>
      <p className="muted small">
        Às 20h, se ainda faltar treino para a meta da semana ou missão do dia, chega um aviso. E você fica sabendo quando {profiles[me === 0 ? 1 : 0].name} terminar um treino, mandar incentivo ou propor uma aposta.
      </p>
      {!code ? (
        <p className="muted small">Ligue a sincronização primeiro (abaixo): os lembretes usam o mesmo código.</p>
      ) : support === 'ios-install' ? (
        <p className="small">No iPhone, os lembretes só funcionam com o app instalado: no Safari, toque em Compartilhar → Adicionar à Tela de Início, e abra o Forja por lá.</p>
      ) : support === 'unsupported' ? (
        <p className="muted small">Este navegador não aceita notificações.</p>
      ) : slot !== null ? (
        <>
          <p className="push-state small">
            <span className="sync-dot" style={{ background: 'var(--rest)' }} />
            Ligados neste celular para {profiles[slot].name}.
          </p>
          <div className="backup-row">
            <button className="ghost" disabled={busy} onClick={test}>
              Enviar teste
            </button>
            <button className="ghost" disabled={busy} onClick={off}>
              Desligar
            </button>
          </div>
          {slot !== me && (
            <button className="link small" disabled={busy} onClick={on}>
              Trocar para {profiles[me].name}
            </button>
          )}
        </>
      ) : (
        <button className="primary big" disabled={busy} onClick={on}>
          Ligar lembretes para {profiles[me].name}
        </button>
      )}
      {note && <p className="muted small">{note}</p>}
    </section>
  );
}

/** Manda ao servidor o resumo do dia de quem recebe os lembretes neste celular. */
export function PushStatusReporter() {
  const code = useStore((s) => s.syncCode);
  const slot = pushSlot();
  if (!code || slot === null || pushSupport() !== 'ok') return null;
  return <Reporter code={code} slot={slot} />;
}

function Reporter({ code, slot }: { code: string; slot: 0 | 1 }) {
  const { profiles, all, habits } = useGame();
  const p = profiles[slot];
  const prog = all[slot];
  const now = new Date();
  const today = dayKey(now);
  const status = {
    name: p.name,
    day: today,
    week: weekKey(now),
    tz: now.getTimezoneOffset(),
    trained: p.workouts.some((w) => w.finishedAt && dayKey(new Date(w.finishedAt)) === today),
    habitsLeft: HABIT_IDS.filter((h) => !habits[slot][today]?.includes(h)).length,
    weekLeft: Math.max(0, prog.week.goal - prog.week.days),
  };
  const key = JSON.stringify(status);
  useEffect(() => {
    const t = setTimeout(() => sendStatus(code, slot, JSON.parse(key)).catch(() => undefined), 4000);
    return () => clearTimeout(t);
  }, [code, slot, key]);
  return null;
}
