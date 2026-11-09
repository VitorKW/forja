/**
 * Servidor de notificações do Forja (Cloudflare Workers, plano grátis).
 *
 * Guarda, por grupo e por pessoa, as inscrições de push e um resumo do dia
 * (treinou hoje? quantas missões faltam?). Duas funções:
 *   - /notify: o app de um avisa o outro ("terminou o treino", "propôs uma aposta").
 *   - cron às 20h (Brasília): lembrete para quem ainda tem treino ou missão em aberto;
 *     no domingo, o resumo da semana do casal.
 *
 * O código do grupo funciona como senha, igual na sincronização do Firebase.
 */
import { sendPush, type PushSubscriptionJSON, type Vapid } from './webpush';
import { reminderFor, weeklyFor, type Status, type Weekly } from './reminder';

export interface Env {
  FORJA: KVNamespace;
  VAPID_PUBLIC: string;
  VAPID_PRIVATE_JWK: string;
  VAPID_SUBJECT: string;
  ALLOWED_ORIGINS: string;
}

interface UserRec {
  subs: PushSubscriptionJSON[];
  status?: Status;
}

const GROUP = /^[A-Z0-9-]{12,24}$/;
const keyOf = (group: string, slot: number) => `u:${group}:${slot}`;

function cors(env: Env, req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  const ok = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

const vapidOf = (env: Env): Vapid => ({ privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), publicKey: env.VAPID_PUBLIC, subject: env.VAPID_SUBJECT });

const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Number(v) || 0));
function cleanWeekly(w: Weekly): Weekly {
  return {
    days: num(w.days, 7),
    goal: num(w.goal, 7),
    partner: clip(w.partner, 20),
    partnerDays: num(w.partnerDays, 7),
    partnerGoal: num(w.partnerGoal, 7),
    raidLeft: num(w.raidLeft, 100),
    boss: clip(w.boss, 40),
    challenge: clip(w.challenge, 60),
    unit: clip(w.unit, 12),
    mine: num(w.mine, 100000),
    theirs: num(w.theirs, 100000),
  };
}

async function load(env: Env, key: string): Promise<UserRec> {
  return ((await env.FORJA.get(key, 'json')) as UserRec | null) ?? { subs: [] };
}

/** Manda para todas as inscrições da pessoa e tira as que morreram. */
async function deliver(env: Env, key: string, rec: UserRec, data: unknown): Promise<number> {
  const vapid = vapidOf(env);
  const results = await Promise.all(rec.subs.map((s) => sendPush(s, data, vapid).catch(() => 0)));
  const alive = rec.subs.filter((_, i) => results[i] !== 404 && results[i] !== 410);
  if (alive.length !== rec.subs.length) await env.FORJA.put(key, JSON.stringify({ ...rec, subs: alive }));
  return results.filter((r) => r >= 200 && r < 300).length;
}

const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { headers });
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
    if (req.method !== 'POST') return json({ ok: true, app: 'forja-push' });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return json({ error: 'json' }, 400);
    }
    const group = String(body.group ?? '');
    const slot = Number(body.slot);
    if (!GROUP.test(group) || (slot !== 0 && slot !== 1)) return json({ error: 'grupo' }, 400);
    const key = keyOf(group, slot);
    const path = new URL(req.url).pathname;

    if (path === '/subscribe') {
      const sub = body.sub as PushSubscriptionJSON;
      if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: 'inscrição' }, 400);
      const rec = await load(env, key);
      const subs = [...rec.subs.filter((s) => s.endpoint !== sub.endpoint), { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }].slice(-3);
      await env.FORJA.put(key, JSON.stringify({ ...rec, subs }));
      return json({ ok: true });
    }

    if (path === '/unsubscribe') {
      const rec = await load(env, key);
      const subs = rec.subs.filter((s) => s.endpoint !== body.endpoint);
      if (subs.length !== rec.subs.length) await env.FORJA.put(key, JSON.stringify({ ...rec, subs }));
      return json({ ok: true });
    }

    if (path === '/status') {
      const s = body.status as Status;
      const status: Status = {
        name: clip(s?.name, 20),
        day: clip(s?.day, 10),
        week: clip(s?.week, 10),
        tz: Number(s?.tz) || 0,
        trained: !!s?.trained,
        habitsLeft: Math.max(0, Math.min(9, Number(s?.habitsLeft) || 0)),
        weekLeft: Math.max(0, Math.min(7, Number(s?.weekLeft) || 0)),
        ...(s?.weekly ? { weekly: cleanWeekly(s.weekly) } : {}),
      };
      const rec = await load(env, key);
      // Só grava se mudou (o plano grátis tem 1000 gravações por dia).
      if (!rec.subs.length || JSON.stringify(rec.status) === JSON.stringify(status)) return json({ ok: true, saved: false });
      await env.FORJA.put(key, JSON.stringify({ ...rec, status }));
      return json({ ok: true, saved: true });
    }

    if (path === '/notify') {
      // `slot` é quem recebe.
      const rec = await load(env, key);
      if (!rec.subs.length) return json({ ok: true, sent: 0 });
      const sent = await deliver(env, key, rec, { title: clip(body.title, 80), body: clip(body.body, 200), tag: clip(body.tag, 60) || undefined });
      return json({ ok: true, sent });
    }

    if (path === '/test') {
      const rec = await load(env, key);
      if (!rec.subs.length) return json({ ok: true, sent: 0, subs: 0 });
      // Diagnóstico: devolve a resposta do serviço de push de cada aparelho.
      try {
        const vapid = vapidOf(env);
        const results = await Promise.all(
          rec.subs.map((s) =>
            sendPush(s, { title: 'Forja', body: 'Lembretes ligados! É assim que eles vão aparecer.', tag: 'teste' }, vapid).catch((e) => `erro: ${e}`),
          ),
        );
        return json({ ok: true, subs: rec.subs.length, sent: results.filter((r) => typeof r === 'number' && r >= 200 && r < 300).length, results });
      } catch (e) {
        return json({ ok: false, sent: 0, subs: rec.subs.length, error: String(e) });
      }
    }

    return json({ error: 'rota' }, 404);
  },

  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    let cursor: string | undefined;
    do {
      const page = await env.FORJA.list({ prefix: 'u:', cursor });
      for (const k of page.keys) {
        const rec = await load(env, k.name);
        const weekly = weeklyFor(rec.status);
        const msg = weekly ?? reminderFor(rec.status);
        if (msg && rec.subs.length) await deliver(env, k.name, rec, { ...msg, tag: weekly ? 'semana' : 'lembrete' });
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  },
};
