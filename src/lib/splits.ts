// ─────────────────────────────────────────────────────────────────────────────
// Templates de splits dynamiques — Calli Recomp
//
// Le split est choisi en fonction du nombre de jours disponibles ET du niveau.
// Chaque split définit :
//   - le pattern hebdomadaire (quel type de journée à quel jour)
//   - les groupes musculaires ciblés par jour
//   - le nombre d'exercices par catégorie
//   - la durée cible par séance
//
// Le moteur de génération utilise ces templates pour assembler le programme
// à partir du pool d'exercices taggés (exercise-pool.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { EquipmentTag } from "./exercise-pool";

export type SplitTypeId = "full-body" | "upper-lower" | "push-pull-legs" | "skills-focused";

export type DayFocus =
  "push" | "pull" | "legs" | "core" | "cardio" | "skill" | "full-body" | "rest" | "recovery";

export interface SplitDayTemplate {
  /** Index dans la semaine (0 = lundi, 6 = dimanche) */
  dayIndex: number;
  focus: DayFocus;
  /** Groupes musculaires prioritaires ce jour */
  primaryMuscles: string[];
  /** Nombre d'exercices à sélectionner par catégorie */
  exerciseCount: Partial<Record<"push" | "pull" | "legs" | "core" | "skill", number>>;
  /** Durée cible en minutes */
  durationMin: number;
  /** Type de cardio optionnel (si applicable) */
  cardio?: "zone2" | "intervals" | "recovery" | "none";
}

