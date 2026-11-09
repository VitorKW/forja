import { EXERCISE_BY_ID } from './exercises';
import { JOINT, type JointPair } from './duo';
import type { SetEntry, Workout } from './types';

/** Números de um treino para comparar lado a lado. */
export interface WorkoutStats {
  /** Séries de força válidas (sem aquecimento). */
  sets: number;
  /** Carga × reps das séries de força válidas, em kg. */
  volume: number;
  km: number;
  cardioMin: number;
}

export function workoutStats(sets: SetEntry[]): WorkoutStats {
  let n = 0;
  let volume = 0;
  let km = 0;
  let cardioMin = 0;
  for (const s of sets) {
    const ex = EXERCISE_BY_ID[s.exerciseId];
    if (!ex) continue;
    if (ex.kind === 'cardio') {
      cardioMin += Math.max(0, s.reps);
      km += s.distance ?? 0;
    } else if (!s.warmup) {
      n++;
      volume += Math.max(0, s.weight) * Math.max(0, s.reps);
    }
  }
  return { sets: n, volume: Math.round(volume), km: Math.round(km * 10) / 10, cardioMin };
}

/** Duração em segundos (até agora, se ainda não terminou). */
export function durationSec(startedAt: string, finishedAt: string | null | undefined, now = Date.now()): number {
  const end = finishedAt ? new Date(finishedAt).getTime() : now;
  return Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
}

/** 1:05:09 ou 42:07. */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Os dois começaram perto o bastante para contar como treino junto? */
export function startedTogether(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= JOINT.windowMs;
}

/** O treino do par que formou dupla com este (se houver). */
export function partnerWorkoutOf(workoutId: string, me: 0 | 1, joint: JointPair[], partnerWorkouts: Workout[]): Workout | undefined {
  const pair = joint.find((j) => (me === 0 ? j.a : j.b) === workoutId);
  if (!pair) return undefined;
  const id = me === 0 ? pair.b : pair.a;
  return partnerWorkouts.find((w) => w.id === id);
}
