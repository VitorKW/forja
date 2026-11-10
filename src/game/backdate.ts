import { dayKey } from './rules';
import type { Workout } from './types';

/** Treino lançado depois: em que dia foi e quanto durou. */
export interface Backdate {
  day: string; // AAAA-MM-DD
  minutes: number;
}

/** Até quantos dias para trás dá para lançar um treino esquecido. */
export const BACKDATE_MAX_DAYS = 7;

/** Os dias que podem ser escolhidos, de ontem para trás. */
export function backdateDays(now = new Date()): { day: string; label: string }[] {
  return Array.from({ length: BACKDATE_MAX_DAYS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i + 1));
    const label =
      i === 0 ? 'Ontem' : i === 1 ? 'Anteontem' : `${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { day: dayKey(d), label };
  });
}

/** "ontem", "anteontem" ou "dd/mm", para textos. */
export function backdateLabel(day: string, now = new Date()): string {
  const i = backdateDays(now).findIndex((d) => d.day === day);
  if (i === 0) return 'ontem';
  if (i === 1) return 'anteontem';
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
}

/**
 * Horários de um treino lançado depois. Termina no mesmo horário de agora,
 * só que no dia escolhido (entre 6h e 22h), e começa `minutes` antes.
 */
export function backdatedTimes(b: Backdate, now = new Date()): { startedAt: string; finishedAt: string } {
  const [y, m, d] = b.day.split('-').map(Number);
  const hour = Math.min(22, Math.max(6, now.getHours()));
  const end = new Date(y, m - 1, d, hour, now.getMinutes());
  const start = new Date(end.getTime() - Math.max(1, b.minutes) * 60000);
  return { startedAt: start.toISOString(), finishedAt: end.toISOString() };
}

/** O treino ativo como ficaria se terminasse agora (respeitando o dia lançado). */
export function finishedVersion(active: Workout, now = new Date()): Workout {
  const { backdate, ...rest } = active;
  if (!backdate) return { ...rest, finishedAt: now.toISOString() };
  return { ...rest, ...backdatedTimes(backdate, now) };
}
