/**
 * Dados de exemplo para o modo demonstração: dez semanas de um casal treinando.
 * Gerados na hora (com semente fixa, para ficarem sempre iguais) e nunca salvos.
 */
import type { Bet, BetAnswer } from './game/bets';
import type { Cheer, HabitLog } from './game/extras';
import type { DietLog } from './game/diet';
import { buildProgram, type ProgramConfig } from './game/program';
import { dayKey, weekKey } from './game/rules';
import type { SetEntry, Workout } from './game/types';
import type { Profile } from './store';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const START_LOAD: Record<string, number> = {
  agachamento: 60, supino: 50, 'remada-curvada': 45, desenvolvimento: 30, stiff: 60, puxada: 50, terra: 80, 'hip-thrust': 70,
  'barra-fixa': 0, 'supino-inclinado': 40, 'leg-press': 140, 'mesa-flexora': 35, 'cadeira-extensora': 40, panturrilha: 60,
  'triceps-polia': 25, rosca: 20, 'elevacao-lateral': 8, 'face-pull': 20, 'remada-unilateral': 24, 'supino-halter': 22,
  afundo: 16, prancha: 0, 'abdominal-polia': 35, 'remada-baixa': 45, 'elevacao-pernas': 0,
};

function at(daysAgo: number, hour: number, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d;
}

let n = 0;
const id = (p: string) => `demo-${p}-${++n}`;

/** Treinos que seguem o programa, com carga subindo de verdade. */
function programWorkouts(cfg: ProgramConfig, scale: number, hour: number, rand: () => number, weeksDone: number): Workout[] {
  const plan = buildProgram(cfg);
  const out: Workout[] = [];
  const load: Record<string, number> = {};
  const dayGap = [0, 2, 4, 5, 1, 3];
  for (let w = 0; w < weeksDone; w++) {
    const week = plan[Math.min(w, plan.length - 1)];
    week.sessions.forEach((s, si) => {
      const [sy, sm, sd] = cfg.startWeek.split('-').map(Number);
      const day = new Date(sy, sm - 1, sd + 7 * w + dayGap[si % dayGap.length]);
      const today = new Date();
      const daysAgo = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - day.getTime()) / 86400000);
      if (daysAgo < 1 || rand() < 0.08) return;
      const start = at(daysAgo, hour, Math.floor(rand() * 40));
      const sets: SetEntry[] = [];
      for (const slot of s.slots) {
        if (slot.role === 'cardio') {
          sets.push({ id: id('s'), exerciseId: 'hiit', weight: 0, reps: slot.reps[1], rir: null, warmup: false });
          continue;
        }
        const base = (START_LOAD[slot.exerciseId] ?? 20) * scale;
        load[slot.exerciseId] ??= Math.round(base / 2.5) * 2.5;
        const kg = week.deload ? Math.round((load[slot.exerciseId] * 0.9) / 2.5) * 2.5 : load[slot.exerciseId];
        for (let k = 0; k < slot.sets; k++) {
          const reps = slot.reps[0] + Math.floor(rand() * (slot.reps[1] - slot.reps[0] + 1));
          sets.push({ id: id('s'), exerciseId: slot.exerciseId, weight: kg, reps, rir: slot.rir, warmup: false });
        }
        if (!week.deload && rand() < 0.55) load[slot.exerciseId] += 2.5;
      }
      out.push({
        id: id('w'),
        startedAt: start.toISOString(),
        finishedAt: new Date(start.getTime() + (55 + rand() * 25) * 60000).toISOString(),
        deload: week.deload,
        sets,
        plan: { program: cfg.id, week: w + 1, session: si },
      });
    });
  }
  return out;
}

function cardioWorkouts(rand: () => number, hour: number): Workout[] {
  const out: Workout[] = [];
  for (let d = 68; d > 0; d -= 4 + Math.floor(rand() * 4)) {
    const start = at(d, hour);
    const run = rand() < 0.5;
    out.push({
      id: id('w'),
      startedAt: start.toISOString(),
      finishedAt: new Date(start.getTime() + 45 * 60000).toISOString(),
      deload: false,
      sets: [{ id: id('s'), exerciseId: run ? 'corrida' : 'caminhada', weight: 0, reps: run ? 30 : 45, rir: null, warmup: false, distance: run ? 5 : 4 }],
    });
  }
  return out;
}

function habitsFor(rand: () => number, ids: string[], chance: number): HabitLog {
  const log: HabitLog = {};
  for (let d = 70; d >= 0; d--) {
    const done = ids.filter(() => rand() < chance);
    if (done.length) log[dayKey(at(d, 12))] = done;
  }
  return log;
}

