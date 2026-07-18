// ─────────────────────────────────────────────────────────────────────────────
// Moteur de génération de plan personnalisé — Calli Recomp
// Règles 100% déterministes (aucune IA payante nécessaire) :
//   objectif + capacités déclarées + niveau  →  fourchettes adaptées + cibles
//   nutrition / hydratation calculées (Mifflin-St Jeor).
// ─────────────────────────────────────────────────────────────────────────────
import type { Profile, ProgressTest, WorkoutLog } from "./store";
import { PROGRAM, type DayProgram, type Exercise } from "./program";

// ── Objectifs ────────────────────────────────────────────────────────────────

export type GoalId = "recomp" | "seche" | "muscle" | "skills";

export interface GoalDef {
  id: GoalId;
  label: string;
  emoji: string;
  description: string;
  /** ajustement calorique vs maintien (ex. -0.15 = -15%) */
  kcalAdjust: number;
  proteinPerKg: [number, number];
}

export const GOALS: GoalDef[] = [
  {
    id: "recomp",
    label: "Recomposition corporelle",
    emoji: "⚖️",
    description: "Perdre du gras en prenant du muscle. Léger déficit.",
    kcalAdjust: -0.08,
    proteinPerKg: [1.8, 2.2],
  },
  {
    id: "seche",
    label: "Perte de gras",
    emoji: "🔥",
    description: "Sécher un max en préservant le muscle.",
    kcalAdjust: -0.18,
    proteinPerKg: [2.0, 2.2],
  },
  {
    id: "muscle",
    label: "Prise de muscle & force",
    emoji: "💪",
    description: "Construire du volume en mangeant un peu plus.",
    kcalAdjust: 0.1,
    proteinPerKg: [1.6, 2.0],
  },
  {
    id: "skills",
    label: "Skills calisthenics",
    emoji: "🤸",
    description: "Priorité aux figures : handstand, muscle-up, flags…",
    kcalAdjust: -0.05,
    proteinPerKg: [1.8, 2.2],
  },
];

/** Ancienne valeurs FR ("Recomposition corporelle") → id. */
export function normalizeGoal(goal?: string | null): GoalId {
  if (goal === "recomp" || goal === "seche" || goal === "muscle" || goal === "skills") return goal;
  const g = (goal || "").toLowerCase();
  if (g.includes("gras") || g.includes("sèche") || g.includes("seche") || g.includes("perte"))
    return "seche";
  if (g.includes("muscle") || g.includes("force") || g.includes("masse")) return "muscle";
  if (g.includes("skill")) return "skills";
  return "recomp";
}

export function goalDefOf(goal?: string | null): GoalDef {
  return GOALS.find((g) => g.id === normalizeGoal(goal)) ?? GOALS[0];
}

// ── Capacités déclarées & palier de difficulté ───────────────────────────────

export interface Capacities {
  pullups?: number; // tractions
  pushups?: number; // pompes
  dips?: number;
  handstand_s?: number; // secondes
  lsit_s?: number; // secondes
}

export const CAPACITY_FIELDS: {
  key: keyof Capacities;
  label: string;
  unit: string;
  placeholder: string;
}[] = [
  { key: "pullups", label: "Tractions strictes", unit: "max", placeholder: "ex. 5" },
  { key: "pushups", label: "Pompes", unit: "max", placeholder: "ex. 20" },
  { key: "dips", label: "Dips", unit: "max", placeholder: "ex. 8" },
  { key: "handstand_s", label: "Handstand (mur ou libre)", unit: "s", placeholder: "ex. 15" },
  { key: "lsit_s", label: "L-sit", unit: "s", placeholder: "ex. 10" },
];

/** Score 0–10 à partir des capacités déclarées. */
export function capacityScore(cap: Capacities = {}): number {
  const s = (v: number | undefined, t1: number, t2: number) =>
    v === undefined || v <= 0 ? 0 : v < t1 ? 0 : v <= t2 ? 1 : 2;
  return (
    s(cap.pullups, 3, 6) +
    s(cap.pushups, 13, 30) +
    s(cap.dips, 6, 15) +
    s(cap.handstand_s, 10, 30) +
    s(cap.lsit_s, 8, 20)
  );
}

export type Tier = 1 | 2 | 3;

export const TIER_INFO: Record<Tier, { label: string; factor: number; hint: string }> = {
  1: {
    label: "Fondations",
    factor: 0.7,
    hint: "Fourchettes allégées pour installer la technique.",
  },
  2: { label: "Progression", factor: 1, hint: "Fourchettes standards du programme." },
  3: { label: "Avancé", factor: 1.3, hint: "Fourchettes renforcées pour continuer à progresser." },
};

