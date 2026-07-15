import seed from "./programme_seed.json";

export type ExerciseKind = "reps" | "time" | "distance";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  target: string;
  targetMin?: number;
  targetMax?: number;
  rest: number;
  kind: ExerciseKind;
  note?: string;
}

export interface WorkoutBlock {
  title: string;
  items: Exercise[];
}

export interface DayProgram {
  key: string;
  day: string;
  title: string;
  type: "running" | "push" | "pull" | "legs" | "recovery" | "rest";
  emoji: string;
  summary: string;
  duration: number;
  warmup: string[];
  blocks: WorkoutBlock[];
  alternatives?: string[];
  finisher?: string;
}

type Range = number | [number, number];

function fmtRange(r: Range | undefined): string {
  if (r === undefined) return "";
  if (Array.isArray(r)) return r[0] === r[1] ? `${r[0]}` : `${r[0]}-${r[1]}`;
  return `${r}`;
}

function pickMax(r: Range | undefined, fallback = 3): number {
  if (r === undefined) return fallback;
  if (Array.isArray(r)) return r[1];
  return r;
}

function pickMin(r: Range | undefined): number | undefined {
  if (r === undefined) return undefined;
  if (Array.isArray(r)) return r[0];
  return r;
}

function slugify(s: string, i: number): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) + `-${i}`
  );
}

interface RawEx {
  name: string;
  sets?: Range;
  reps?: Range;
  repsPerLeg?: Range;
  repsPerSide?: Range;
  seconds?: Range;
  restSeconds?: number;
  progression?: string;
  alternative?: string;
  optional?: boolean;
}

function buildExercise(raw: RawEx, i: number): Exercise {
  const sets = pickMax(raw.sets, 3);
  const rest = raw.restSeconds ?? 60;
  let target = "";
  let kind: ExerciseKind = "reps";
  let targetMin: number | undefined;
  let targetMax: number | undefined;
  if (raw.seconds !== undefined) {
    target = `${fmtRange(raw.seconds)}s`;
    kind = "time";
    targetMin = pickMin(raw.seconds);
    targetMax = pickMax(raw.seconds);
  } else if (raw.repsPerLeg !== undefined) {
    target = `${fmtRange(raw.repsPerLeg)} reps/jambe`;
    targetMin = pickMin(raw.repsPerLeg);
    targetMax = pickMax(raw.repsPerLeg);
  } else if (raw.repsPerSide !== undefined) {
    target = `${fmtRange(raw.repsPerSide)} reps/côté`;
    targetMin = pickMin(raw.repsPerSide);
    targetMax = pickMax(raw.repsPerSide);
  } else if (raw.reps !== undefined) {
    target = `${fmtRange(raw.reps)} reps`;
    targetMin = pickMin(raw.reps);
    targetMax = pickMax(raw.reps);
  } else {
    target = "—";
  }
  const noteParts: string[] = [];
  if (raw.progression) noteParts.push(`Progression : ${raw.progression}`);
  if (raw.alternative) noteParts.push(`Alt : ${raw.alternative}`);
  if (raw.optional) noteParts.push("Optionnel");
  return {
    id: slugify(raw.name, i),
    name: raw.name,
    sets,
    target,
    targetMin,
    targetMax,
    rest,
    kind,
    note: noteParts.length ? noteParts.join(" • ") : undefined,
  };
}

interface RawDay {
  day: string;
  type: string;
  title: string;
  durationMin?: [number, number] | number;
  objective?: string;
  focus?: string[];
  warmup?: string[];
  cardio?: { sport: string; distanceKm?: Range; intensity?: string; intervals?: string };
  exercises?: RawEx[];
  alternatives?: string[];
  progression?: string;
  optionalFinisher?: string;
  instructions?: string[];
}

const DAY_META: Record<string, { key: string; emoji: string; type: DayProgram["type"] }> = {
  Lundi: { key: "mon", emoji: "🏃", type: "running" },
  Mardi: { key: "tue", emoji: "💪", type: "push" },
  Mercredi: { key: "wed", emoji: "⚡", type: "running" },
  Jeudi: { key: "thu", emoji: "🎯", type: "pull" },
  Vendredi: { key: "fri", emoji: "🌿", type: "running" },
  Samedi: { key: "sat", emoji: "🤸", type: "legs" },
  Dimanche: { key: "sun", emoji: "🧘", type: "rest" },
};

