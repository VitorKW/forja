/**
 * Sincronização entre celulares pelo Firebase (Firestore + login anônimo).
 *
 * Os dois celulares usam o mesmo código de grupo. Na nuvem:
 *   grupos/{código}/perfis/{p1|p2}               nome, visual, configurações
 *   grupos/{código}/perfis/{p1|p2}/treinos/{id}  um treino concluído (ou {deleted:true})
 *
 * A regra é somar: treino que existe em qualquer lado aparece nos dois; treino apagado vira
 * "lápide" para não voltar. Nome e visual: vence a mudança mais recente.
 * Este arquivo só é carregado quando a sincronização está ligada.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { Workout } from './game/types';
import { useStore, type RemoteMeta, type SyncStatus } from './store';

const firebaseConfig = {
  apiKey: 'AIzaSyBqcS0gMVEv3PTcUiN3JuvIML1swRJ8fiE',
  authDomain: 'forja-eb489.firebaseapp.com',
  projectId: 'forja-eb489',
  storageBucket: 'forja-eb489.firebasestorage.app',
  messagingSenderId: '632215097801',
  appId: '1:632215097801:web:4bbceefed7b47b300b9818',
};

const SLOTS = ['p1', 'p2'];

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
function firebase() {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  if (!db) db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  return { app, db };
}

function explain(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) return 'A nuvem recusou o acesso. Confira as regras do Firestore.';
  if (code.includes('admin-restricted') || code.includes('operation-not-allowed')) return 'Ative o login Anônimo no Firebase (Authentication).';
  if (code.includes('network')) return 'Sem internet. Os treinos sobem quando a conexão voltar.';
  return 'Não foi possível sincronizar agora.';
}

/** Liga a sincronização com o código dado. Devolve uma função que desliga. */
export function startSync(code: string, onStatus: (s: SyncStatus) => void): () => void {
  let stopped = false;
  const unsubs: (() => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  // O que a nuvem já tem, para enviar só o que falta.
  const remoteLive = SLOTS.map(() => new Set<string>());
  const remoteDead = SLOTS.map(() => new Set<string>());
  const remoteMetaAt = SLOTS.map(() => -1);
  const pushedMeta = SLOTS.map(() => '');
  // Só envia um perfil depois de ouvir a nuvem de verdade (não só o cache), para não sobrescrever nada.
  const metaReady = SLOTS.map(() => false);
  const workoutsReady = SLOTS.map(() => false);

  onStatus({ state: 'connecting' });

  const push = async () => {
    if (stopped) return;
    const { db } = firebase();
    const state = useStore.getState();
    let batch = writeBatch(db);
    let n = 0;
    const flush = async () => {
      if (n > 0) await batch.commit();
      batch = writeBatch(db);
      n = 0;
    };
    for (let i = 0; i < SLOTS.length; i++) {
      const p = state.profiles[i];
      if (!p) continue;
      const ref = doc(db, 'grupos', code, 'perfis', SLOTS[i]);
      if (metaReady[i]) {
        const meta: RemoteMeta = { name: p.name, look: p.look, settings: p.settings, metaAt: p.metaAt ?? 0 };
        const key = JSON.stringify(meta);
        if (key !== pushedMeta[i] && meta.metaAt > remoteMetaAt[i]) {
          batch.set(ref, meta);
          pushedMeta[i] = key;
          remoteMetaAt[i] = meta.metaAt;
          n++;
        }
      }
      if (!workoutsReady[i]) continue;
      for (const w of p.workouts) {
        if (!w.finishedAt || remoteLive[i].has(w.id) || remoteDead[i].has(w.id)) continue;
        batch.set(doc(ref, 'treinos', w.id), { json: JSON.stringify(w) });
        remoteLive[i].add(w.id);
        if (++n >= 400) await flush();
      }
      for (const id of p.deleted ?? []) {
        if (remoteDead[i].has(id)) continue;
        batch.set(doc(ref, 'treinos', id), { deleted: true });
        remoteDead[i].add(id);
        remoteLive[i].delete(id);
        if (++n >= 400) await flush();
      }
    }
    await flush();
  };

  const schedulePush = () => {
    clearTimeout(timer);
    timer = setTimeout(() => push().catch((e) => onStatus({ state: 'error', message: explain(e) })), 1200);
  };

  (async () => {
    try {
      const { app, db } = firebase();
      await signInAnonymously(getAuth(app));
      if (stopped) return;
      const fail = (e: unknown) => onStatus({ state: 'error', message: explain(e) });

      SLOTS.forEach((slot, i) => {
        const ref = doc(db, 'grupos', code, 'perfis', slot);
        unsubs.push(
          onSnapshot(
            ref,
            { includeMetadataChanges: true },
            (snap) => {
              if (snap.exists()) {
                const meta = snap.data() as RemoteMeta;
                remoteMetaAt[i] = Math.max(remoteMetaAt[i], meta.metaAt ?? 0);
                pushedMeta[i] = JSON.stringify({ name: meta.name, look: meta.look, settings: meta.settings, metaAt: meta.metaAt });
                useStore.getState().mergeRemoteMeta(i, meta);
              }
              if (!snap.metadata.fromCache) {
                metaReady[i] = true;
                schedulePush();
              }
            },
            fail,
          ),
        );
        unsubs.push(
          onSnapshot(
            collection(ref, 'treinos'),
            // Inclui mudanças só de metadados: é assim que se sabe que o servidor respondeu
            // quando o cache já tinha os mesmos dados (caso comum ao reabrir o app).
            { includeMetadataChanges: true },
            (snap) => {
              const live: Workout[] = [];
              const dead: string[] = [];
              snap.forEach((d) => {
                const v = d.data() as { json?: string; deleted?: boolean };
                if (v.deleted) {
                  dead.push(d.id);
                  remoteDead[i].add(d.id);
                  remoteLive[i].delete(d.id);
                } else if (v.json) {
                  try {
                    live.push(JSON.parse(v.json) as Workout);
                    remoteLive[i].add(d.id);
                  } catch {
                    /* treino corrompido: ignora */
                  }
                }
              });
              useStore.getState().mergeRemoteWorkouts(i, live, dead);
              if (!snap.metadata.fromCache) {
                workoutsReady[i] = true;
                if (workoutsReady.every(Boolean)) onStatus({ state: 'ok' });
                schedulePush();
              }
            },
            fail,
          ),
        );
      });

      unsubs.push(useStore.subscribe(schedulePush));
    } catch (e) {
      onStatus({ state: 'error', message: explain(e) });
    }
  })();

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubs.forEach((u) => u());
  };
}

/** Código novo para o grupo: difícil de adivinhar, fácil de ditar. */
export function newCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
