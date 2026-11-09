import { useState } from 'react';
import { useProfile, useStore } from './store';
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

function ProfileTabs() {
  const profiles = useStore((s) => s.profiles);
  const currentId = useStore((s) => s.currentId);
  const switchProfile = useStore((s) => s.switchProfile);
  return (
    <div className="profile-tabs" role="tablist" aria-label="Quem está treinando">
      {profiles.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={p.id === currentId}
          className={p.id === currentId ? 'on' : ''}
          onClick={() => switchProfile(p.id)}
        >
          {p.name}
          {p.active && <span className="live-dot" aria-label="treino em andamento" />}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('forja');
  const { active } = useProfile();
  const summaryId = useStore((s) => s.summaryId);

  if (active) return <WorkoutScreen />;
  if (summaryId) return <Summary workoutId={summaryId} />;

  return (
    <div className="app">
      <ProfileTabs />
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
