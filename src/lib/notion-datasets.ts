// ─────────────────────────────────────────────────────────────────────────────
// Jeux de données Notion V5 — catalogue de champs + moteur d'agrégats.
// Chaque jeu produit des lignes « par période » (jour / semaine / mois) ou par
// élément (mesure / test), prêtes à être associées aux colonnes Notion de
// n'importe quel utilisateur via l'écran de correspondance.
// ─────────────────────────────────────────────────────────────────────────────
import type { BodyMetric, CardioLog, MealLog, Profile, ProgressTest, WorkoutLog } from "./store";
import { nutritionTargets, plannedSessionsPerWeek } from "./plan";
import { PROGRESS_TESTS, programByKey } from "./program";
import { EXPORT_WINDOW_DAYS } from "./exporter";

/** Sous-ensemble du store nécessaire à la synchro Notion. */
export interface NotionStateSlice {
  profile: Profile;
  workouts: WorkoutLog[];
  cardio: CardioLog[];
  meals: MealLog[];
  metrics: BodyMetric[];
  tests: ProgressTest[];
}

export type NotionDatasetKind = "seances" | "hebdo" | "macros" | "mensuel" | "mesures" | "tests";
export type FieldKind = "text" | "number" | "date" | "select" | "checkbox";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** requis pour retrouver/mettre à jour la ligne (clé d'upsert) */
  required?: boolean;
  /** mots-clés pour pré-remplir la correspondance avec tes colonnes */
  hints?: string[];
}

export interface DatasetDef {
  kind: NotionDatasetKind;
  label: string;
  emoji: string;
  /** date = une ligne par jour/semaine/mois (retrouvée par la date) ; uid = anti-doublon par colonne ID */
  upsertBy: "date" | "uid";
  fields: FieldDef[];
}

/** Types de colonnes Notion compatibles avec chaque kind de champ. */
export const COMPAT: Record<FieldKind, string[]> = {
  date: ["date"],
  number: ["number"],
  text: ["rich_text"],
  select: ["select", "rich_text"],
  checkbox: ["checkbox"],
};

