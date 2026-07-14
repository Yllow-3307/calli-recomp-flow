import { useEffect, useState, useCallback } from "react";

export interface Profile {
  weight: number;
  height: number;
  goal: string;
  equipment: string[];
  daysPerWeek: 5 | 6;
  level: "débutant" | "intermédiaire" | "avancé";
  onboarded: boolean;
  startDate?: string; // ISO date when program started
}

export interface SetLog {
  reps?: number;
  time?: number;
  weight?: number;
  rpe?: number;
  notes?: string;
  done: boolean;
}

export interface ExerciseLog {
  exId: string;
  name: string;
  targetMin?: number;
  targetMax?: number;
  kind: "reps" | "time" | "distance";
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  dayKey: string;
  dayTitle?: string;
  duration: number;
  rpe?: number;
  filmed?: boolean;
  notes?: string;
  exercises: ExerciseLog[];
  totalVolume?: number;
  successCount?: number;
}

export interface CardioLog {
  id: string;
  date: string;
  type: "course" | "rameur" | "natation" | "vélo";
  distance?: number;
  duration: number;
  pace?: string;
  zone: "zone2" | "intervalles" | "autre";
}

export interface MealLog {
  id: string;
  date: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyMetric {
  id: string;
  date: string;
  weight?: number;
  waist?: number;
  sleep?: number;
  energy?: number;
  fatigue?: number;
  photoNote?: string;
  photos?: { face?: string; profile?: string; back?: string };
}

export interface ProgressTest {
  id: string;
  date: string;
  testId: string;
  value: number;
}

interface AppState {
  profile: Profile;
  workouts: WorkoutLog[];
  cardio: CardioLog[];
  meals: MealLog[];
  metrics: BodyMetric[];
  tests: ProgressTest[];
  water: Record<string, number>;
}

const DEFAULT_STATE: AppState = {
  profile: {
    weight: 75,
    height: 178,
    goal: "Recomposition corporelle",
    equipment: ["Barre traction", "Anneaux", "Haltères"],
    daysPerWeek: 6,
    level: "intermédiaire",
    onboarded: false,
    startDate: new Date().toISOString(),
  },
  workouts: [],
  cardio: [],
  meals: [],
  metrics: [],
  tests: [
    { id: "seed-1", date: new Date(Date.now() - 30 * 864e5).toISOString(), testId: "pushups", value: 22 },
    { id: "seed-2", date: new Date(Date.now() - 30 * 864e5).toISOString(), testId: "pullups", value: 8 },
    { id: "seed-3", date: new Date(Date.now() - 30 * 864e5).toISOString(), testId: "handstand", value: 15 },
    { id: "seed-4", date: new Date(Date.now() - 2 * 864e5).toISOString(), testId: "pushups", value: 28 },
    { id: "seed-5", date: new Date(Date.now() - 2 * 864e5).toISOString(), testId: "pullups", value: 10 },
    { id: "seed-6", date: new Date(Date.now() - 2 * 864e5).toISOString(), testId: "handstand", value: 22 },
  ],
  water: {},
};

const KEY = "calli-recomp-v2";

function load(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, profile: { ...DEFAULT_STATE.profile, ...parsed.profile } };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(s: AppState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("Storage full", e);
  }
}

let listeners: Array<() => void> = [];
let state: AppState | null = null;

function getState() {
  if (state === null) state = load();
  return state;
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(getState());
  save(state);
  listeners.forEach((l) => l());
}

export function useAppState() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.push(l);
    tick((n) => n + 1);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return getState();
}

