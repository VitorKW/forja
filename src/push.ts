/**
 * Notificações pelo servidor grátis no Cloudflare Workers (pasta push/).
 * - Lembrete da noite: o app manda um resumo do dia; o servidor avisa às 20h se faltar algo.
 * - Avisos do par: treino concluído, incentivo, aposta.
 * Tudo depende da sincronização (o código do grupo identifica o casal).
 */
import { useStore } from './store';
import type { Weekly } from '../push/src/reminder';

/** Endereço do worker publicado. Vazio = notificações desligadas no app. */
export const PUSH_URL = 'https://forja-push.vitorwessler.workers.dev';
export const VAPID_PUBLIC = 'BAMOJSIp_M5DsOYZS-ewSD3SD6uLt7wDI9WDsMh5vq2MCkjrchuzZjQUZmRkPr1-7UNVX2sIVpSfqrNbGDcfNX0';

const SLOT_KEY = 'forja-push-slot';
const STATUS_KEY = 'forja-push-status';

export type PushSupport = 'ok' | 'off' | 'ios-install' | 'unsupported';

export function pushSupport(): PushSupport {
  if (!PUSH_URL) return 'off';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return 'ok';
}

/** Perfil (0 ou 1) que recebe as notificações neste celular, ou null. */
export function pushSlot(): 0 | 1 | null {
  try {
    const v = localStorage.getItem(SLOT_KEY);
    return v === '0' ? 0 : v === '1' ? 1 : null;
  } catch {
    return null;
  }
}

async function post(path: string, body: unknown): Promise<Response> {
  const res = await fetch(PUSH_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  });
  if (!res.ok) throw new Error(`push ${res.status}`);
  return res;
}

function b64urlToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export async function enablePush(group: string, slot: 0 | 1): Promise<'ok' | 'denied' | 'error'> {
  try {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(VAPID_PUBLIC) as BufferSource }));
    await post('/subscribe', { group, slot, sub: sub.toJSON() });
    localStorage.setItem(SLOT_KEY, String(slot));
    localStorage.removeItem(STATUS_KEY);
    return 'ok';
  } catch {
    return 'error';
  }
}

export async function disablePush(group: string): Promise<void> {
  const slot = pushSlot();
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub && slot !== null) await post('/unsubscribe', { group, slot, endpoint: sub.endpoint }).catch(() => undefined);
    await sub?.unsubscribe();
  } finally {
    localStorage.removeItem(SLOT_KEY);
    localStorage.removeItem(STATUS_KEY);
  }
}

/** Manda um teste. Devolve quantos chegaram ao serviço de push e, se falhou, o motivo. */
export async function testPush(group: string, slot: 0 | 1): Promise<{ sent: number; subs: number; detail?: string }> {
  try {
    const res = await post('/test', { group, slot });
    const r = (await res.json()) as { sent: number; subs?: number; results?: unknown[]; error?: string };
    return { sent: r.sent, subs: r.subs ?? 0, detail: r.error ?? (r.sent ? undefined : JSON.stringify(r.results ?? [])) };
  } catch (e) {
    return { sent: 0, subs: -1, detail: String(e) };
  }
}

/** Avisa o par (não faz nada sem sincronização). Falhas são ignoradas: é só um aviso. */
export function notifyPartner(meSlot: number, msg: { title: string; body: string; tag?: string }) {
  const { syncCode: group, demo } = useStore.getState();
  if (!PUSH_URL || !group || demo) return;
  post('/notify', { group, slot: meSlot === 0 ? 1 : 0, ...msg }).catch(() => undefined);
}

/** Avisa o par que um treino começou (convite para treinar junto). */
export function notifyStart(session?: string) {
  const s = useStore.getState();
  const i = s.profiles.findIndex((p) => p.id === s.currentId);
  const name = s.profiles[i]?.name ?? '';
  notifyPartner(i, {
    title: `${name} começou a treinar${session ? `: ${session}` : ''}`,
    body: 'Treinando junto (até 2 h de diferença) vale +30 XP e +10 moedas para cada um.',
    tag: 'comecou',
  });
}

export interface DayStatus {
  name: string;
  day: string;
  week: string;
  tz: number;
  trained: boolean;
  habitsLeft: number;
  weekLeft: number;
  weekly?: Weekly;
}

/** Manda o resumo do dia se mudou desde o último envio. */
export async function sendStatus(group: string, slot: 0 | 1, status: DayStatus): Promise<void> {
  const key = JSON.stringify({ group, slot, status });
  try {
    if (localStorage.getItem(STATUS_KEY) === key) return;
  } catch {
    /* segue */
  }
  await post('/status', { group, slot, status });
  try {
    localStorage.setItem(STATUS_KEY, key);
  } catch {
    /* ignora */
  }
}

/** Notificações ligadas neste celular (precisa da sincronização e do aviso ativado no Perfil). */
export function restPushReady(): boolean {
  const { syncCode, demo } = useStore.getState();
  return !!PUSH_URL && !!syncCode && !demo && pushSlot() !== null;
}

/**
 * Fim do descanso com o app no fundo ou a tela bloqueada: o servidor manda a notificação na hora.
 * `at` = horário do fim (ms) para agendar, 0 para cancelar.
 */
export function scheduleRestPush(at: number, body?: string) {
  const slot = pushSlot();
  const group = useStore.getState().syncCode;
  if (!restPushReady() || slot === null || !group) return;
  post('/rest', { group, slot, at, ...(body ? { body } : {}) }).catch(() => undefined);
}