export const NOTION_DATASETS: Record<NotionDatasetKind, DatasetDef> = {
  seances: {
    kind: "seances",
    label: "Séances du jour",
    emoji: "🏋️",
    upsertBy: "date",
    fields: [
      { key: "date", label: "Date du jour", kind: "date", required: true, hints: ["date", "jour"] },
      { key: "type_seance", label: "Type de séance", kind: "text", hints: ["type"] },
      { key: "duree_min", label: "Durée totale (min)", kind: "number", hints: ["duree", "dur"] },
      { key: "km", label: "Course — distance (km)", kind: "number", hints: ["km", "distance"] },
      {
        key: "chrono_min",
        label: "Course — chrono (min)",
        kind: "number",
        hints: ["chrono", "temps"],
      },
      { key: "allure", label: "Course — allure (/km)", kind: "text", hints: ["allure", "pace"] },
      {
        key: "pompes",
        label: "Pompes — meilleure série",
        kind: "number",
        hints: ["pompe", "push"],
      },
      {
        key: "tractions",
        label: "Tractions — meilleure série",
        kind: "number",
        hints: ["traction", "pull"],
      },
      { key: "dips", label: "Dips — meilleure série", kind: "number", hints: ["dip"] },
      {
        key: "squats",
        label: "Squats — meilleure série",
        kind: "number",
        hints: ["squat", "fente"],
      },
      {
        key: "gainage_s",
        label: "Gainage — max (s)",
        kind: "number",
        hints: ["gainage", "planche", "core"],
      },
      {
        key: "seance_faite",
        label: "Séance faite (case à cocher)",
        kind: "checkbox",
        hints: ["fait", "done", "check"],
      },
      { key: "resume", label: "Résumé (texte)", kind: "text", hints: ["resume", "recap", "note"] },
    ],
  },
  hebdo: {
    kind: "hebdo",
    label: "Résumé hebdo",
    emoji: "📆",
    upsertBy: "date",
    fields: [
      {
        key: "date",
        label: "Lundi de la semaine (date)",
        kind: "date",
        required: true,
        hints: ["date", "semaine"],
      },
      { key: "seances_faites", label: "Séances faites (nb)", kind: "number", hints: ["seance"] },
      {
        key: "seances_prevues",
        label: "Séances prévues (nb)",
        kind: "number",
        hints: ["prevu", "planifie", "cible"],
      },
      { key: "km", label: "Km courus", kind: "number", hints: ["km"] },
      { key: "duree_totale_min", label: "Durée totale (min)", kind: "number", hints: ["duree"] },
      {
        key: "kcal_moy",
        label: "Kcal moyennes / jour",
        kind: "number",
        hints: ["kcal", "calorie"],
      },
      { key: "resume", label: "Résumé (texte)", kind: "text", hints: ["resume", "note"] },
    ],
  },
  macros: {
    kind: "macros",
    label: "Macros du jour",
    emoji: "🍽️",
    upsertBy: "date",
    fields: [
      { key: "date", label: "Date du jour", kind: "date", required: true, hints: ["date", "jour"] },
      { key: "kcal", label: "Calories (kcal)", kind: "number", hints: ["kcal", "calorie"] },
      { key: "prot_g", label: "Protéines (g)", kind: "number", hints: ["prot"] },
      { key: "gluc_g", label: "Glucides (g)", kind: "number", hints: ["gluc", "carb"] },
      { key: "lip_g", label: "Lipides (g)", kind: "number", hints: ["lip", "graiss", "fat"] },
      {
        key: "kcal_cible",
        label: "Cible kcal",
        kind: "number",
        hints: ["cible kcal", "kcal cible", "objectif kcal"],
      },
      { key: "prot_cible", label: "Cible protéines (g)", kind: "number", hints: ["cible prot"] },
      { key: "gluc_cible", label: "Cible glucides (g)", kind: "number", hints: ["cible gluc"] },
      { key: "lip_cible", label: "Cible lipides (g)", kind: "number", hints: ["cible lip"] },
      { key: "ecart_kcal", label: "Écart kcal (réel − cible)", kind: "number", hints: ["ecart"] },
      { key: "resume", label: "Résumé (texte)", kind: "text", hints: ["resume", "stat", "recap"] },
    ],
  },
  mensuel: {
    kind: "mensuel",
    label: "Résumé mensuel",
    emoji: "🗓️",
    upsertBy: "date",
    fields: [
      {
        key: "date",
        label: "1er du mois (date)",
        kind: "date",
        required: true,
        hints: ["date", "mois"],
      },
      {
        key: "poids_debut_kg",
        label: "Poids début de mois (kg)",
        kind: "number",
        hints: ["debut"],
      },
      { key: "poids_fin_kg", label: "Poids fin de mois (kg)", kind: "number", hints: ["fin"] },
      { key: "kcal_cible", label: "Kcal cible", kind: "number", hints: ["cible"] },
      { key: "kcal_moy", label: "Kcal moyennes (conso)", kind: "number", hints: ["moyen"] },
      { key: "prot_moy_g", label: "Protéines moyennes (g)", kind: "number", hints: ["prot"] },
      { key: "rigueur_pct", label: "Rigueur (%)", kind: "number", hints: ["rigueur", "assidu"] },
      { key: "seances_faites", label: "Séances faites (nb)", kind: "number", hints: ["seance"] },
      { key: "km", label: "Km courus", kind: "number", hints: ["km"] },
    ],
  },
  mesures: {
    kind: "mesures",
    label: "Mesures (poids…)",
    emoji: "⚖️",
    upsertBy: "date",
    fields: [
      { key: "date", label: "Date", kind: "date", required: true, hints: ["date"] },
      { key: "poids_kg", label: "Poids (kg)", kind: "number", hints: ["poids"] },
      { key: "tour_taille_cm", label: "Tour de taille (cm)", kind: "number", hints: ["taille"] },
      { key: "sommeil_h", label: "Sommeil (h)", kind: "number", hints: ["sommeil"] },
      { key: "energie_5", label: "Énergie (/5)", kind: "number", hints: ["energie"] },
      { key: "fatigue_5", label: "Fatigue (/5)", kind: "number", hints: ["fatigue"] },
      { key: "note", label: "Note (texte)", kind: "text", hints: ["note"] },
    ],
  },
  tests: {
    kind: "tests",
    label: "Tests & skills",
    emoji: "🏆",
    upsertBy: "uid",
    fields: [
      { key: "date", label: "Date", kind: "date", required: true, hints: ["date"] },
      {
        key: "uid",
        label: "ID anti-doublons (texte)",
        kind: "text",
        required: true,
        hints: ["id app", "identifiant"],
      },
      { key: "test", label: "Test (nom)", kind: "text", hints: ["test", "exercice"] },
      { key: "valeur", label: "Valeur", kind: "number", hints: ["valeur", "resultat", "score"] },
      { key: "unite", label: "Unité", kind: "text", hints: ["unite"] },
    ],
  },
};

