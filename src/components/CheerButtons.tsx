import { motion } from 'motion/react';
import { CHEERS } from '../game/extras';
import { currentProfile, useStore } from '../store';

/** Botões de incentivo num treino do par. Depois de mandar, mostra o que foi enviado. */
export default function CheerButtons({ toProfileId, workoutId }: { toProfileId: string; workoutId: string }) {
  const myName = useStore((s) => currentProfile(s).name);
  const sent = useStore((s) => s.profiles.find((p) => p.id === toProfileId)?.cheers?.find((c) => c.workoutId === workoutId && c.from === myName));
  const sendCheer = useStore((s) => s.sendCheer);

  if (sent) {
    const c = CHEERS.find((x) => x.id === sent.kind);
    return (
      <span className="cheer-sent" aria-label={`Você mandou: ${c?.label}`}>
        {c?.icon} enviado
      </span>
    );
  }
  return (
    <div className="cheers" role="group" aria-label="Mandar incentivo">
      {CHEERS.map((c) => (
        <motion.button
          key={c.id}
          className="cheer"
          whileTap={{ scale: 0.8 }}
          aria-label={c.label}
          title={c.label}
          onClick={() => {
            sendCheer(toProfileId, workoutId, c.id);
            navigator.vibrate?.(20);
          }}
        >
          {c.icon}
        </motion.button>
      ))}
    </div>
  );
}
