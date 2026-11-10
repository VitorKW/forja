import { EYES, HAIR, resolve, SHIRT, SKIN, type Appearance, type Option } from '../game/appearance';
import { useStore, type Look, type Profile } from '../store';
import { useBodyUrl } from './body';

const ROWS: { key: keyof Appearance; label: string; list: Option[] }[] = [
  { key: 'hair', label: 'Cor do cabelo', list: HAIR },
  { key: 'eyes', label: 'Olhos', list: EYES },
  { key: 'skin', label: 'Pele', list: SKIN },
  { key: 'shirt', label: 'Camiseta', list: SHIRT },
];

/** Personalizar o boneco: corte, cores de cabelo, olhos, pele e camiseta. Sincroniza com o par. */
export default function AppearanceEditor({ profile }: { profile: Profile }) {
  const { setLook, setAppearance } = useStore();
  const current = resolve(profile.look, profile.appearance);
  const body = useBodyUrl(profile.look, profile.appearance);

  return (
    <div className="appearance">
      <div className="appearance-preview" aria-hidden>
        {body && <img src={body} alt="" />}
      </div>
      <div className="appearance-controls">
        <div className="seg" role="group" aria-label="Corte de cabelo">
          {(['a', 'b'] as Look[]).map((l) => (
            <button key={l} className={profile.look === l ? 'on' : ''} aria-pressed={profile.look === l} onClick={() => setLook(profile.id, l)}>
              {l === 'a' ? 'Curto' : 'Longo'}
            </button>
          ))}
        </div>
        {ROWS.map((row) => (
          <div key={row.key} className="swatch-row">
            <span className="field-label">{row.label}</span>
            <div className="swatches" role="radiogroup" aria-label={row.label}>
              {row.list.map((o) => {
                const on = current[row.key] === o.id;
                return (
                  <button
                    key={o.id}
                    role="radio"
                    aria-checked={on}
                    aria-label={o.label}
                    title={o.label}
                    className={`swatch-btn${on ? ' on' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${o.ramp[2]} 0 35%, ${o.ramp[1]} 35% 70%, ${o.ramp[0]} 70%)` }}
                    onClick={() => setAppearance(profile.id, { [row.key]: o.id })}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
