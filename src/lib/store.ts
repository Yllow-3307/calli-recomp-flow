import { useEffect, useState, useCallback } from "react";

export interface Profile {
  weight: number;
  height: number;
  goal: string;
  equipment: string[];
  daysPerWeek: 5 | 6;
  level: "débutant" | "intermédiaire" | "avancé";
  onboarded: boolean;
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO
  dayKey: string;
  duration: number;
  rpe?: number;
  filmed?: boolean;
  notes?: string;
  exercises: {
    exId: string;
    sets: { reps?: number; time?: number; weight?: number; done: boolean }[];
  }[];
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
  energy?: number; // 1-5
  fatigue?: number;
  photoNote?: string;
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
  water: Record<string, number>; // date -> liters
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

const KEY = "calli-recomp-v1";

function load(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(s: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
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
    // hydration: force load on mount
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
  // count consecutive days including today or yesterday
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) break;
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