export const DATASET_ORDER: NotionDatasetKind[] = [
  "seances",
  "hebdo",
  "macros",
  "mensuel",
  "mesures",
  "tests",
];

/** Ligne prête pour Notion : clé d'upsert + date de titre + champs mappables. */
export interface NotionRow {
  /** jour yyyy-mm-dd / lundi / 1er du mois / uid (tests) */
  key: string;
  /** date utilisée pour le titre en mention « @… » et le champ date */
  dateISO: string;
  /** titre texte de repli (style « texte ») */
  title: string;
  /** suffixe ajouté après la mention date (ex. nom du test) */
  titleSuffix?: string;
  fields: Record<string, string | number | boolean | null>;
}

// ── Helpers dates (locales, sans piège de fuseau) ────────────────────────────

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const fmtLocalDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const atNoon = (day: string) => new Date(`${day}T12:00:00`);
const dayOf = (iso: string) => iso.slice(0, 10);

export function windowStartDay(): string {
  const d = new Date();
  d.setDate(d.getDate() - EXPORT_WINDOW_DAYS);
  return fmtLocalDay(d);
}

function mondayOf(day: string): string {
  const d = atNoon(day);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fmtLocalDay(d);
}

function addDays(day: string, n: number): string {
  const d = atNoon(day);
  d.setDate(d.getDate() + n);
  return fmtLocalDay(d);
}

