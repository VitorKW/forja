import { describe, expect, it } from 'vitest';
import { computeBets, type Bet, type BetPlayer } from './bets';
import { reminderFor, type Status } from '../../push/src/reminder';
import { parseBackup } from '../components/BackupPanel';
import type { Workout } from './types';

const day = (d: number, h = 12) => new Date(2026, 10, d, h).getTime(); // novembro de 2026
const iso = (ms: number) => new Date(ms).toISOString();
const w = (id: string, ms: number): Workout => ({ id, startedAt: iso(ms - 3600000), finishedAt: iso(ms), deload: false, sets: [] });
const player = (extra: Partial<BetPlayer> = {}): BetPlayer => ({ bets: [], answers: {}, workouts: [], timeline: [], habits: {}, ...extra });
const bet = (extra: Partial<Bet> = {}): Bet => ({ id: 'b1', metric: 'treinos', days: 7, stake: 50, createdAt: iso(day(2, 9)), ...extra });

describe('apostas', () => {
  it('proposta sem resposta expira em 3 dias', () => {
    const a = player({ bets: [bet()] });
    expect(computeBets([a, player()], day(3)).list[0].status).toBe('proposta');
    expect(computeBets([a, player()], day(6)).list[0].status).toBe('expirada');
  });

  it('conta só a janela do aceite e paga o vencedor', () => {
    const a = player({ bets: [bet()], workouts: [w('x', day(1)), w('a1', day(3)), w('a2', day(9))] });
    const b = player({ answers: { b1: { accepted: true, at: iso(day(3, 20)) } }, workouts: [w('b1', day(4)), w('b2', day(5)), w('b3', day(10))] });
    // janela: 3/11 00h até 10/11 00h
    const live = computeBets([a, b], day(8));
    expect(live.list[0].status).toBe('valendo');
    expect(live.list[0].values).toEqual([2, 2]); // 1/11 e 10/11 ficam de fora
    expect(live.coins).toEqual([0, 0]);
    const done = computeBets([a, b], day(11));
    expect(done.list[0]).toMatchObject({ status: 'encerrada', values: [2, 2], winner: null });
    expect(done.coins).toEqual([0, 0]);
    const b2 = { ...b, workouts: [...b.workouts, w('b4', day(6))] };
    const won = computeBets([a, b2], day(11));
    expect(won.list[0].winner).toBe(1);
    expect(won.coins).toEqual([-50, 50]);
  });

  it('recusada e cancelada não valem moedas; missões e proteína contam por dia', () => {
    const habits = { '2026-11-03': ['proteina', 'agua'], '2026-11-04': ['sono'], '2026-11-20': ['proteina'] } as BetPlayer['habits'];
    const a = player({ habits, bets: [bet({ id: 'm', metric: 'missoes', stake: 10 }), bet({ id: 'p', metric: 'proteina', stake: 0 }), bet({ id: 'c', cancelled: true }), bet({ id: 'r' })] });
    const at = iso(day(3, 8));
    const b = player({ answers: { m: { accepted: true, at }, p: { accepted: true, at }, r: { accepted: false, at } } });
    const r = computeBets([a, b], day(12));
    const by = Object.fromEntries(r.list.map((v) => [v.bet.id, v]));
    expect(by.c.status).toBe('cancelada');
    expect(by.r.status).toBe('recusada');
    expect(by.m.values).toEqual([3, 0]);
    expect(by.p.values).toEqual([1, 0]);
    expect(r.coins).toEqual([10, -10]);
  });
});

describe('lembrete da noite', () => {
  // 20h em Brasília de quarta, 11/11/2026 = 23h UTC.
  const now = Date.UTC(2026, 10, 11, 23);
  const base: Status = { name: 'Vitor', day: '2026-11-11', week: '2026-11-09', tz: 180, trained: false, habitsLeft: 2, weekLeft: 2 };

  it('lista treino e missões pendentes', () => {
    const r = reminderFor(base, now)!;
    expect(r.title).toContain('Vitor');
    expect(r.body).toContain('Faltam 2 treinos');
    expect(r.body).toContain('2 missões');
  });
  it('fica quieto quando está tudo feito', () => {
    expect(reminderFor({ ...base, trained: true, habitsLeft: 0 }, now)).toBeNull();
    expect(reminderFor({ ...base, weekLeft: 0, habitsLeft: 0 }, now)).toBeNull();
  });
  it('resumo de ontem: missões todas em aberto, meta da semana mantida', () => {
    const r = reminderFor({ ...base, day: '2026-11-10', trained: true, habitsLeft: 0 }, now)!;
    expect(r.body).toContain('3 missões');
    expect(r.body).toContain('Faltam 2 treinos');
  });
  it('avisa quando a meta depende de treinar hoje', () => {
    const sunday = Date.UTC(2026, 10, 15, 23);
    expect(reminderFor({ ...base, day: '2026-11-15', weekLeft: 1, habitsLeft: 0 }, sunday)!.body).toContain('precisa treinar hoje');
  });
});

describe('backup', () => {
  it('aceita só arquivo do Forja', () => {
    const ok = JSON.stringify({ app: 'forja', version: 1, exportedAt: 'x', data: { currentId: 'a', profiles: [{ id: 'a', name: 'V', workouts: [], settings: {} }] } });
    expect(parseBackup(ok)).not.toBeNull();
    expect(parseBackup('{"app":"outro"}')).toBeNull();
    expect(parseBackup('não é json')).toBeNull();
  });
});
