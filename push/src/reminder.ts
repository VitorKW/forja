/** Resumo do dia que o app manda e o texto do lembrete da noite. */

export interface Status {
  name: string;
  /** Dia local AAAA-MM-DD a que o resumo se refere. */
  day: string;
  /** Semana (segunda AAAA-MM-DD) a que weekLeft se refere. */
  week: string;
  /** Diferença de fuso em minutos (Date#getTimezoneOffset). */
  tz: number;
  trained: boolean;
  habitsLeft: number;
  weekLeft: number;
}

/** Texto do lembrete da noite, ou null se não há nada pendente. */
export function reminderFor(status: Status | undefined, now = Date.now()): { title: string; body: string } | null {
  if (!status) return null;
  const local = new Date(now - status.tz * 60000);
  const today = local.toISOString().slice(0, 10);
  const dow = (local.getUTCDay() + 6) % 7; // 0 = segunda
  const monday = new Date(local.getTime() - dow * 86400000).toISOString().slice(0, 10);
  const fresh = status.day === today;
  const trained = fresh && status.trained;
  const habitsLeft = fresh ? status.habitsLeft : 3;
  const weekLeft = status.week === monday ? status.weekLeft : null;
  const parts: string[] = [];
  if (!trained && weekLeft && weekLeft > 0) {
    const daysLeft = 7 - dow; // contando hoje
    parts.push(
      weekLeft >= daysLeft
        ? `Para bater a meta da semana, precisa treinar hoje (faltam ${weekLeft}).`
        : `Falta${weekLeft > 1 ? 'm' : ''} ${weekLeft} treino${weekLeft > 1 ? 's' : ''} para a meta da semana.`,
    );
  }
  if (habitsLeft > 0) parts.push(`${habitsLeft} ${habitsLeft > 1 ? 'missões' : 'missão'} do dia em aberto (+${habitsLeft * 10} XP).`);
  if (!parts.length) return null;
  return { title: `${status.name}, ainda dá tempo hoje 🔥`, body: parts.join(' ') };
}
