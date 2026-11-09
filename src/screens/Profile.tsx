import { XpBar } from '../components/ui';
import { ACHIEVEMENTS } from '../game/achievements';
import { ATTRIBUTES, ATTRIBUTE_LABEL } from '../game/types';
import { useStore } from '../store';
import { useProgress } from '../useProgress';

export default function Profile() {
  const p = useProgress();
  const { workouts, settings, updateSettings, openSummary, deleteWorkout, resetAll } = useStore();
  const history = [...workouts].filter((w) => w.finishedAt).reverse();

  return (
    <>
      <h1>Perfil</h1>

      <section className="card">
        <h2>Atributos</h2>
        {ATTRIBUTES.map((a) => (
          <div key={a} className="attr-row">
            <span>{ATTRIBUTE_LABEL[a]}</span>
            <XpBar info={p.attrLevels[a]} small />
            <span className="num-small">Nv {p.attrLevels[a].level}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>
          Conquistas{' '}
          <span className="muted small">
            {Object.keys(p.achievements).length}/{ACHIEVEMENTS.length}
          </span>
        </h2>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const got = p.achievements[a.id];
            return (
              <div key={a.id} className={`ach${got ? ' got' : ''}`} title={a.description}>
                <span className="ach-icon">{got ? a.icon : '🔒'}</span>
                <strong>{a.name}</strong>
                <span className="muted small">{a.description}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Histórico</h2>
        {history.length === 0 && <p className="muted small">Nenhum treino ainda.</p>}
        <ul className="history">
          {history.slice(0, 30).map((w) => (
            <li key={w.id}>
              <button className="link grow left" onClick={() => openSummary(w.id)}>
                {new Date(w.finishedAt!).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                <span className="muted"> · {w.sets.length} séries{w.deload ? ' · deload' : ''}</span>
              </button>
              <span className="num-small">+{p.results[w.id]?.xpTotal ?? 0}</span>
              <button
                className="link danger"
                aria-label="Apagar treino"
                onClick={() => confirm('Apagar este treino? O XP será recalculado.') && deleteWorkout(w.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
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
          Unidade
          <select value={settings.unit} onChange={(e) => updateSettings({ unit: e.target.value as 'kg' | 'lb' })}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <button
          className="ghost danger"
          onClick={() => confirm('Apagar TODOS os treinos e o progresso? Isso não pode ser desfeito.') && resetAll()}
        >
          Apagar todos os dados
        </button>
      </section>
    </>
  );
}
