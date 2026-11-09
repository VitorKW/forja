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
  /** Placar da semana do casal, para o resumo de domingo. */
  weekly?: Weekly;
}

export interface Weekly {
  days: number;
  goal: number;
  partner: string;
  partnerDays: number;
  partnerGoal: number;
  /** Vida restante do chefe da semana, em % (0 = derrotado). */
  raidLeft: number;
  boss: string;
  challenge: string;
  unit: string;
  mine: number;
  theirs: number;
  /** Sono da semana, já em texto (ex.: "Dormiu bem 4 de 6 noites."). */
  sleep?: string;
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

/** Domingo à noite: resumo da semana do casal (e o lembrete, se ainda faltar treino). */
export function weeklyFor(status: Status | undefined, now = Date.now()): { title: string; body: string } | null {
  if (!status?.weekly) return null;
  const local = new Date(now - status.tz * 60000);
  if (local.getUTCDay() !== 0) return null;
  const monday = new Date(local.getTime() - 6 * 86400000).toISOString().slice(0, 10);
  if (status.week !== monday) return null;
  const w = status.weekly;
  const n = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');
  const parts = [
    `Você ${w.days}/${w.goal} dias, ${w.partner} ${w.partnerDays}/${w.partnerGoal}.`,
    w.raidLeft <= 0 ? `${w.boss} derrotado juntos! 🏆` : `${w.boss} ainda com ${w.raidLeft}% de vida.`,
    `${w.challenge}: você ${n(w.mine)} × ${n(w.theirs)} ${w.unit}.`,
    ...(w.sleep ? [w.sleep] : []),
  ];
  const fresh = status.day === local.toISOString().slice(0, 10);
  if (status.weekLeft > 0 && !(fresh && status.trained)) parts.push(`Hoje é o último dia: falta${status.weekLeft > 1 ? 'm' : ''} ${status.weekLeft} para a meta.`);
  return { title: 'Resumo da semana 📊', body: parts.join(' ') };
}