function buildDay(raw: RawDay): DayProgram {
  const meta = DAY_META[raw.day] ?? {
    key: raw.day.slice(0, 3).toLowerCase(),
    emoji: "🔥",
    type: "push" as const,
  };
  const duration = Array.isArray(raw.durationMin)
    ? Math.round((raw.durationMin[0] + raw.durationMin[1]) / 2)
    : (raw.durationMin ?? 45);

  const blocks: WorkoutBlock[] = [];

  if (raw.cardio) {
    const items: Exercise[] = [];
    const c = raw.cardio;
    if (c.intervals) {
      items.push({
        id: `cardio-int-${meta.key}`,
        name: `Fractionné ${c.sport}`,
        sets: 1,
        target: c.intervals,
        rest: 0,
        kind: "time",
        note: c.distanceKm ? `Distance visée : ${fmtRange(c.distanceKm)} km` : undefined,
      });
    } else {
      items.push({
        id: `cardio-${meta.key}`,
        name: `${c.sport.charAt(0).toUpperCase() + c.sport.slice(1)} ${c.intensity ?? ""}`.trim(),
        sets: 1,
        target: c.distanceKm ? `${fmtRange(c.distanceKm)} km` : "—",
        rest: 0,
        kind: "distance",
        note: c.intensity,
      });
    }
    blocks.push({ title: "Cardio", items });
  }

  if (raw.exercises?.length) {
    blocks.push({
      title: raw.focus?.length ? `Bloc principal — ${raw.focus.join(" · ")}` : "Bloc principal",
      items: raw.exercises.map((e, i) => buildExercise(e, i)),
    });
  }

  if (raw.instructions?.length) {
    blocks.push({
      title: "Consignes",
      items: raw.instructions.map((txt, i) => ({
        id: `inst-${meta.key}-${i}`,
        name: txt,
        sets: 1,
        target: "—",
        rest: 0,
        kind: "time" as ExerciseKind,
      })),
    });
  }

  return {
    key: meta.key,
    day: raw.day,
    title: raw.title,
    type: meta.type,
    emoji: meta.emoji,
    summary: raw.objective ?? raw.focus?.join(" · ") ?? raw.title,
    duration,
    warmup: raw.warmup ?? [],
    blocks,
    alternatives: raw.alternatives,
    finisher: raw.optionalFinisher,
  };
}

interface Seed {
  goldenRules: string[];
  nutritionTargets: {
    protein_g_per_kg: [number, number];
    calories: string;
    macroSplit: string;
    water_l_per_day: [number, number];
    mealExamples: string[];
  };
  weeklyPlan: RawDay[];
  progressionTable: {
    exercise: string;
    start: string;
    month1: string;
    month2: string;
    month3: string;
  }[];
  progressionRules: string[];
}

const SEED = seed as unknown as Seed;

export const PROGRAM: DayProgram[] = SEED.weeklyPlan.map(buildDay);
export const RULES = SEED.goldenRules;
export const NUTRITION = SEED.nutritionTargets;
export const PROGRESSION_TABLE = SEED.progressionTable;
export const PROGRESSION_RULES = SEED.progressionRules;

export interface ProgressTestType {
  id: string;
  name: string;
  unit: string;
  isSkill?: boolean;
}

export const PROGRESS_TESTS: ProgressTestType[] = [
  { id: "handstand", name: "Handstand", unit: "s", isSkill: true },
  { id: "hspu", name: "HSPU", unit: "reps", isSkill: true },
  { id: "muscleup", name: "Muscle-up", unit: "reps", isSkill: true },
  { id: "tuckflag", name: "Tuck flag", unit: "s", isSkill: true },
  { id: "dragonflag", name: "Dragon flag", unit: "reps", isSkill: true },
  { id: "lsit", name: "L-sit", unit: "s", isSkill: true },
  { id: "pushups", name: "Pompes max", unit: "reps" },
  { id: "pullups", name: "Tractions max", unit: "reps" },
  { id: "run5k", name: "5 km course", unit: "min" },
];

export const MEAL_TEMPLATES = [
  { name: "Œufs + avoine + fruits", kcal: 550, protein: 32, carbs: 65, fat: 18 },
  { name: "Poulet + riz + légumes", kcal: 620, protein: 48, carbs: 70, fat: 14 },
  { name: "Shake whey + banane", kcal: 320, protein: 30, carbs: 40, fat: 5 },
  { name: "Poisson + patate douce + salade", kcal: 580, protein: 42, carbs: 55, fat: 18 },
];