export function useAppActions() {
  return {
    setProfile: useCallback((p: Partial<Profile>) => {
      setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));
    }, []),
    addWorkout: useCallback((w: WorkoutLog) => {
      setState((s) => ({ ...s, workouts: [w, ...s.workouts] }));
    }, []),
    addCardio: useCallback((c: CardioLog) => {
      setState((s) => ({ ...s, cardio: [c, ...s.cardio] }));
    }, []),
    addMeal: useCallback((m: MealLog) => {
      setState((s) => ({ ...s, meals: [m, ...s.meals] }));
    }, []),
    removeMeal: useCallback((id: string) => {
      setState((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== id) }));
    }, []),
    addMetric: useCallback((m: BodyMetric) => {
      setState((s) => ({ ...s, metrics: [m, ...s.metrics] }));
    }, []),
    removeMetric: useCallback((id: string) => {
      setState((s) => ({ ...s, metrics: s.metrics.filter((x) => x.id !== id) }));
    }, []),
    addTest: useCallback((t: ProgressTest) => {
      setState((s) => ({ ...s, tests: [t, ...s.tests] }));
    }, []),
    addWater: useCallback((liters: number) => {
      const key = new Date().toISOString().slice(0, 10);
      setState((s) => ({ ...s, water: { ...s.water, [key]: (s.water[key] || 0) + liters } }));
    }, []),
    resetWater: useCallback(() => {
      const key = new Date().toISOString().slice(0, 10);
      setState((s) => ({ ...s, water: { ...s.water, [key]: 0 } }));
    }, []),
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function computeStreak(workouts: WorkoutLog[]): number {
  if (!workouts.length) return 0;
  const dates = new Set(workouts.map((w) => w.date.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function thisWeekWorkouts(workouts: WorkoutLog[]): WorkoutLog[] {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return workouts.filter((w) => new Date(w.date) >= start);
}

export function kmThisWeek(cardio: CardioLog[]): number {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return cardio
    .filter((c) => c.type === "course" && new Date(c.date) >= start)
    .reduce((a, c) => a + (c.distance || 0), 0);
}

export function proteinToday(meals: MealLog[]) {
  const t = todayKey();
  return meals.filter((m) => m.date.slice(0, 10) === t).reduce((a, m) => a + m.protein, 0);
}

export function kcalToday(meals: MealLog[]) {
  const t = todayKey();
  return meals.filter((m) => m.date.slice(0, 10) === t).reduce((a, m) => a + m.kcal, 0);
}

// ---------- Progression logic ----------

export interface ProgressionSuggestion {
  exId: string;
  name: string;
  hint: string;
  delta: string;
  reason: "up" | "hold";
}

export function suggestProgressionForExercise(
  exId: string,
  targetMax: number | undefined,
  kind: "reps" | "time" | "distance",
  workouts: WorkoutLog[],
): ProgressionSuggestion | null {
  const lastLog = workouts.find((w) => w.exercises.some((e) => e.exId === exId));
  if (!lastLog) return null;
  const ex = lastLog.exercises.find((e) => e.exId === exId)!;
  const setsDone = ex.sets.filter((s) => s.done);
  if (setsDone.length < ex.sets.length) return { exId, name: ex.name, hint: "Séance incomplète", delta: "= idem", reason: "hold" };

  const values = setsDone
    .map((s) => (kind === "time" ? s.time : s.reps))
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (!values.length) return null;
  const min = Math.min(...values);
  const rpes = setsDone.map((s) => s.rpe).filter((r): r is number => typeof r === "number");
  const maxRpe = rpes.length ? Math.max(...rpes) : 7;

  const hitTop = targetMax !== undefined && min >= targetMax;
  if (hitTop && maxRpe <= 8) {
    if (kind === "time") return { exId, name: ex.name, hint: "Objectif atteint · RPE ≤ 8", delta: "+5s", reason: "up" };
    const bump = maxRpe <= 7 ? 2 : 1;
    return { exId, name: ex.name, hint: "Objectif atteint · RPE ≤ 8", delta: `+${bump} reps`, reason: "up" };
  }
  return { exId, name: ex.name, hint: maxRpe >= 9 ? "RPE ≥ 9 : consolider" : "Fourchette non atteinte", delta: "= idem", reason: "hold" };
}

// Current program week (1-12)
export function currentProgramWeek(profile: Profile): number {
  if (!profile.startDate) return 1;
  const start = new Date(profile.startDate).getTime();
  const now = Date.now();
  const weeks = Math.floor((now - start) / (7 * 864e5)) + 1;
  return Math.max(1, Math.min(12, weeks));
}

export function isTestWeek(profile: Profile): boolean {
  const w = currentProgramWeek(profile);
  return w % 4 === 0;
}

// Downscale image file → base64 JPEG (max 800px, ~70% quality) for localStorage.
export async function fileToCompressedBase64(file: File, maxDim = 800, quality = 0.7): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
