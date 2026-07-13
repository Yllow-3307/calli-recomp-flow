export type ExerciseKind = "reps" | "time" | "distance";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  target: string; // ex: "6-8 reps", "30s", "5x2min"
  rest: number; // seconds
  kind: ExerciseKind;
  note?: string;
}

export interface WorkoutBlock {
  title: string;
  items: Exercise[];
}

export interface DayProgram {
  key: string;
  day: string; // Lundi etc
  title: string;
  type: "running" | "push" | "pull" | "legs" | "recovery" | "rest";
  emoji: string;
  summary: string;
  duration: number; // min
  warmup: string[];
  blocks: WorkoutBlock[];
  alternatives?: string[];
}

const ex = (
  id: string,
  name: string,
  sets: number,
  target: string,
  rest: number,
  kind: ExerciseKind = "reps",
  note?: string,
): Exercise => ({ id, name, sets, target, rest, kind, note });

export const PROGRAM: DayProgram[] = [
  {
    key: "mon",
    day: "Lundi",
    title: "Running Zone 2 + Core",
    type: "running",
    emoji: "🏃",
    summary: "6–7 km allure conversation + core léger",
    duration: 55,
    warmup: ["Mobilité chevilles/hanches 5 min", "Marche rapide 3 min"],
    blocks: [
      {
        title: "Course",
        items: [ex("run-z2", "Course Zone 2", 1, "6–7 km", 0, "distance", "Allure conversation, FC 130–145")],
      },
      {
        title: "Core léger",
        items: [
          ex("plank", "Gainage planche", 3, "45s", 45, "time"),
          ex("side-plank", "Gainage latéral", 3, "30s/côté", 30, "time"),
          ex("deadbug", "Dead bug", 3, "10 reps", 30, "reps"),
        ],
      },
    ],
    alternatives: ["Rameur 30–40 min steady", "Piscine 30 min crawl"],
  },
  {
    key: "tue",
    day: "Mardi",
    title: "PUSH avancé + HSPU prep",
    type: "push",
    emoji: "💪",
    summary: "Push PPL + préparation Handstand Push-up",
    duration: 65,
    warmup: ["Rotations épaules 2 min", "Cat-cow 1 min", "Pompes lentes 2×8"],
    blocks: [
      {
        title: "HSPU Prep",
        items: [
          ex("pike-push", "Pike push-up", 4, "6–8 reps", 90),
          ex("wall-hs", "Wall handstand hold", 3, "30–45s", 60, "time"),
          ex("neg-hspu", "HSPU négatives (mur)", 3, "3–4 reps lentes", 120, "reps", "Descente 5s"),
        ],
      },
      {
        title: "Push PPL",
        items: [
          ex("dips", "Dips lestés", 4, "6–8 reps", 90),
          ex("push-ups", "Pompes archer", 3, "6/côté", 75),
          ex("db-press", "Développé militaire haltères", 3, "8–10 reps", 75),
          ex("tri-ext", "Extensions triceps", 3, "10–12 reps", 60),
        ],
      },
    ],
  },
  {
    key: "wed",
    day: "Mercredi",
    title: "Fractionné 6 km",
    type: "running",
    emoji: "⚡",
    summary: "5×2 min rapide / 90s récup",
    duration: 45,
    warmup: ["Course lente 1 km", "Talons-fesses / montées de genoux 2 min"],
    blocks: [
      {
        title: "Intervalles",
        items: [
          ex("intervals", "5×2 min rapide / 90s récup", 5, "2 min max / 90s récup", 90, "time", "Effort 8/10"),
          ex("cooldown", "Retour au calme", 1, "1 km lent", 0, "distance"),
        ],
      },
    ],
    alternatives: ["Rameur HIIT 30s max / 60s récup × 8–10", "Piscine intervalles"],
  },
  {
    key: "thu",
    day: "Jeudi",
    title: "PULL + Muscle-up prep",
    type: "pull",
    emoji: "🎯",
    summary: "Pull PPL + préparation Muscle-up",
    duration: 65,
    warmup: ["Scapular pulls 2×10", "Dead hang 30s", "Band pull-apart 2×15"],
    blocks: [
      {
        title: "Muscle-up Prep",
        items: [
          ex("high-pull", "Tractions explosives", 4, "3–5 reps", 120, "reps", "Toucher poitrine"),
          ex("false-grip", "Dead hang false grip", 3, "20–30s", 90, "time"),
          ex("transition", "Transitions bande", 3, "3–5 reps", 120),
        ],
      },
      {
        title: "Pull PPL",
        items: [
          ex("pull-ups", "Tractions lestées", 4, "5–7 reps", 120),
          ex("rows", "Rowing inversé", 3, "8–10 reps", 75),
          ex("curls", "Curls haltères", 3, "10–12 reps", 60),
          ex("face-pull", "Face pull bande", 3, "12–15 reps", 45),
        ],
      },
    ],
  },
  {
    key: "fri",
    day: "Vendredi",
    title: "Zone 2 récup + Fessiers/Mollets",
    type: "running",
    emoji: "🌿",
    summary: "6 km facile + pont fessier + mollets",
    duration: 50,
    warmup: ["Mobilité hanches 4 min"],
    blocks: [
      {
        title: "Course",
        items: [ex("z2-easy", "Course Zone 2 facile", 1, "6 km", 0, "distance")],
      },
      {
        title: "Complément",
        items: [
          ex("glute-bridge", "Pont fessier", 3, "15 reps", 45),
          ex("calf-raise", "Mollets debout", 4, "15–20 reps", 45),
          ex("hip-thrust", "Hip thrust unilatéral", 3, "10/côté", 60),
        ],
      },
    ],
    alternatives: ["Vélo 30–40 min", "Piscine 25 min"],
  },
  {
    key: "sat",
    day: "Samedi",
    title: "LEGS + Skills",
    type: "legs",
    emoji: "🤸",
    summary: "Jambes + handstand, flags, dragon flag",
    duration: 75,
    warmup: ["Squats sans poids 2×15", "Fentes marchées 2×10", "Mobilité poignets"],
    blocks: [
      {
        title: "Skills",
        items: [
          ex("handstand", "Handstand hold libre / mur", 5, "20–40s", 90, "time"),
          ex("hspu-wall", "HSPU au mur", 4, "3–5 reps", 120),
          ex("tuck-flag", "Tuck flag", 4, "10–15s", 90, "time"),
          ex("dragon-flag", "Dragon flag", 4, "5–8 reps", 90),
        ],
      },
      {
        title: "Legs",
        items: [
          ex("pistol", "Pistol squats", 4, "5–6/côté", 90),
          ex("bulgarian", "Bulgarian split squat", 3, "8/côté", 75),
          ex("nordic", "Nordic hamstring", 3, "5–8 reps", 90),
          ex("jump-squat", "Jump squats", 3, "10 reps", 60),
        ],
      },
    ],
  },
  {
    key: "sun",
    day: "Dimanche",
    title: "Repos actif",
    type: "rest",
    emoji: "🧘",
    summary: "Marche légère optionnelle + mobilité",
    duration: 20,
    warmup: [],
    blocks: [
      {
        title: "Optionnel",
        items: [
          ex("walk", "Marche légère", 1, "30–45 min", 0, "time"),
          ex("mobility", "Routine mobilité complète", 1, "15 min", 0, "time"),
        ],
      },
    ],
  },
];