export interface SplitTemplate {
  id: SplitTypeId;
  name: string;
  description: string;
  /** Nombre de jours d'entraînement par semaine */
  daysPerWeek: number;
  /** Jours de repos (index 0-6) */
  restDays: number[];
  /** Pattern hebdomadaire */
  days: SplitDayTemplate[];
  /** Durée totale hebdo estimée */
  weeklyVolume: "low" | "moderate" | "high";
  /** Adapté aux niveaux */
  suitableFor: ("débutant" | "intermédiaire" | "avancé")[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates de splits
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full Body — 2 à 3 jours
 * Tous les groupes musculaires à chaque séance, volume modéré.
 * Idéal pour les débutants ou ceux avec peu de disponibilité.
 */
export const FULL_BODY_SPLIT: SplitTemplate = {
  id: "full-body",
  name: "Full Body",
  description: "Tous les groupes à chaque séance — volume modéré, récupération optimale",
  daysPerWeek: 3,
  restDays: [3, 5, 6], // Mercredi, Vendredi, Dimanche
  weeklyVolume: "low",
  suitableFor: ["débutant", "intermédiaire", "avancé"],
  days: [
    {
      dayIndex: 0, // Lundi
      focus: "full-body",
      primaryMuscles: ["pectoraux", "dos", "quadriceps", "fessiers", "épaules"],
      exerciseCount: { push: 2, pull: 2, legs: 2, core: 1 },
      durationMin: 45,
      cardio: "none",
    },
    {
      dayIndex: 2, // Mercredi
      focus: "full-body",
      primaryMuscles: ["pectoraux", "dos", "quadriceps", "fessiers", "épaules"],
      exerciseCount: { push: 2, pull: 2, legs: 2, core: 1 },
      durationMin: 45,
      cardio: "none",
    },
    {
      dayIndex: 4, // Vendredi
      focus: "full-body",
      primaryMuscles: ["pectoraux", "dos", "quadriceps", "fessiers", "épaules"],
      exerciseCount: { push: 2, pull: 2, legs: 2, core: 1 },
      durationMin: 45,
      cardio: "none",
    },
  ],
};

/**
 * Upper/Lower — 4 jours
 * Sépare les jours "push+pull" (haut du corps) des jours "jambes".
 * Bon équilibre volume/intensité.
 */
export const UPPER_LOWER_SPLIT: SplitTemplate = {
  id: "upper-lower",
  name: "Upper/Lower",
  description: "Haut corps / Jambes alternés — bon équilibre volume/récupération",
  daysPerWeek: 4,
  restDays: [2, 4, 6], // Mercredi, Vendredi, Dimanche
  weeklyVolume: "moderate",
  suitableFor: ["débutant", "intermédiaire", "avancé"],
  days: [
    {
      dayIndex: 0, // Lundi
      focus: "push",
      primaryMuscles: ["pectoraux", "épaules", "triceps"],
      exerciseCount: { push: 3, core: 1 },
      durationMin: 50,
      cardio: "none",
    },
    {
      dayIndex: 1, // Mardi
      focus: "pull",
      primaryMuscles: ["dos", "biceps", "avant-bras"],
      exerciseCount: { pull: 3, core: 1 },
      durationMin: 50,
      cardio: "none",
    },
    {
      dayIndex: 3, // Jeudi
      focus: "legs",
      primaryMuscles: ["quadriceps", "ischios", "fessiers", "mollets"],
      exerciseCount: { legs: 4, core: 1 },
      durationMin: 50,
      cardio: "none",
    },
    {
      dayIndex: 5, // Samedi
      focus: "full-body",
      primaryMuscles: ["pectoraux", "dos", "quadriceps", "fessiers"],
      exerciseCount: { push: 2, pull: 2, legs: 2, core: 1 },
      durationMin: 50,
      cardio: "none",
    },
  ],
};

/**
 * Push/Pull/Legs — 5 jours
 * Split classique avec un jour de skills dédié.
 * Volume élevé, nécessite une bonne récupération.
 */
export const PPL_SPLIT: SplitTemplate = {
  id: "push-pull-legs",
  name: "Push/Pull/Legs + Skills",
  description: "Split classique avec un jour skills dédié — volume élevé",
  daysPerWeek: 5,
  restDays: [2, 4, 6], // Mercredi, Vendredi, Dimanche
  weeklyVolume: "high",
  suitableFor: ["intermédiaire", "avancé"],
  days: [
    {
      dayIndex: 0, // Lundi
      focus: "push",
      primaryMuscles: ["pectoraux", "épaules", "triceps"],
      exerciseCount: { push: 4, core: 1 },
      durationMin: 55,
      cardio: "none",
    },
    {
      dayIndex: 1, // Mardi
      focus: "pull",
      primaryMuscles: ["dos", "biceps", "avant-bras"],
      exerciseCount: { pull: 4, core: 1 },
      durationMin: 55,
      cardio: "none",
    },
    {
      dayIndex: 3, // Jeudi
      focus: "legs",
      primaryMuscles: ["quadriceps", "ischios", "fessiers", "mollets"],
      exerciseCount: { legs: 5, core: 1 },
      durationMin: 60,
      cardio: "none",
    },
    {
      dayIndex: 4, // Vendredi
      focus: "cardio",
      primaryMuscles: ["cardio"],
      exerciseCount: { core: 1 },
      durationMin: 45,
      cardio: "zone2",
    },
    {
      dayIndex: 5, // Samedi
      focus: "skill",
      primaryMuscles: ["épaules", "obliques", "abdos", "dos", "pectoraux"],
      exerciseCount: { skill: 4, core: 1 },
      durationMin: 55,
      cardio: "none",
    },
  ],
};

/**
 * 6 jours — Split complet + cardio + skills
 * Maximise le volume pour les athlètes avancés.
 */
export const SIX_DAY_SPLIT: SplitTemplate = {
  id: "push-pull-legs",
  name: "Split complet (6j)",
  description: "PPL + cardio + skills — volume maximal pour athlètes avancés",
  daysPerWeek: 6,
  restDays: [6], // Dimanche
  weeklyVolume: "high",
  suitableFor: ["intermédiaire", "avancé"],
  days: [
    {
      dayIndex: 0, // Lundi
      focus: "cardio",
      primaryMuscles: ["cardio"],
      exerciseCount: { core: 1 },
      durationMin: 50,
      cardio: "zone2",
    },
    {
      dayIndex: 1, // Mardi
      focus: "push",
      primaryMuscles: ["pectoraux", "épaules", "triceps"],
      exerciseCount: { push: 4, core: 1 },
      durationMin: 55,
      cardio: "none",
    },
    {
      dayIndex: 2, // Mercredi
      focus: "cardio",
      primaryMuscles: ["cardio"],
      exerciseCount: { legs: 1 },
      durationMin: 50,
      cardio: "intervals",
    },
    {
      dayIndex: 3, // Jeudi
      focus: "pull",
      primaryMuscles: ["dos", "biceps", "avant-bras"],
      exerciseCount: { pull: 4, core: 1 },
      durationMin: 55,
      cardio: "none",
    },
    {
      dayIndex: 4, // Vendredi
      focus: "cardio",
      primaryMuscles: ["cardio", "jambes"],
      exerciseCount: { core: 1, legs: 1 },
      durationMin: 50,
      cardio: "zone2",
    },
    {
      dayIndex: 5, // Samedi
      focus: "skill",
      primaryMuscles: ["épaules", "obliques", "abdos", "jambes"],
      exerciseCount: { skill: 3, legs: 2, core: 1 },
      durationMin: 60,
      cardio: "none",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sélection du split
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_SPLITS: SplitTemplate[] = [
  FULL_BODY_SPLIT,
  UPPER_LOWER_SPLIT,
  PPL_SPLIT,
  SIX_DAY_SPLIT,
];

/**
 * Sélectionne le split approprié selon le nombre de jours disponibles
 * et le niveau de l'utilisateur.
 *
 * Règles :
 * - 2-3 jours → Full Body (tous niveaux)
 * - 4 jours → Upper/Lower (tous niveaux)
 * - 5 jours → PPL + Skills (intermédiaire+)
 * - 6 jours → Split complet (intermédiaire+)
 * - Débutant avec 5-6 jours → Upper/Lower (volume plus modéré)
 */
export function selectSplit(
  trainingDays: number,
  level: "débutant" | "intermédiaire" | "avancé",
): SplitTemplate {
  // Débutant : pas de split PPL, volume plus modéré
  if (level === "débutant" && trainingDays >= 5) {
    return UPPER_LOWER_SPLIT;
  }

  if (trainingDays <= 3) return FULL_BODY_SPLIT;
  if (trainingDays === 4) return UPPER_LOWER_SPLIT;
  if (trainingDays === 5) return PPL_SPLIT;
  return SIX_DAY_SPLIT;
}

/**
 * Retourne les jours d'entraînement sous forme de pattern hebdomadaire.
 * Les jours non entraînés deviennent des jours de repos.
 */
export function getTrainingPattern(
  split: SplitTemplate,
  trainingDays: number[],
): { dayIndex: number; focus: DayFocus; isRest: boolean }[] {
  const pattern: { dayIndex: number; focus: DayFocus; isRest: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const splitDay = split.days.find((d) => d.dayIndex === i);
    if (splitDay && trainingDays.includes(i)) {
      pattern.push({ dayIndex: i, focus: splitDay.focus, isRest: false });
    } else {
      pattern.push({ dayIndex: i, focus: "rest", isRest: true });
    }
  }
  return pattern;
}

/**
 * Mappe un focus de jour vers le type de séance pour l'affichage.
 */
export function dayFocusToType(
  focus: DayFocus,
): "running" | "push" | "pull" | "legs" | "recovery" | "rest" {
  switch (focus) {
    case "push":
      return "push";
    case "pull":
      return "pull";
    case "legs":
      return "legs";
    case "cardio":
      return "running";
    case "skill":
      return "recovery";
    case "full-body":
      return "push"; // affichage neutre
    case "core":
      return "recovery";
    case "rest":
      return "rest";
    case "recovery":
      return "recovery";
    default:
      return "rest";
  }
}

/**
 * Emoji pour un type de jour.
 */
export function dayFocusEmoji(focus: DayFocus): string {
  switch (focus) {
    case "push":
      return "💪";
    case "pull":
      return "🎯";
    case "legs":
      return "🦵";
    case "cardio":
      return "🏃";
    case "skill":
      return "🤸";
    case "full-body":
      return "🔥";
    case "core":
      return "⚡";
    case "rest":
      return "🧘";
    case "recovery":
      return "🌿";
    default:
      return "🔥";
  }
}

/**
 * Titre lisible pour un jour de split.
 */
export function dayFocusTitle(focus: DayFocus): string {
  switch (focus) {
    case "push":
      return "PUSH — Pectoraux, Épaules, Triceps";
    case "pull":
      return "PULL — Dos, Biceps, Avant-bras";
    case "legs":
      return "LEGS — Quadriceps, Ischio, Fessiers, Mollets";
    case "cardio":
      return "Cardio Zone 2";
    case "skill":
      return "Skills — Handstand, Flags, Muscle-up";
    case "full-body":
      return "Full Body — Tous les groupes";
    case "core":
      return "Core & Stabilisation";
    case "rest":
      return "Repos complet";
    case "recovery":
      return "Récupération active";
    default:
      return "Séance";
  }
}