function dietFor(rand: () => number, protein: number): DietLog {
  const log: DietLog = {};
  for (let d = 13; d >= 0; d--) {
    const key = dayKey(at(d, 12));
    const meals = [
      { label: 'Ovo', proteina: 12, kcal: 150 },
      { label: 'Frango 100 g', proteina: 31, kcal: 165 },
      { label: 'Arroz e feijão', proteina: 9, kcal: 350 },
      { label: 'Whey', proteina: 24, kcal: 120 },
      { label: 'Carne 100 g', proteina: 26, kcal: 220 },
      { label: 'Iogurte', proteina: 10, kcal: 110 },
    ].filter(() => rand() < 0.8);
    const extra = protein - meals.reduce((s, m) => s + m.proteina, 0);
    log[key] = [
      ...meals.map((m, i) => ({ id: id('d'), at: at(d, 8 + i * 2).toISOString(), agua: 0, ...m })),
      ...(extra > 0 && rand() < 0.6 ? [{ id: id('d'), at: at(d, 20).toISOString(), label: 'Frango 100 g', proteina: 31, kcal: 165, agua: 0 }] : []),
      { id: id('d'), at: at(d, 10).toISOString(), label: 'Garrafa de água', proteina: 0, kcal: 0, agua: rand() < 0.7 ? 2000 : 1500 },
    ];
  }
  return log;
}

export function demoProfiles(): Profile[] {
  n = 0;
  const rand = rng(42);
  const thisMonday = weekKey(new Date());
  const [y, m, d] = thisMonday.split('-').map(Number);
  const startWeek = dayKey(new Date(y, m - 1, d - 7 * 5));

  const progA: ProgramConfig = { id: 'demo-prog-a', goal: 'hipertrofia', days: 4, weeks: 8, startWeek };
  const progB: ProgramConfig = { id: 'demo-prog-b', goal: 'condicionamento', days: 3, weeks: 6, startWeek };

  const wa = programWorkouts(progA, 1, 18, rand, 6);
  const wb = [...programWorkouts(progB, 0.55, 18, rand, 6), ...cardioWorkouts(rand, 7)];
  const byStart = (a: Workout, b: Workout) => a.startedAt.localeCompare(b.startedAt);
  wa.sort(byStart);
  wb.sort(byStart);

  const cheersFor = (ws: Workout[], from: string): Cheer[] =>
    ws.filter(() => rand() < 0.5).map((w) => ({ id: id('c'), workoutId: w.id, kind: (['fogo', 'forca', 'orgulho'] as const)[Math.floor(rand() * 3)], from, at: w.finishedAt! }));

  const betA: Bet = { id: 'demo-bet-1', metric: 'treinos', days: 7, stake: 50, prize: 'quem perder paga o açaí', createdAt: at(3, 9).toISOString() };
  const betOld: Bet = { id: 'demo-bet-0', metric: 'xp', days: 7, stake: 25, createdAt: at(20, 9).toISOString() };
  const answersB: Record<string, BetAnswer> = { [betA.id]: { accepted: true, at: at(2, 21).toISOString() }, [betOld.id]: { accepted: true, at: at(19, 8).toISOString() } };

  const lastA = wb.at(-1);
  const base = { active: null, metaAt: 0, deleted: [] as string[], templates: [] };
  return [
    {
      ...base,
      id: 'demo-a',
      name: 'Rafa',
      look: 'a',
      workouts: wa,
      settings: { weeklyGoal: 4, unit: 'kg', restSeconds: 90 },
      program: progA,
      habits: habitsFor(rand, ['sono', 'passos', 'alongar'], 0.55),
      missions: { active: ['proteina', 'agua', 'sono', 'passos', 'alongar'], custom: [] },
      dietLog: dietFor(rand, 140),
      bodyWeights: [70, 50, 30, 10].map((dd, i) => ({ day: dayKey(at(dd, 8)), kg: 79.4 + i * 0.4 })),
      cheers: cheersFor(wa, 'Bia'),
      purchases: ['rubi', 'slime'],
      equipped: { capa: 'rubi', pet: 'slime' },
      bets: [betA, betOld],
      betAnswers: {},
    },
    {
      ...base,
      id: 'demo-b',
      name: 'Bia',
      look: 'b',
      workouts: wb,
      settings: { weeklyGoal: 4, unit: 'kg', restSeconds: 60 },
      program: progB,
      habits: habitsFor(rand, ['sono', 'leitura', 'vegetais'], 0.6),
      missions: { active: ['proteina', 'agua', 'sono', 'leitura', 'vegetais'], custom: [] },
      dietLog: dietFor(rand, 100),
      cheers: cheersFor(wb, 'Rafa'),
      purchases: ['safira'],
      equipped: { capa: 'safira' },
      bets: [],
      betAnswers: answersB,
      // Treinando agora, para mostrar o card ao vivo.
      live: lastA
        ? { id: 'demo-live', startedAt: new Date(Date.now() - 25 * 60000).toISOString(), sets: 9, session: 'Full body B', last: { exerciseId: 'stiff', weight: 35, reps: 12, at: new Date().toISOString() } }
        : null,
    },
  ];
}
