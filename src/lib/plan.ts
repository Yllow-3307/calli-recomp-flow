// ─────────────────────────────────────────────────────────────────────────────
// Moteur de génération de plan personnalisé — Calli Recomp
// Règles 100% déterministes (aucune IA payante nécessaire) :
//   objectif + capacités déclarées + niveau + disponibilité + équipement
//   → fourchettes adaptées + cibles nutrition + split dynamique + deload.
//
// Architecture en 5 modules d'entrée → moteur de décision (8 étapes) :
//   1. Profil (BMR/TDEE Mifflin-St Jeor)
//   2. Niveau (débutant/intermédiaire/avancé → palier)
//   3. Disponibilité (jours × durée → split + volume)
//   4. Équipement (filtrage du pool d'exercices)
//   5. Objectif (ajustement kcal/macros/volume)
// ─────────────────────────────────────────────────────────────────────────────
import type { Profile, ProgressTest, WorkoutLog } from "./store";
import { PROGRAM, type DayProgram, type Exercise } from "./program";
import {
  EXERCISE_POOL,
  isExerciseAvailable,
  profileEquipmentToTags,
  type ExerciseTemplate,
  type EquipmentTag,
} from "./exercise-pool";
import {
  selectSplit,
  dayFocusToType,
  dayFocusEmoji,
  dayFocusTitle,
  type SplitTemplate,
  type SplitDayTemplate,
  type DayFocus,
} from "./splits";

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
  /** intensité cardio par objectif */
  cardioIntensity: "low" | "moderate" | "high";
  /** volume musculaire par objectif */
  muscleVolume: "low" | "moderate" | "high";
}

