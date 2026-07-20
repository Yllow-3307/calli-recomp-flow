// ─────────────────────────────────────────────────────────────────────────────
// Workout Player — état machine du lecteur de séance guidé (V12)
// Gère le chronomètre, les repos automatiques, le défilement des exercices.
// ─────────────────────────────────────────────────────────────────────────────
import type { Exercise, DayProgram } from "./program";
import type { SetLog } from "./store";

export type PlayerPhase = "idle" | "warmup" | "exercise" | "rest" | "finished";

export interface PlayerState {
  phase: PlayerPhase;
  /** Index de l'exercice en cours dans day.blocks[].items */
  currentBlockIdx: number;
  currentExIdx: number;
  /** Index de la série en cours */
  currentSetIdx: number;
  /** Temps écoulé total (secondes) */
  elapsed: number;
  /** Temps restant de repos (secondes) */
  restLeft: number;
  /** Temps restant pour un exercice chronométré */
  timerLeft: number;
  /** La séance a commencé */
  started: boolean;
  /** Sets complétés */
  sets: Record<string, SetLog[]>;
}

export function createInitialState(): PlayerState {
  return {
    phase: "idle",
    currentBlockIdx: 0,
    currentExIdx: 0,
    currentSetIdx: 0,
    elapsed: 0,
    restLeft: 0,
    timerLeft: 0,
    started: false,
    sets: {},
  };
}

/** Trouve l'exercice courant dans le programme. */
export function currentExercise(day: DayProgram, state: PlayerState): Exercise | null {
  const block = day.blocks[state.currentBlockIdx];
  if (!block) return null;
  return block.items[state.currentExIdx] ?? null;
}

/** Trouve le bloc courant. */
export function currentBlock(day: DayProgram, state: PlayerState) {
  return day.blocks[state.currentBlockIdx] ?? null;
}

/** Passe à l'exercice suivant. */
export function nextExercise(
  day: DayProgram,
  state: PlayerState,
  restSeconds: number,
): PlayerState {
  const block = day.blocks[state.currentBlockIdx];
  if (!block) return { ...state, phase: "finished", currentExIdx: 0, currentBlockIdx: 0 };

  const nextEx = state.currentExIdx + 1;
  const nextBlock = state.currentBlockIdx + 1;

  if (nextEx < block.items.length) {
    // Même bloc, exo suivant
    return {
      ...state,
      phase: "exercise",
      currentExIdx: nextEx,
      currentSetIdx: 0,
      restLeft: restSeconds,
    };
  } else if (nextBlock < day.blocks.length) {
    // Bloc suivant, premier exo
    return {
      ...state,
      phase: "exercise",
      currentBlockIdx: nextBlock,
      currentExIdx: 0,
      currentSetIdx: 0,
      restLeft: restSeconds,
    };
  }

  // Plus rien → séance finie
  return { ...state, phase: "finished", restLeft: 0, timerLeft: 0 };
}

/** Retourne vrai si l'exercice a des séries en circuit. */
export function isCircuitExercise(ex: Exercise): boolean {
  return ex.note?.toLowerCase().includes("circuit") ?? false;
}