export function getTodayProgram(_fiveDays = false): DayProgram {
  const dow = new Date().getDay();
  const map = [6, 0, 1, 2, 3, 4, 5];
  return PROGRAM[map[dow]];
}

export function programByKey(key: string) {
  return PROGRAM.find((d) => d.key === key);
}

export interface SkillGuide {
  id: string;
  name: string;
  start: string;
  month1: string;
  month2: string;
  month3: string;
  defaultNotes: string;
  matchingExercises: string[];
  unit: string;
  month1Val: number;
  month3Val: number;
}

export const SKILLS_GUIDE: SkillGuide[] = [
  {
    id: "handstand",
    name: "Handstand",
    start: "5 secondes au mur",
    month1: "25 secondes au mur",
    month2: "30 secondes / début libre",
    month3: "Libre 10 secondes+",
    unit: "s",
    month1Val: 25,
    month3Val: 10,
    defaultNotes:
      "Rappels techniques : Alignement poignets-épaules-hanches, repousser activement le sol, serrer fessiers et abdos (pas de cambrure), se filmer régulièrement.",
    matchingExercises: ["Handstand libre", "Handstand au mur", "Handstand"],
  },
  {
    id: "hspu",
    name: "HSPU",
    start: "Pike push-up",
    month1: "Négatifs au mur",
    month2: "HSPU au mur ×5",
    month3: "HSPU libre",
    unit: "reps",
    month1Val: 4,
    month3Val: 1,
    defaultNotes:
      "Rappels techniques : Trajectoire en trépied (mains et tête forment un triangle), garder les coudes orientés vers l'arrière (pas sur les côtés), amplitude complète.",
    matchingExercises: ["Pike push-up lesté", "HSPU négatif mur", "HSPU au mur", "Pike push-up"],
  },
  {
    id: "muscleup",
    name: "Muscle-up",
    start: "0 rep",
    month1: "Transitions",
    month2: "Muscle-up avec bande ×5",
    month3: "1 muscle-up strict",
    unit: "reps",
    month1Val: 1,
    month3Val: 1,
    defaultNotes:
      "Rappels techniques : Tirage explosif vers les hanches (chest-to-bar), transition rapide des poignets au-dessus de la barre, gainage complet pour éviter le kipping excessif.",
    matchingExercises: [
      "Tractions explosives",
      "Chest-to-bar",
      "Transition muscle-up bande",
      "Australian rows",
      "Muscle-up",
      "Tractions strictes",
    ],
  },
  {
    id: "tuckflag",
    name: "Tuck flag",
    start: "Planche latérale 30s",
    month1: "Tuck flag",
    month2: "Advanced tuck",
    month3: "Full flag",
    unit: "s",
    month1Val: 5,
    month3Val: 5,
    defaultNotes:
      "Rappels techniques : Bras du bas repousse activement le support, bras du haut tire fort, maintenir l'alignement des hanches sans vriller, gainage oblique intense.",
    matchingExercises: ["Tuck flag", "Planche latérale lestée", "Planche latérale"],
  },
  {
    id: "dragonflag",
    name: "Dragon flag",
    start: "3×3 reps",
    month1: "3×5 reps",
    month2: "3×8 reps",
    month3: "3×10+ reps",
    unit: "reps",
    month1Val: 5,
    month3Val: 10,
    defaultNotes:
      "Rappels techniques : Seuls les épaules et le haut du dos touchent le banc/support, alignement parfait corps-jambes tendues, descente lente et contrôlée.",
    matchingExercises: ["Dragon flag"],
  },
  {
    id: "lsit",
    name: "L-sit",
    start: "5 secondes",
    month1: "12 secondes",
    month2: "20 secondes",
    month3: "25 secondes+",
    unit: "s",
    month1Val: 12,
    month3Val: 25,
    defaultNotes:
      "Rappels techniques : Épaules basses (dépression scapulaire), jambes parfaitement verrouillées et tendues, lever les hanches légèrement vers l'avant, compression abdominale.",
    matchingExercises: ["L-sit progression", "L-sit", "Relevés de jambes suspendus"],
  },
];