export const GOALS: GoalDef[] = [
  {
    id: "recomp",
    label: "Recomposition corporelle",
    emoji: "⚖️",
    description: "Perdre du gras en prenant du muscle. Léger déficit.",
    kcalAdjust: -0.08,
    proteinPerKg: [1.8, 2.2],
    cardioIntensity: "moderate",
    muscleVolume: "moderate",
  },
  {
    id: "seche",
    label: "Perte de gras",
    emoji: "🔥",
    description: "Sécher un max en préservant le muscle.",
    kcalAdjust: -0.18,
    proteinPerKg: [2.0, 2.2],
    cardioIntensity: "high",
    muscleVolume: "moderate",
  },
  {
    id: "muscle",
    label: "Prise de muscle & force",
    emoji: "💪",
    description: "Construire du volume en mangeant un peu plus.",
    kcalAdjust: 0.1,
    proteinPerKg: [1.6, 2.0],
    cardioIntensity: "low",
    muscleVolume: "high",
  },
  {
    id: "skills",
    label: "Skills calisthenics",
    emoji: "🤸",
    description: "Priorité aux figures : handstand, muscle-up, flags…",
    kcalAdjust: -0.05,
    proteinPerKg: [1.8, 2.2],
    cardioIntensity: "low",
    muscleVolume: "moderate",
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

// ── Facteur d'activité (nuancé : niveau × volume hebdo) ──────────────────────
//
// Le facteur TDEE est dérivé du NIVEAU (débutant/intermédiaire/avancé)
// ET du VOLUME (jours d'entraînement par semaine).
//
// | Niveau         | 2-3j | 4j  | 5j  | 6j  |
// |----------------|------|-----|-----|-----|
// | Débutant       | 1.3  | 1.4 | 1.4 | 1.5 |
// | Intermédiaire  | 1.4  | 1.5 | 1.6 | 1.6 |
// | Avancé         | 1.5  | 1.6 | 1.7 | 1.7 |
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_FACTORS: Record<string, number> = {
  débutant_2: 1.3,
  débutant_3: 1.3,
  débutant_4: 1.4,
  débutant_5: 1.4,
  débutant_6: 1.5,
  intermédiaire_2: 1.4,
  intermédiaire_3: 1.4,
  intermédiaire_4: 1.5,
  intermédiaire_5: 1.6,
  intermédiaire_6: 1.6,
  avancé_2: 1.5,
  avancé_3: 1.5,
  avancé_4: 1.6,
  avancé_5: 1.7,
  avancé_6: 1.7,
};

/**
 * Retourne le facteur d'activité TDEE basé sur le niveau et le volume hebdo.
 * Le volume est dérivé du nombre de jours d'entraînement (3-6).
 */
export function getActivityFactor(level: Profile["level"], daysPerWeek: number): number {
  const days = Math.max(2, Math.min(6, daysPerWeek));
  const key = `${level}_${days}`;
  return ACTIVITY_FACTORS[key] ?? 1.5;
}

// ── Nutrition & hydratation personnalisées ───────────────────────────────────

export interface NutritionTiming {
  /** true si séance à jeun (matin) */
  fasted: boolean;
  preWorkout: string;
  postWorkout: string;
  mealTiming: string;
}

export interface GeneratedNutrition {
  goalId: GoalId;
  kcalTarget: number;
  proteinMin: number;
  proteinMax: number;
  carbsTarget: number;
  fatTarget: number;
  waterL: number;
  maintenance: number;
  bmr: number;
  timing: NutritionTiming;
}

/**
 * Calcul du métabolisme de base (Mifflin-St Jeor) × facteur d'activité.
 * Le facteur est nuancé : niveau × volume hebdo (module 1 + module 3).
 */
export function computeMaintenance(
  p: Pick<Profile, "weight" | "height" | "level" | "daysPerWeek"> &
    Partial<Pick<Profile, "age" | "sex">>,
): number {
  const sexAdj = (p.sex ?? "homme") === "homme" ? 5 : -161;
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * (p.age ?? 30) + sexAdj;
  const factor = getActivityFactor(p.level, p.daysPerWeek || 3);
  return Math.round(bmr * factor);
}

/**
 * Calcul du BMR seul (Mifflin-St Jeor) — utilisé pour le plancher calorique relatif.
 */
export function computeBMR(
  p: Pick<Profile, "weight" | "height"> & Partial<Pick<Profile, "age" | "sex">>,
): number {
  const sexAdj = (p.sex ?? "homme") === "homme" ? 5 : -161;
  return Math.round(10 * p.weight + 6.25 * p.height - 5 * (p.age ?? 30) + sexAdj);
}

/**
 * Cibles affichées partout dans l'app.
 * Toujours recalculées (fonction déterministe du profil) : elles se mettent
 * donc à jour automatiquement quand le poids change via les pesées.
 *
 * Garde-fous santé :
 * - Plancher absolu : 1500 kcal/j pour les hommes, 1200 kcal/j pour les femmes
 * - Plancher relatif : BMR × 0.7 (protège les personnes de petite taille)
 * - Le plancher final = max(plancher absolu, plancher relatif)
 */
export function computeNutrition(p: Profile): GeneratedNutrition {
  const goal = goalDefOf(p.goal);
  const bmr = computeBMR(p);
  const maintenance = computeMaintenance(p);

  // Planchers caloriques de sécurité (garde-fou santé)
  const absoluteFloor = p.sex === "femme" ? 1200 : 1500;
  const relativeFloor = Math.round(bmr * 0.7);
  const calorieFloor = Math.max(absoluteFloor, relativeFloor);

  const rawTarget = Math.round((maintenance * (1 + goal.kcalAdjust)) / 10) * 10;
  const kcalTarget = Math.max(calorieFloor, rawTarget);

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
    bmr,
    timing: nutritionTiming(p.trainingTime),
  };
}

/**
 * Timing nutritionnel basé sur le moment de la séance (matin/soir).
 * Le matin à jeun → conseils spécifiques (hydratation, post-séance rapide).
 * Le soir → repas pré-séance + récupération nocturne.
 */
export function nutritionTiming(trainingTime?: "morning" | "evening"): NutritionTiming {
  if (trainingTime === "morning") {
    return {
      fasted: true,
      preWorkout:
        "Séance à jeun : hydrate-toi bien (500 ml d'eau) avant de commencer. Pas de caféine excessif.",
      postWorkout: "Repas protéiné dans les 30-60 min après séance (ex: shake whey + banane).",
      mealTiming: "Petit-déjeuner post-séance = ton repas principal du matin. Dîner léger le soir.",
    };
  }
  return {
    fasted: false,
    preWorkout:
      "Repas léger 1-2h avant l'entraînement (ex: banane + yaourt grec ou toast complet).",
    postWorkout: "Repas protéiné dans les 30-60 min après séance (ex: poulet + riz + légumes).",
    mealTiming: "Déjeuner = repas principal. Dîner = récupération (protéines + glucides lents).",
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

// ── Deload programmé ─────────────────────────────────────────────────────────
//
// Le deload est automatique selon le niveau :
// - Débutant : 8 semaines, pas de deload (récupération naturelle)
// - Intermédiaire : 10-12 semaines, deload à la semaine 6-7
// - Avancé : 12+ semaines, deload à la semaine 4-5
//
// Pendant une semaine de deload :
// - Volume (sets) réduit de ~50%
// - Intensité (reps/time) réduite de ~30%
// - Exercices lourds remplacés par des variantes plus légères
// ─────────────────────────────────────────────────────────────────────────────

export function getDeloadWeek(level: Profile["level"]): number | null {
  if (level === "débutant") return null; // pas de deload
  if (level === "intermédiaire") return 6; // deload à S6
  if (level === "avancé") return 4; // deload à S4
  return null;
}

/**
 * Vérifie si la semaine courante est une semaine de deload.
 * Utilise le cycle 12 semaines (cycleWeek 1-12).
 */
export function isDeloadWeek(profile: Pick<Profile, "level" | "startDate">, week: number): boolean {
  const deloadWeek = getDeloadWeek(profile.level);
  if (!deloadWeek) return false;
  // Le deload dure 1 semaine, à la semaine définie
  return week === deloadWeek;
}

/**
 * Facteur de réduction pour le deload :
 * - Sets : 50% (minimum 1)
 * - Reps/time : 70% (conserver la technique, réduire le volume)
 */
export const DELADD_FACTOR = 0.7;
export const DELADD_SETS_FACTOR = 0.5;

// ── Plan généré (fourchettes adaptées au palier) ─────────────────────────────

/** Conserve le suffixe d'origine ("s", " reps", " reps/jambe"…). */
function scaleExercise(ex: Exercise, factor: number, isDeload = false): Exercise {
  if (ex.kind === "distance" || (factor === 1 && !isDeload)) return { ...ex };

  const scaled: Exercise = { ...ex };
  const floor = ex.kind === "time" ? 5 : 1;

  if (isDeload) {
    // Deload : réduire les reps/time de 30%, sets de 50%
    if (ex.targetMin !== undefined)
      scaled.targetMin = Math.max(floor, Math.round(ex.targetMin * DELADD_FACTOR));
    if (ex.targetMax !== undefined)
      scaled.targetMax = Math.max(
        (scaled.targetMin ?? floor) + 1,
        Math.round(ex.targetMax * DELADD_FACTOR),
      );
    scaled.sets = Math.max(1, Math.round(ex.sets * DELADD_SETS_FACTOR));
  } else {
    // Progression normale
    if (ex.targetMin !== undefined)
      scaled.targetMin = Math.max(floor, Math.round(ex.targetMin * factor));
    if (ex.targetMax !== undefined)
      scaled.targetMax = Math.max(
        (scaled.targetMin ?? floor) + 1,
        Math.round(ex.targetMax * factor),
      );
  }

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

function scaleDay(day: DayProgram, factor: number, isDeload = false): DayProgram {
  return {
    ...day,
    blocks: day.blocks.map((b) => ({
      ...b,
      items: b.items.map((ex) => scaleExercise(ex, factor, isDeload)),
    })),
  };
}

// ── Génération dynamique à partir du pool d'exercices ─────────────────────────

const WEEKDAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DEFAULT_WARMUPS: Record<DayFocus, string[]> = {
  push: [
    "Jumping jacks ou high knees 30-60s",
    "cercles bras + rotations épaules",
    "10 pompes légères",
  ],
  pull: [
    "Jumping jacks ou high knees 30-60s",
    "cercles bras + rotations épaules",
    "10 squats légers",
  ],
  legs: [
    "Jumping jacks ou high knees 30-60s",
    "balancements jambes + fentes dynamiques",
    "10 squats légers",
  ],
  core: ["5 min marche/jog léger", "mobilisations hanches/mollets"],
  cardio: ["5 min marche/jog léger", "mobilisations hanches/mollets"],
  skill: [
    "Jumping jacks ou high knees 30-60s",
    "cercles bras + rotations épaules",
    "10 squats légers",
  ],
  "full-body": [
    "Jumping jacks ou high knees 30-60s",
    "cercles bras + rotations épaules",
    "10 squats légers",
    "10 pompes légères",
  ],
  rest: [],
  recovery: [],
};

const REST_INSTRUCTIONS = [
  "Récupération prioritaire — écoute ton corps",
  "Marche légère optionnelle 20-30 min",
  "Étirements + mobilité 10-15 min : poitrice, épaules, ischios, hanches",
];

/**
 * Convertit un ExerciseTemplate en Exercise (format DayProgram).
 * Applique le facteur de palier et le deload.
 */
function templateToExercise(ex: ExerciseTemplate, tier: Tier, isDeload = false): Exercise {
  const factor = TIER_INFO[tier].factor;
  const effectiveFactor = isDeload ? DELADD_FACTOR : factor;

  let min: number | undefined;
  let max: number | undefined;

  if (ex.kind === "time") {
    min = Math.max(5, Math.round(ex.defaultTargetMin * effectiveFactor));
    max = Math.max(min + 1, Math.round(ex.defaultTargetMax * effectiveFactor));
  } else if (ex.kind === "distance") {
    min = Math.round(ex.defaultTargetMin * effectiveFactor);
    max = Math.max(min, Math.round(ex.defaultTargetMax * effectiveFactor));
  } else {
    min = Math.max(1, Math.round(ex.defaultTargetMin * effectiveFactor));
    max = Math.max(min + 1, Math.round(ex.defaultTargetMax * effectiveFactor));
  }

  const suffix = ex.kind === "time" ? "s" : ex.kind === "distance" ? " km" : " reps";
  const target = min === max ? `${min}${suffix}` : `${min}-${max}${suffix}`;

  const sets = isDeload
    ? Math.max(1, Math.round(ex.defaultSets * DELADD_SETS_FACTOR))
    : Math.round(ex.defaultSets * (tier === 1 ? 0.85 : tier === 3 ? 1.15 : 1));

  return {
    id: ex.id,
    name: ex.name,
    sets,
    target,
    targetMin: min,
    targetMax: max,
    rest: ex.defaultRest,
    kind: ex.kind,
    note: ex.progression,
  };
}

/**
 * Sélectionne des exercices pour un jour de split donnée.
 * Filtre par catégorie, équipement, difficulté, puis sélectionne aléatoirement.
 */
function selectExercisesForDay(
  dayTemplate: {
    focus: DayFocus;
    exerciseCount: Partial<Record<"push" | "pull" | "legs" | "core" | "skill", number>>;
  },
  userEquipment: EquipmentTag[],
  tier: Tier,
  isDeload: boolean,
  usedIds: Set<string>,
): Exercise[] {
  const exercises: Exercise[] = [];

  for (const [category, count] of Object.entries(dayTemplate.exerciseCount)) {
    if (!count || count === 0) continue;

    // Filtrer le pool par catégorie + équipement + difficulté
    let pool = EXERCISE_POOL.filter((ex) => ex.category === category);
    pool = pool.filter((ex) => isExerciseAvailable(ex, userEquipment));

    // Difficulté max : tier + 1 (permet d'aller un cran au-delà)
    const maxDifficulty = Math.min(3, tier + 1);
    pool = pool.filter((ex) => ex.difficulty <= maxDifficulty);

    // En deload, privilégier les exercices de difficulté inférieure
    if (isDeload) {
      pool = pool.filter((ex) => ex.difficulty <= tier);
    }

    // Sélectionner les exercices
    const selected = selectExercisesFromPool(pool, count, usedIds);
    exercises.push(...selected.map((ex) => templateToExercise(ex, tier, isDeload)));
  }

  return exercises;
}

/**
 * Sélectionne N exercices du pool, en évitant les doublons.
 * Priorise la variété (muscle groups différents).
 */
function selectExercisesFromPool(
  pool: ExerciseTemplate[],
  count: number,
  usedIds: Set<string>,
): ExerciseTemplate[] {
  const available = pool.filter((ex) => !usedIds.has(ex.id));
  if (available.length === 0) return [];

  // Mélange et sélectionne
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, available.length));

  selected.forEach((ex) => usedIds.add(ex.id));
  return selected;
}

/**
 * Génère les 7 jours de programme dynamiquement à partir du split + pool d'exercices.
 *
 * Le split définit un pattern de jours d'entraînement (ex: [0,1,3,5]).
 * Les jours d'entraînement de l'utilisateur peuvent différer (ex: [1,2,3,4]).
 * On mappe donc les jours du split vers les jours de l'utilisateur :
 *   split [Mon, Tue, Thu, Sat] → user [Tue, Wed, Thu, Fri]
 *   → Tue=Push, Wed=Pull, Thu=Legs, Fri=Skills
 */
export function generateDynamicDays(
  profile: Profile,
  tier: Tier,
  split: SplitTemplate,
  trainingDays: number[],
  week: number,
): DayProgram[] {
  const userEquipment = profileEquipmentToTags(profile.equipment);
  const deload = isDeloadWeek(profile, week);
  const days: DayProgram[] = [];

  // Jours d'entraînement du split (triés) et de l'utilisateur (triés)
  const splitTrainingDays = split.days.map((d) => d.dayIndex).sort((a, b) => a - b);
  const userTrainingDays = [...trainingDays].sort((a, b) => a - b);

  // Mapping : split dayIndex → user dayIndex
  const dayMapping: Map<number, number> = new Map();
  for (let i = 0; i < Math.min(splitTrainingDays.length, userTrainingDays.length); i++) {
    dayMapping.set(splitTrainingDays[i], userTrainingDays[i]);
  }

  for (let i = 0; i < 7; i++) {
    // Trouver le split day qui mappe vers ce jour utilisateur
    let splitDay: SplitDayTemplate | undefined;
    for (const [splitIdx, userIdx] of dayMapping.entries()) {
      if (userIdx === i) {
        splitDay = split.days.find((d) => d.dayIndex === splitIdx);
        break;
      }
    }

    const isTrainingDay = trainingDays.includes(i);

    if (!splitDay || !isTrainingDay) {
      // Jour de repos
      days.push({
        key: WEEKDAY_KEYS[i],
        day: WEEKDAY_NAMES[i],
        title: "Repos / récupération",
        type: "rest",
        emoji: "🧘",
        summary: "Jour off choisi : marche légère, mobilité douce, hydratation.",
        duration: 20,
        warmup: [],
        blocks: [
          {
            title: "Consignes",
            items: REST_INSTRUCTIONS.map((name, j) => ({
              id: `rest-${WEEKDAY_KEYS[i]}-${j}`,
              name,
              sets: 0,
              target: "—",
              rest: 0,
              kind: "reps" as const,
            })),
          },
        ],
      });
      continue;
    }

    // Jour d'entraînement — sélectionner les exercices
    const usedIds = new Set<string>();
    const exercises = selectExercisesForDay(splitDay, userEquipment, tier, deload, usedIds);

    // Ajouter le cardio si spécifié
    if (splitDay.cardio && splitDay.cardio !== "none") {
      const cardioPool = EXERCISE_POOL.filter(
        (ex) => ex.category === "cardio" && isExerciseAvailable(ex, userEquipment),
      );

      // Filtrer par type de cardio
      let cardioFiltered = cardioPool;
      if (splitDay.cardio === "zone2") {
        cardioFiltered = cardioPool.filter(
          (ex) =>
            ex.name.toLowerCase().includes("zone 2") || ex.name.toLowerCase().includes("steady"),
        );
      } else if (splitDay.cardio === "intervals") {
        cardioFiltered = cardioPool.filter(
          (ex) =>
            ex.name.toLowerCase().includes("fractionné") || ex.name.toLowerCase().includes("hiit"),
        );
      }

      if (cardioFiltered.length > 0) {
        const cardioEx = cardioFiltered[Math.floor(Math.random() * cardioFiltered.length)];
        exercises.unshift(templateToExercise(cardioEx, tier, deload));
      }
    }

    // Durée ajustée pour le deload
    const duration = Math.round(splitDay.durationMin * (deload ? 0.7 : 1));

    days.push({
      key: WEEKDAY_KEYS[i],
      day: WEEKDAY_NAMES[i],
      title: deload ? `Deload — ${dayFocusTitle(splitDay.focus)}` : dayFocusTitle(splitDay.focus),
      type: dayFocusToType(splitDay.focus),
      emoji: deload ? "🧘" : dayFocusEmoji(splitDay.focus),
      summary: deload
        ? `Semaine de récupération — volume réduit (${splitDay.primaryMuscles.join(", ")})`
        : splitDay.primaryMuscles.join(" · "),
      duration,
      warmup: DEFAULT_WARMUPS[splitDay.focus] ?? DEFAULT_WARMUPS.push,
      blocks: [
        {
          title: "Bloc principal",
          items: exercises,
        },
      ],
      alternatives: deload
        ? ["Réduire le volume si fatigue persistante", "Maintenir la technique"]
        : undefined,
    });
  }

  return days;
}

// ── Plan généré ──────────────────────────────────────────────────────────────

export interface GeneratedPlan {
  version: number;
  generatedAt: string;
  goalId: GoalId;
  tier: Tier;
  nutrition: GeneratedNutrition;
  days: DayProgram[];
  splitId: string;
  isDeload?: boolean;
  trainingTime?: "morning" | "evening";
}

/**
 * Génère le plan complet du profil :
 * 1. Calcul BMR → TDEE (profil + activité)
 * 2. Ajustement kcal + macros selon objectif (avec garde-fous santé)
 * 3. Détermination du split selon disponibilité + niveau
 * 4. Filtrage du pool d'exercices selon équipement
 * 5. Sélection des exercices selon niveau + objectif + split
 * 6. Calcul du volume/intensité/repos selon niveau + objectif
 * 7. Détermination de la durée du bloc (8-12+ semaines)
 * 8. Génération du programme final (séances + nutrition)
 */
export function generatePlan(p: Profile): GeneratedPlan {
  const tier = computeTier(p.level, p.capacities);
  const trainingDays = p.trainingDays ?? DEFAULT_TRAINING_DAYS;
  const split = selectSplit(trainingDays.length, p.level);
  const week = currentProgramWeek(p);

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    goalId: normalizeGoal(p.goal),
    tier,
    nutrition: computeNutrition(p),
    days: generateDynamicDays(p, tier, split, trainingDays, week),
    splitId: split.id,
    isDeload: isDeloadWeek(p, week),
    trainingTime: p.trainingTime,
  };
}

// ── Jours d'entraînement choisis par l'utilisateur ───────────────────────────

/** Indices des jours dans le plan : 0 = Lundi … 6 = Dimanche. */
export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
export const DEFAULT_TRAINING_DAYS = [0, 1, 2, 3, 4, 5]; // Lun → Sam (6 jours)

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

/**
 * Les 7 jours du plan de l'utilisateur (généré si dispo, sinon seed standard),
 * avec les jours non choisis transformés en repos + deload appliqué si applicable.
 */
export function planDays(
  p?: Pick<Profile, "plan" | "trainingDays" | "level" | "startDate"> | null,
): DayProgram[] {
  const days = p?.plan?.days;
  const base = Array.isArray(days) && days.length === 7 ? days : PROGRAM;
  const withTrainingDays = applyTrainingDays(base, p?.trainingDays);

  // Appliquer le deload si la semaine courante est une semaine de deload
  if (p && p.level && p.startDate) {
    const week = currentProgramWeek(p);
    if (isDeloadWeek(p, week)) {
      const tier = computeTier(p.level);
      return withTrainingDays.map((d) => (d.type === "rest" ? d : scaleDay(d, 1, true)));
    }
  }

  return withTrainingDays;
}

/** Nombre de séances réellement planifiées dans la semaine (hors repos). */
export function plannedSessionsPerWeek(
  p: Pick<Profile, "plan" | "trainingDays" | "daysPerWeek" | "level" | "startDate">,
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

// ── Cycle & semaine de programme ─────────────────────────────────────────────

/**
 * Cycles infinis de 12 semaines : l'app ne plafonne plus à S12.
 * S13 → Cycle 2 · Semaine 1, S25 → Cycle 3 · Semaine 1… (tests toutes les 4 semaines).
 */
export function programCycle(profile: Pick<Profile, "startDate">): {
  totalWeek: number;
  cycle: number;
  cycleWeek: number;
} {
  if (!profile.startDate) return { totalWeek: 1, cycle: 1, cycleWeek: 1 };
  const start = new Date(profile.startDate).getTime();
  const totalWeek = Math.max(1, Math.floor((Date.now() - start) / (7 * 864e5)) + 1);
  const cycle = Math.floor((totalWeek - 1) / 12) + 1;
  const cycleWeek = ((totalWeek - 1) % 12) + 1;
  return { totalWeek, cycle, cycleWeek };
}

/** Semaine dans le cycle courant (1-12). */
export function currentProgramWeek(profile: Pick<Profile, "startDate">): number {
  return programCycle(profile).cycleWeek;
}

export function isTestWeek(profile: Pick<Profile, "startDate">): boolean {
  const w = currentProgramWeek(profile);
  return w % 4 === 0;
}

/**
 * Durée du bloc en semaines selon le niveau.
 * - Débutant : 8 semaines
 * - Intermédiaire : 10-12 semaines
 * - Avancé : 12+ semaines avec deload
 */
export function getBlockDuration(level: Profile["level"]): number {
  if (level === "débutant") return 8;
  if (level === "intermédiaire") return 12;
  return 16; // avancé : 12+ avec deload
}