export function computeTier(level: Profile["level"], cap?: Capacities): Tier {
  const levelScore = level === "débutant" ? 1 : level === "avancé" ? 3 : 2;
  const score = capacityScore(cap);
  const capTier: Tier = score <= 3 ? 1 : score <= 6 ? 2 : 3;
  return Math.max(1, Math.min(3, Math.round((levelScore + capTier) / 2))) as Tier;
}

// ── Nutrition & hydratation personnalisées ───────────────────────────────────

export interface GeneratedNutrition {
  goalId: GoalId;
  kcalTarget: number;
  proteinMin: number;
  proteinMax: number;
  carbsTarget: number;
  fatTarget: number;
  waterL: number;
  maintenance: number;
}

/** Métabolisme de base × activité (Mifflin-St Jeor, facteur 1.5 = sport quasi quotidien). */
export function computeMaintenance(
  p: Pick<Profile, "weight" | "height"> & Partial<Pick<Profile, "age" | "sex">>,
): number {
  const sexAdj = (p.sex ?? "homme") === "homme" ? 5 : -161;
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * (p.age ?? 30) + sexAdj;
  return Math.round(bmr * 1.5);
}

export function computeNutrition(p: Profile): GeneratedNutrition {
  const goal = goalDefOf(p.goal);
  const maintenance = computeMaintenance(p);
  const kcalTarget = Math.max(1200, Math.round((maintenance * (1 + goal.kcalAdjust)) / 10) * 10);
  const proteinMin = Math.round(p.weight * goal.proteinPerKg[0]);
  const proteinMax = Math.round(p.weight * goal.proteinPerKg[1]);
  const proteinMid = (proteinMin + proteinMax) / 2;
  // Lipides : ~0.9 g/kg (sol hormonal), glucides = calories restantes.
  const fatTarget = Math.max(40, Math.round(p.weight * 0.9));
  const carbsTarget = Math.max(60, Math.round((kcalTarget - proteinMid * 4 - fatTarget * 9) / 4));
  return {
    goalId: goal.id,
    kcalTarget,
    proteinMin,
    proteinMax,
    carbsTarget,
    fatTarget,
    waterL: Math.max(2, Math.min(4.5, Math.round(p.weight * 0.035 * 2) / 2)),
    maintenance,
  };
}

/**
 * Cibles affichées partout dans l'app.
 * Toujours recalculées (fonction déterministe du profil) : elles se mettent
 * donc à jour automatiquement quand le poids change via les pesées.
 */
export function nutritionTargets(p: Profile): GeneratedNutrition {
  return computeNutrition(p);
}

// ── Plan généré (fourchettes adaptées au palier) ─────────────────────────────

/** Conserve le suffixe d'origine ("s", " reps", " reps/jambe"…). */
function scaleExercise(ex: Exercise, factor: number): Exercise {
  if (ex.kind === "distance" || factor === 1) return { ...ex };
  const scaled: Exercise = { ...ex };
  const floor = ex.kind === "time" ? 5 : 1;
  if (ex.targetMin !== undefined)
    scaled.targetMin = Math.max(floor, Math.round(ex.targetMin * factor));
  if (ex.targetMax !== undefined)
    scaled.targetMax = Math.max((scaled.targetMin ?? floor) + 1, Math.round(ex.targetMax * factor));
  const suffix = ex.target.replace(/^[\d\s–-]+/, "");
  const fmt =
    scaled.targetMin !== undefined && scaled.targetMax !== undefined
      ? scaled.targetMin === scaled.targetMax
        ? `${scaled.targetMin}`
        : `${scaled.targetMin}-${scaled.targetMax}`
      : ex.target.replace(suffix, "").trim();
  scaled.target = `${fmt}${suffix}`;
  return scaled;
}

function scaleDay(day: DayProgram, factor: number): DayProgram {
  return {
    ...day,
    blocks: day.blocks.map((b) => ({
      ...b,
      items: b.items.map((ex) => scaleExercise(ex, factor)),
    })),
  };
}

export interface GeneratedPlan {
  version: 1;
  generatedAt: string;
  goalId: GoalId;
  tier: Tier;
  nutrition: GeneratedNutrition;
  days: DayProgram[];
}

export function generatePlan(p: Profile): GeneratedPlan {
  const tier = computeTier(p.level, p.capacities);
  const factor = TIER_INFO[tier].factor;
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    goalId: normalizeGoal(p.goal),
    tier,
    nutrition: computeNutrition(p),
    days: PROGRAM.map((d) => scaleDay(d, factor)),
  };
}