const frDay = (day: string) =>
  atNoon(day).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const frShort = (day: string) =>
  atNoon(day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

// ── Heuristiques sportives (meilleure série du jour par famille d'exos) ──────

const EXO_KEYWORDS = {
  pompes: ["pompe", "push"],
  tractions: ["traction", "pull", "chin"],
  dips: ["dip"],
  squats: ["squat", "fente"],
  gainage: ["gainage", "planche", "hollow", "plank"],
} as const;

function bestSetOf(workouts: WorkoutLog[], family: keyof typeof EXO_KEYWORDS): number | null {
  const time = family === "gainage";
  let best: number | null = null;
  for (const w of workouts)
    for (const e of w.exercises) {
      if (e.kind !== (time ? "time" : "reps")) continue;
      const n = norm(e.name);
      if (!EXO_KEYWORDS[family].some((k) => n.includes(k))) continue;
      for (const s of e.sets) {
        if (!s.done) continue;
        const v = time ? s.time : s.reps;
        if (typeof v === "number" && v > 0 && (best === null || v > best)) best = v;
      }
    }
  return best;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Agrégat « Séances du jour » (muscu + cardio fusionnés par jour) ──────────

function buildSeances(state: NotionStateSlice): NotionRow[] {
  const start = windowStartDay();
  const workoutsByDay = new Map<string, WorkoutLog[]>();
  const cardioByDay = new Map<string, CardioLog[]>();
  for (const w of state.workouts) {
    const d = dayOf(w.date);
    if (d < start) continue;
    workoutsByDay.set(d, [...(workoutsByDay.get(d) ?? []), w]);
  }
  for (const c of state.cardio) {
    const d = dayOf(c.date);
    if (d < start) continue;
    cardioByDay.set(d, [...(cardioByDay.get(d) ?? []), c]);
  }
  const days = [...new Set([...workoutsByDay.keys(), ...cardioByDay.keys()])].sort();

  return days.map((d) => {
    const ws = workoutsByDay.get(d) ?? [];
    const cs = cardioByDay.get(d) ?? [];
    const runs = cs.filter((c) => c.type === "course");

    const kmSum = runs.reduce((a, c) => a + (c.distance ?? 0), 0);
    const chronoSum = runs.reduce((a, c) => a + c.duration, 0);
    const paces = runs
      .filter((c) => (c.distance ?? 0) > 0)
      .map((c) => c.duration / (c.distance as number));
    const p = paces.length ? Math.min(...paces) : null;
    const allure =
      p !== null ? `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, "0")}` : null;

    const duree = Math.round(
      ws.reduce((a, w) => a + w.duration, 0) + cs.reduce((a, c) => a + c.duration, 0),
    );

    const types = new Set<string>();
    for (const w of ws) {
      const t = programByKey(w.dayKey)?.type;
      if (t === "running") types.add("Course");
      else if (t && t !== "rest") types.add(`Muscu — ${w.dayTitle || t}`);
      else types.add(w.dayTitle || "Séance");
    }
    if (runs.length) types.add("Course");
    cs.filter((c) => c.type !== "course").forEach((c) => types.add(c.type));

    const parts: string[] = [];
    for (const w of ws)
      for (const e of w.exercises) {
        const done = e.sets.filter((s) => s.done);
        if (!done.length) continue;
        const vals = done
          .map((s) => (e.kind === "time" ? s.time : s.reps))
          .filter((v): v is number => typeof v === "number" && v > 0);
        if (!vals.length) {
          parts.push(e.name);
          continue;
        }
        const suffix = e.kind === "time" ? "s" : "";
        const uniform = vals.every((v) => v === vals[0]);
        const perf = uniform
          ? `${vals.length}×${vals[0]}${suffix}`
          : vals.map((v) => `${v}${suffix}`).join("/");
        parts.push(`${e.name} ${perf}`);
      }
    for (const run of runs)
      parts.push(
        `Course ${run.distance ? `${r2(run.distance)} km en ` : ""}${Math.round(run.duration)} min`,
      );

    return {
      key: d,
      dateISO: d,
      title: frDay(d),
      fields: {
        date: d,
        type_seance: [...types].join(" + ") || null,
        duree_min: duree || null,
        km: kmSum > 0 ? r2(kmSum) : null,
        chrono_min: runs.length ? Math.round(chronoSum * 10) / 10 : null,
        allure,
        pompes: bestSetOf(ws, "pompes"),
        tractions: bestSetOf(ws, "tractions"),
        dips: bestSetOf(ws, "dips"),
        squats: bestSetOf(ws, "squats"),
        gainage_s: bestSetOf(ws, "gainage"),
        seance_faite: true,
        resume: parts.join(" · ").slice(0, 1800) || null,
      },
    };
  });
}

// ── Agrégat « Résumé hebdo » (semaines chevauchant la fenêtre) ───────────────

function buildHebdo(state: NotionStateSlice): NotionRow[] {
  const mondays = new Set<string>();
  for (let i = 0; i <= EXPORT_WINDOW_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    mondays.add(mondayOf(fmtLocalDay(d)));
  }
  const planned = plannedSessionsPerWeek(state.profile);

  const rows: NotionRow[] = [];
  for (const m of [...mondays].sort()) {
    const end = addDays(m, 6);
    const inWeek = (iso: string) => {
      const dd = dayOf(iso);
      return dd >= m && dd <= end;
    };
    const sessions =
      state.workouts.filter((w) => inWeek(w.date)).length +
      state.cardio.filter((c) => inWeek(c.date)).length;
    const km = r2(
      state.cardio
        .filter((c) => c.type === "course" && inWeek(c.date))
        .reduce((a, c) => a + (c.distance ?? 0), 0),
    );
    const duree = Math.round(
      state.workouts.filter((w) => inWeek(w.date)).reduce((a, w) => a + w.duration, 0) +
        state.cardio.filter((c) => inWeek(c.date)).reduce((a, c) => a + c.duration, 0),
    );
    const meals = state.meals.filter((x) => inWeek(x.date));
    const mealDays = new Set(meals.map((x) => dayOf(x.date))).size;
    const kcalMoy = mealDays ? Math.round(meals.reduce((a, x) => a + x.kcal, 0) / mealDays) : null;

    if (!sessions && !mealDays) continue; // semaine vide → pas de ligne

    rows.push({
      key: m,
      dateISO: m,
      title: `Semaine du ${frShort(m)}`,
      fields: {
        date: m,
        seances_faites: sessions || null,
        seances_prevues: planned,
        km: km > 0 ? km : null,
        duree_totale_min: duree || null,
        kcal_moy: kcalMoy,
        resume: `${sessions} séance(s)${km > 0 ? ` · ${km} km` : ""}${kcalMoy ? ` · 🔥 ${kcalMoy} kcal/j` : ""}`,
      },
    });
  }
  return rows;
}

// ── Agrégat « Macros du jour » (totaux + cibles recalculées du plan) ─────────

function buildMacros(state: NotionStateSlice): NotionRow[] {
  const start = windowStartDay();
  const t = nutritionTargets(state.profile);
  const protCible = Math.round((t.proteinMin + t.proteinMax) / 2);

  const byDay = new Map<string, MealLog[]>();
  for (const m of state.meals) {
    const d = dayOf(m.date);
    if (d < start) continue;
    byDay.set(d, [...(byDay.get(d) ?? []), m]);
  }

  return [...byDay.keys()].sort().map((d) => {
    const ms = byDay.get(d) ?? [];
    const kcal = Math.round(ms.reduce((a, x) => a + x.kcal, 0));
    const p = Math.round(ms.reduce((a, x) => a + x.protein, 0));
    const g = Math.round(ms.reduce((a, x) => a + x.carbs, 0));
    const l = Math.round(ms.reduce((a, x) => a + x.fat, 0));
    return {
      key: d,
      dateISO: d,
      title: frDay(d),
      fields: {
        date: d,
        kcal,
        prot_g: p,
        gluc_g: g,
        lip_g: l,
        kcal_cible: t.kcalTarget,
        prot_cible: protCible,
        gluc_cible: t.carbsTarget,
        lip_cible: t.fatTarget,
        ecart_kcal: kcal - t.kcalTarget,
        resume: `🔥 ${kcal} kcal · P ${p} g · G ${g} g · L ${l} g`,
      },
    };
  });
}

// ── Agrégat « Résumé mensuel » (poids début/fin, moyennes, rigueur) ──────────

function buildMensuel(state: NotionStateSlice): NotionRow[] {
  const starts = new Set<string>();
  for (let i = 0; i <= EXPORT_WINDOW_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    starts.add(fmtLocalDay(d).slice(0, 8) + "01");
  }
  const t = nutritionTargets(state.profile);

  const rows: NotionRow[] = [];
  for (const m of [...starts].sort()) {
    const next = addDays(m, 32).slice(0, 8) + "01"; // 1er du mois suivant
    const inMonth = (iso: string) => {
      const dd = dayOf(iso);
      return dd >= m && dd < next;
    };

    const weights = state.metrics
      .filter((x) => typeof x.weight === "number" && inMonth(x.date))
      .sort((a, b) => a.date.localeCompare(b.date));
    const meals = state.meals.filter((x) => inMonth(x.date));
    const days = new Set(meals.map((x) => dayOf(x.date)));
    const kcalMoy = days.size
      ? Math.round(meals.reduce((a, x) => a + x.kcal, 0) / days.size)
      : null;
    const protMoy = days.size
      ? Math.round(meals.reduce((a, x) => a + x.protein, 0) / days.size)
      : null;

    // Rigueur : % de jours logués dans ±10 % de la cible
    let rigueur: number | null = null;
    if (days.size) {
      let ok = 0;
      for (const d of days) {
        const sum = meals.filter((x) => dayOf(x.date) === d).reduce((a, x) => a + x.kcal, 0);
        if (Math.abs(sum - t.kcalTarget) <= t.kcalTarget * 0.1) ok++;
      }
      rigueur = Math.round((ok / days.size) * 100);
    }

    const sessions =
      state.workouts.filter((w) => inMonth(w.date)).length +
      state.cardio.filter((c) => inMonth(c.date)).length;
    const km = r2(
      state.cardio
        .filter((c) => c.type === "course" && inMonth(c.date))
        .reduce((a, c) => a + (c.distance ?? 0), 0),
    );

    if (!weights.length && !days.size && !sessions) continue; // mois vide

    rows.push({
      key: m,
      dateISO: m,
      title: atNoon(m).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      fields: {
        date: m,
        poids_debut_kg: weights.length ? (weights[0].weight ?? null) : null,
        poids_fin_kg: weights.length ? (weights[weights.length - 1].weight ?? null) : null,
        kcal_cible: t.kcalTarget,
        kcal_moy: kcalMoy,
        prot_moy_g: protMoy,
        rigueur_pct: rigueur,
        seances_faites: sessions || null,
        km: km > 0 ? km : null,
      },
    });
  }
  return rows;
}

// ── Mesures & tests (1 ligne par élément, fenêtre 14 jours) ──────────────────

function buildMesures(state: NotionStateSlice): NotionRow[] {
  const start = windowStartDay();
  return state.metrics
    .filter((m) => dayOf(m.date) >= start)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => {
      const d = dayOf(m.date);
      return {
        key: d,
        dateISO: d,
        title: `Mesures du ${frShort(d)}`,
        fields: {
          date: d,
          poids_kg: m.weight ?? null,
          tour_taille_cm: m.waist ?? null,
          sommeil_h: m.sleep ?? null,
          energie_5: m.energy ?? null,
          fatigue_5: m.fatigue ?? null,
          note: m.photoNote?.trim() || null,
        },
      };
    });
}

function buildTests(state: NotionStateSlice): NotionRow[] {
  const start = windowStartDay();
  return state.tests
    .filter((t) => dayOf(t.date) >= start)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const def = PROGRESS_TESTS.find((x) => x.id === t.testId);
      const d = dayOf(t.date);
      return {
        key: t.id, // uid stable → anti-doublons via colonne ID
        dateISO: d,
        title: `${def?.name ?? t.testId} — ${frShort(d)}`,
        titleSuffix: ` · ${def?.name ?? t.testId}`,
        fields: {
          date: d,
          test: def?.name ?? t.testId,
          valeur: t.value,
          unite: def?.unit ?? "",
        },
      };
    });
}

