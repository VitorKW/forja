import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useProfile, useStore } from './store';
import Home from './screens/Home';
import WorkoutScreen from './screens/WorkoutScreen';
import Summary from './screens/Summary';
import Bosses from './screens/Bosses';
import Profile from './screens/Profile';
import Duo from './screens/Duo';
import { Icon } from './components/ui';

export type Tab = 'forja' | 'dupla' | 'chefes' | 'perfil';

const TABS: { id: Tab; label: string }[] = [
  { id: 'forja', label: 'Forja' },
  { id: 'dupla', label: 'Dupla' },
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
  const code = useStore((s) => s.syncCode);
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

export default function App() {
  useSync();
  const [tab, setTab] = useState<Tab>('forja');
  const { active, id } = useProfile();
  const summaryId = useStore((s) => s.summaryId);
  const startWorkout = useStore((s) => s.startWorkout);

  let content;
  if (active) content = <WorkoutScreen key="treino" />;
  else if (summaryId) content = <Summary key={`resumo-${summaryId}`} workoutId={summaryId} />;
  else
    content = (
      <div className="app" key="abas">
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
            {tab === 'forja' && <Home onOpenBosses={() => setTab('chefes')} onOpenDuo={() => setTab('dupla')} />}
            {tab === 'dupla' && <Duo />}
            {tab === 'chefes' && <Bosses />}
            {tab === 'perfil' && <Profile />}
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
          <motion.button className="fab" onClick={startWorkout} whileTap={{ scale: 0.92 }} aria-label="Começar treino">
            <Icon name="forja" />
            <span>Treinar</span>
          </motion.button>
        </div>
      </div>
    );

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          key={active ? 'treino' : summaryId ? 'resumo' : 'abas'}
          // Só opacidade: transform aqui quebraria o position: fixed da barra de baixo.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
