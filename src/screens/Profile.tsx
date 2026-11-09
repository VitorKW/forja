import Seal from '../components/Seal';
import { XpBar } from '../components/ui';
import { ACHIEVEMENTS } from '../game/achievements';
import { ATTRIBUTES, ATTRIBUTE_LABEL } from '../game/types';
import { heatColor } from '../heat';
import { useStore } from '../store';
import { useProgress } from '../useProgress';

export default function Profile() {
  const p = useProgress();
  const { workouts, settings, updateSettings, openSummary, deleteWorkout, resetAll } = useStore();
  const history = [...workouts].filter((w) => w.finishedAt).reverse();
  const unlocked = Object.keys(p.achievements).length;

  return (
    <>
      <h1>Perfil</h1>

      <section className="panel">
        <h2>Atributos</h2>
        {ATTRIBUTES.map((a) => {
          const lvl = p.attrLevels[a].level;
          return (
            <div key={a} className="attr-row">
              <span>{ATTRIBUTE_LABEL[a]}</span>
              <XpBar info={p.attrLevels[a]} small label={`Progresso de ${ATTRIBUTE_LABEL[a]}`} />
              <span className="attr-level" style={{ color: lvl > 1 ? heatColor(lvl + 2) : undefined }}>
                {lvl}
              </span>
            </div>
          );
        })}
        <p className="muted small">A cor de cada parte do personagem segue o nível do atributo, como metal esquentando na forja.</p>
      </section>

      <section className="panel">
        <div className="row between baseline">
          <h2>Conquistas</h2>
          <span className="muted small">
            {unlocked} de {ACHIEVEMENTS.length}
          </span>
        </div>
        <ul className="ach-list">
          {ACHIEVEMENTS.map((a) => {
            const got = !!p.achievements[a.id];
            return (
              <li key={a.id} className={got ? 'got' : ''}>
                <Seal name={a.name} unlocked={got} />
                <div>
                  <strong>{a.name}</strong>
                  <div className="muted small">{a.description}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Histórico</h2>
        {history.length === 0 && <p className="muted small">Seus treinos concluídos aparecem aqui.</p>}
        <ul className="history">
          {history.slice(0, 30).map((w) => (
            <li key={w.id}>
              <button className="history-item" onClick={() => openSummary(w.id)}>
                <span>{new Date(w.finishedAt!).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                <span className="muted small">
                  {w.sets.length} séries{w.deload ? ', deload' : ''}
                </span>
              </button>
              <span className="xp-num">+{p.results[w.id]?.xpTotal ?? 0}</span>
              <button
                className="icon-btn"
                aria-label="Apagar treino"
                onClick={() => confirm('Apagar este treino? O XP será recalculado.') && deleteWorkout(w.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
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
          Unidade de carga
          <select value={settings.unit} onChange={(e) => updateSettings({ unit: e.target.value as 'kg' | 'lb' })}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <button
          className="ghost danger"
          onClick={() => confirm('Apagar todos os treinos e o progresso? Isso não pode ser desfeito.') && resetAll()}
        >
          Apagar todos os dados
        </button>
      </section>
    </>
  );
}