/** Construit les 6 jeux de données (fenêtre glissante de 14 jours). */
export function buildNotionRows(state: NotionStateSlice): Record<NotionDatasetKind, NotionRow[]> {
  return {
    seances: buildSeances(state),
    hebdo: buildHebdo(state),
    macros: buildMacros(state),
    mensuel: buildMensuel(state),
    mesures: buildMesures(state),
    tests: buildTests(state),
  };
}

/** Pré-remplit la correspondance champ → colonne (hints + type compatible). */
export function guessProperty(
  props: { name: string; type: string }[],
  field: FieldDef,
): string | null {
  const cands = props.filter((p) => p.type !== "title" && COMPAT[field.kind].includes(p.type));
  if (!cands.length) return null;
  for (const h of field.hints ?? []) {
    const hit = cands.find((p) => norm(p.name).includes(norm(h)));
    if (hit) return hit.name;
  }
  // Sans hint : ne pré-remplir une date que si une seule colonne date existe.
  return field.kind === "date" && cands.length === 1 ? cands[0].name : null;
}

// ── Détection automatique du jeu de données (V7) ─────────────────────────────
// Plus besoin de choisir une « template » : on devine le type de la base grâce
// aux noms de ses colonnes (hints des champs) et à son nom (bonus titre).

/** Bonus quand le NOM de la base contient un mot-clé (ex. « Suivi hebdo »). */
const TITLE_HINTS: Partial<Record<NotionDatasetKind, string[]>> = {
  hebdo: ["hebdo", "semaine", "weekly"],
  mensuel: ["mensuel", "mois", "month"],
  macros: ["macro", "kcal", "calorie", "nutrition", "bouffe"],
  tests: ["test", "skill"],
  mesures: ["mesure", "poids", "mensuration"],
  seances: ["seance", "sport", "training", "workout", "muscu"],
};

export function detectDataset(
  props: { name: string; type: string }[],
  baseTitle: string,
): { dataset: NotionDatasetKind; score: number; confident: boolean } {
  const cols = props.map((p) => norm(p.name));
  const title = norm(baseTitle);
  let best: NotionDatasetKind = "seances";
  let bestScore = -1;

  for (const kind of DATASET_ORDER) {
    let score = 0;
    // +1 par mot-clé distinct trouvé dans une colonne de la base
    const hitHints = new Set<string>();
    for (const f of NOTION_DATASETS[kind].fields)
      for (const h of f.hints ?? []) {
        if (hitHints.has(h)) continue;
        if (cols.some((c) => c.includes(norm(h)))) {
          hitHints.add(h);
          score++;
        }
      }
    // +2 si le nom de la base contient un indice
    if ((TITLE_HINTS[kind] ?? []).some((h) => title.includes(norm(h)))) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = kind;
    }
  }
  return { dataset: best, score: bestScore, confident: bestScore >= 3 };
}