export const RULES = [
  "Protéines : 1,8–2,2 g/kg de poids corporel",
  "Eau : 3–4 L par jour",
  "Sommeil : 7–8 h minimum",
  "Progression : +1–2 reps ou +temps par semaine",
  "Test des skills toutes les 4 semaines",
  "Filmer les mouvements complexes",
];

export const PROGRESS_TESTS = [
  { id: "pushups", name: "Pompes max", unit: "reps" },
  { id: "pullups", name: "Tractions max", unit: "reps" },
  { id: "handstand", name: "Handstand tenu", unit: "s" },
  { id: "hspu", name: "HSPU max", unit: "reps" },
  { id: "muscleup", name: "Muscle-up", unit: "reps" },
  { id: "tuckflag", name: "Tuck flag", unit: "s" },
  { id: "dragonflag", name: "Dragon flag", unit: "reps" },
  { id: "lsit", name: "L-sit", unit: "s" },
  { id: "run5k", name: "5 km course", unit: "min" },
];

export function getTodayProgram(fiveDays = false): DayProgram {
  const dow = new Date().getDay(); // 0=dim
  const map = [6, 0, 1, 2, 3, 4, 5]; // dim,lun,mar...
  let program = PROGRAM[map[dow]];
  if (fiveDays && (program.key === "fri" || program.key === "wed")) {
    // still return it; option handling is at settings level
  }
  return program;
}

export function programByKey(key: string) {
  return PROGRAM.find((d) => d.key === key);
}