// ── Jours d'entraînement choisis par l'utilisateur ───────────────────────────

/** Indices des jours dans le plan : 0 = Lundi … 6 = Dimanche. */
export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
export const DEFAULT_TRAINING_DAYS = [0, 1, 2, 3, 4, 5]; // Lun → Sam (6 jours)

const REST_INSTRUCTIONS = [
  "Récupération prioritaire — écoute ton corps",
  "Marche légère optionnelle 20-30 min",
  "Étirements + mobilité 10-15 min : poitrine, épaules, ischios, hanches",
];

/**
 * Transforme en repos les jours non cochés dans les préférences.
 * Le contenu des séances reste à son jour habituel (pas de déplacement) :
 * c'est prévisible et facile à retenir (« le jeudi c'est Pull »).
 */
export function applyTrainingDays(days: DayProgram[], trainingDays?: number[]): DayProgram[] {
  if (!trainingDays || trainingDays.length === 0) return days;
  return days.map((d, i) => {
    if (d.type === "rest" || trainingDays.includes(i)) return d;
    return {
      ...d,
      type: "rest" as const,
      emoji: "🧘",
      title: "Repos / récupération",
      summary: "Jour off choisi : marche légère, mobilité douce, hydratation.",
      duration: 20,
      warmup: [],
      blocks: [
        {
          title: "Consignes",
          items: REST_INSTRUCTIONS.map((name, j) => ({
            id: `rest-${d.key}-${j}`,
            name,
            sets: 0,
            target: "—",
            rest: 0,
            kind: "reps" as const,
          })),
        },
      ],
      alternatives: undefined,
      finisher: undefined,
    };
  });
}

/** Les 7 jours du plan de l'utilisateur (généré si dispo, sinon seed standard),
 *  avec les jours non choisis transformés en repos. */
export function planDays(p?: Pick<Profile, "plan" | "trainingDays"> | null): DayProgram[] {
  const days = p?.plan?.days;
  const base = Array.isArray(days) && days.length === 7 ? days : PROGRAM;
  return applyTrainingDays(base, p?.trainingDays);
}

/** Nombre de séances réellement planifiées dans la semaine (hors repos). */
export function plannedSessionsPerWeek(
  p: Pick<Profile, "plan" | "trainingDays" | "daysPerWeek">,
): number {
  const planned = planDays(p).filter((d) => d.type !== "rest").length;
  return planned > 0 ? planned : p.daysPerWeek || 6;
}

// ── Capacités déduites des vraies perfs (tests + historique de séances) ─────

function bestSetValue(
  workouts: WorkoutLog[],
  needle: string,
  kind: "reps" | "time",
): number | undefined {
  const n = needle.toLowerCase();
  let best: number | undefined;
  for (const w of workouts)
    for (const e of w.exercises) {
      if (e.kind !== kind || !e.name.toLowerCase().includes(n)) continue;
      for (const s of e.sets) {
        const v = kind === "time" ? s.time : s.reps;
        if (s.done && typeof v === "number" && v > (best ?? 0)) best = v;
      }
    }
  return best;
}

function bestTestValue(tests: ProgressTest[], testId: string): number | undefined {
  const logs = tests.filter((t) => t.testId === testId);
  return logs.length ? Math.max(...logs.map((t) => t.value)) : undefined;
}

/**
 * Capacités = perfs réelles quand elles existent (max des tests / séances),
 * sinon valeurs déclarées à l'onboarding (cas du 1er cycle sans historique).
 */
export function capacitiesFromHistory(
  tests: ProgressTest[],
  workouts: WorkoutLog[],
  declared: Capacities = {},
): { capacities: Capacities; fromReal: boolean } {
  const real: Capacities = {
    pullups: bestTestValue(tests, "pullups") ?? bestSetValue(workouts, "traction", "reps"),
    pushups: bestTestValue(tests, "pushups") ?? bestSetValue(workouts, "pompe", "reps"),
    dips: bestSetValue(workouts, "dips", "reps"),
    handstand_s: bestTestValue(tests, "handstand") ?? bestSetValue(workouts, "handstand", "time"),
    lsit_s: bestTestValue(tests, "lsit") ?? bestSetValue(workouts, "l-sit", "time"),
  };
  const fromReal = Object.values(real).some((v) => typeof v === "number" && v > 0);
  const capacities: Capacities = { ...declared };
  (Object.keys(real) as (keyof Capacities)[]).forEach((k) => {
    const v = real[k];
    if (typeof v === "number" && v > 0) capacities[k] = v;
  });
  return { capacities, fromReal };
}
