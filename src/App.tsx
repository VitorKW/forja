import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useProfile, useStore } from './store';
import Home from './screens/Home';
import WorkoutScreen from './screens/WorkoutScreen';
import Summary from './screens/Summary';

// Telas fora do caminho principal (abrir → treinar) viram arquivos separados: o app
// abre mais rápido e elas são baixadas logo depois, em segundo plano.
const loaders = {
  bosses: () => import('./screens/Bosses'),
  profile: () => import('./screens/Profile'),
  duo: () => import('./screens/Duo'),
  diet: () => import('./screens/Diet'),
  recap: () => import('./screens/Recap'),
  welcome: () => import('./screens/Welcome'),
};
const Bosses = lazy(loaders.bosses);
const Profile = lazy(loaders.profile);
const Duo = lazy(loaders.duo);
const Diet = lazy(loaders.diet);
const Recap = lazy(loaders.recap);
const Welcome = lazy(loaders.welcome);
import { notifyStart } from './push';
import { Icon } from './components/ui';
import { PushStatusReporter } from './components/PushPanel';
import WhatsNew from './components/WhatsNew';

export type Tab = 'forja' | 'dupla' | 'dieta' | 'chefes' | 'perfil';

const TABS: { id: Tab; label: string }[] = [
  { id: 'forja', label: 'Forja' },
  { id: 'dupla', label: 'Dupla' },
  { id: 'dieta', label: 'Dieta' },
  { id: 'chefes', label: 'Chefes' },
  { id: 'perfil', label: 'Perfil' },
];

const spring = { type: 'spring', stiffness: 520, damping: 38 } as const;

function ProfileSwitch() {
  const profiles = useStore((s) => s.profiles);
  const currentId = useStore((s) => s.currentId);
  const switchProfile = useStore((s) => s.switchProfile);
  return (
    <div className="profile-switch" role="tablist" aria-label="Quem está treinando">
      {profiles.map((p) => {
        const on = p.id === currentId;
        return (
          <button key={p.id} role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={() => switchProfile(p.id)}>
            {on && <motion.span layoutId="profile-pill" className="pill" transition={spring} />}
            <span className="avatar" aria-hidden>
              {p.name.trim().charAt(0).toUpperCase() || '?'}
            </span>
            <span className="name">{p.name}</span>
            {p.active && <span className="live-dot" aria-label="treino em andamento" />}
          </button>
        );
      })}
    </div>
  );
}

/** Liga a sincronização quando há um código; o Firebase só é baixado nesse caso. */
function useSync() {
  const real = useStore((s) => s.syncCode);
  const demo = useStore((s) => !!s.demo);
  // No modo demonstração nada vai para a nuvem.
  const code = demo ? null : real;
  const setStatus = useStore((s) => s.setSyncStatus);
  useEffect(() => {
    if (!code) {
      setStatus(null);
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;
    import('./sync')
      .then((m) => {
        if (!cancelled) stop = m.startSync(code, setStatus);
      })
      .catch(() => setStatus({ state: 'error', message: 'Não foi possível carregar a sincronização.' }));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [code, setStatus]);
}

// ?demo=1&tab=dieta abre direto a demonstração numa aba (usado nos prints do README).
const params = new URLSearchParams(location.search);
const urlTab = params.get('tab') as Tab | null;

export default function App() {
  useSync();
  const [tab, setTab] = useState<Tab>(urlTab && TABS.some((t) => t.id === urlTab) ? urlTab : 'forja');
  const { active, id } = useProfile();
  const summaryId = useStore((s) => s.summaryId);
  const startWorkout = useStore((s) => s.startWorkout);
  const recapMonth = useStore((s) => s.recapMonth);
  const onboarded = useStore((s) => s.onboarded);
  const demo = useStore((s) => !!s.demo);
  const exitDemo = useStore((s) => s.exitDemo);
  const openDemo = () => import('./demo').then((m) => useStore.getState().enterDemo(m.demoProfiles()));
  useEffect(() => {
    // Pré-carrega as outras abas quando o celular estiver livre, para trocar sem atraso.
    const t = setTimeout(() => Object.values(loaders).forEach((l) => l().catch(() => {})), 1500);
    return () => clearTimeout(t);
  }, []);

  let content;
  if (!onboarded && !demo) content = <Welcome key="boas-vindas" onDemo={openDemo} />;
  else if (active) content = <WorkoutScreen key="treino" />;
  else if (summaryId) content = <Summary key={`resumo-${summaryId}`} workoutId={summaryId} />;
  else if (recapMonth) content = <Recap month={recapMonth} />;
  else
    content = (
      <div className="app" key="abas">
        {demo && (
          <div className="demo-bar">
            <span>Modo demonstração: nada aqui é salvo.</span>
            <button className="link small" onClick={exitDemo}>
              Sair
            </button>
          </div>
        )}
        <header className="topbar">
          <ProfileSwitch />
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={`${tab}-${id}`}
            className="screen"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Suspense fallback={<p className="muted small" style={{ padding: 16 }}>Carregando…</p>}>
              {tab === 'forja' && <Home onOpenBosses={() => setTab('chefes')} onOpenDuo={() => setTab('dupla')} />}
              {tab === 'dupla' && <Duo />}
              {tab === 'dieta' && <Diet />}
              {tab === 'chefes' && <Bosses />}
              {tab === 'perfil' && <Profile />}
            </Suspense>
          </motion.main>
        </AnimatePresence>
        <div className="dock">
          <nav className="tabbar" aria-label="Seções">
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={() => setTab(t.id)}>
                  {on && <motion.span layoutId="tab-pill" className="pill" transition={spring} />}
                  <Icon name={t.id} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
          <motion.button className="fab" onClick={() => {
              startWorkout();
              notifyStart();
            }} whileTap={{ scale: 0.92 }} aria-label="Começar treino">
            <Icon name="forja" />
            <span className="fab-label">Treinar</span>
          </motion.button>
        </div>
      </div>
    );

  return (
    <MotionConfig reducedMotion="user">
      <PushStatusReporter />
      {onboarded && !demo && !active && params.get('demo') !== '1' && <WhatsNew />}
      <AnimatePresence mode="wait">
        <motion.div
          key={!onboarded && !demo ? 'boas-vindas' : active ? 'treino' : summaryId ? 'resumo' : recapMonth ? 'retro' : 'abas'}
          // Só opacidade: transform aqui quebraria o position: fixed da barra de baixo.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Suspense fallback={null}>{content}</Suspense>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
