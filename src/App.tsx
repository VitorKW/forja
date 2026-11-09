import { useState } from 'react';
import { useStore } from './store';
import Home from './screens/Home';
import WorkoutScreen from './screens/WorkoutScreen';
import Summary from './screens/Summary';
import Bosses from './screens/Bosses';
import Profile from './screens/Profile';
import { Icon } from './components/ui';

type Tab = 'forja' | 'chefes' | 'perfil';

const TABS: { id: Tab; label: string }[] = [
  { id: 'forja', label: 'Forja' },
  { id: 'chefes', label: 'Chefes' },
  { id: 'perfil', label: 'Perfil' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('forja');
  const active = useStore((s) => s.active);
  const summaryId = useStore((s) => s.summaryId);

  if (active) return <WorkoutScreen />;
  if (summaryId) return <Summary workoutId={summaryId} />;

  return (
    <div className="app">
      <main className="screen">
        {tab === 'forja' && <Home />}
        {tab === 'chefes' && <Bosses />}
        {tab === 'perfil' && <Profile />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <Icon name={t.id} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
