// ─────────────────────────────────────────────────────────────────────────────
// Accueil personnalisable (V8/V9) — modèle de disposition.
// Le contenu de l'accueil est décrit par des sections (comme dans Paramètres)
// contenant des blocs. Sauvegardé dans le profil (colonne home_layout) → la
// disposition suit l'utilisateur sur tous ses appareils.
// ─────────────────────────────────────────────────────────────────────────────
import { generateUUID } from "./store";

export type HomeBlockKind =
  | "seance"
  | "nutrition"
  | "regles"
  | "liens"
  | "bilan"
  | "cycle"
  | "testsBanner"
  | "kcal"
  | "glucides"
  | "lipides"
  | "skills"
  | "skill"
  | "syncData"
  | "mesures"
  | "musique";

export interface HomeBlockMeta {
  kind: HomeBlockKind;
  label: string;
  /** largeur initiale sur desktop (1 à 3 colonnes) */
  defaultSpan: 1 | 2 | 3;
  /** le bloc peut exister en plusieurs exemplaires (identifiés par refId) */
  multi?: boolean;
  /** description affichée dans le sélecteur « + » */
  hint?: string;
}

export const HOME_BLOCKS: Record<HomeBlockKind, HomeBlockMeta> = {
  seance: { kind: "seance", label: "🏋️ Séance du jour", defaultSpan: 2 },
  nutrition: { kind: "nutrition", label: "🥩 Protéines & eau", defaultSpan: 1 },
  regles: { kind: "regles", label: "📜 Règles d'or", defaultSpan: 2 },
  liens: { kind: "liens", label: "🔗 Liens rapides", defaultSpan: 1 },
  bilan: { kind: "bilan", label: "📅 Bilan de la semaine", defaultSpan: 3 },
  cycle: { kind: "cycle", label: "🏁 Fin de cycle", defaultSpan: 3 },
  testsBanner: { kind: "testsBanner", label: "🎯 Bannière semaine de test", defaultSpan: 3 },
  kcal: {
    kind: "kcal",
    label: "🔥 Kcal du jour",
    defaultSpan: 1,
    hint: "Calories mangées aujourd'hui vs objectif",
  },
  glucides: {
    kind: "glucides",
    label: "🍞 Glucides du jour",
    defaultSpan: 1,
    hint: "Glucides du jour vs objectif",
  },
  lipides: {
    kind: "lipides",
    label: "🥑 Lipides du jour",
    defaultSpan: 1,
    hint: "Lipides du jour vs objectif",
  },
  skills: {
    kind: "skills",
    label: "🏆 Mes skills",
    defaultSpan: 1,
    hint: "Vue d'ensemble de tes skills (statuts)",
  },
  skill: {
    kind: "skill",
    label: "🎯 Un skill",
    defaultSpan: 1,
    multi: true,
    hint: "Carte d'un skill précis (niveau + record)",
  },
  syncData: {
    kind: "syncData",
    label: "🔄 Synchroniser mes données",
    defaultSpan: 1,
    hint: "Bouton de synchro Notion depuis l'accueil",
  },
  mesures: {
    kind: "mesures",
    label: "📏 Mes mesures",
    defaultSpan: 1,
    hint: "Dernier poids, tour de taille, sommeil",
  },
  musique: {
    kind: "musique",
    label: "🎵 Musique",
    defaultSpan: 2,
    hint: "Bloc musique (contenu à venir en V10)",
  },
};

export interface HomeBlockInstance {
  kind: HomeBlockKind;
  span: 1 | 2 | 3;
  /** identifiant de référence (ex : skill.id) pour les blocs « multi » */
  refId?: string;
}

export interface HomeSection {
  id: string;
  title: string; // "" = sans titre affiché (comme Aujourd'hui actuel)
  blocks: HomeBlockInstance[];
}

/** Disposition par défaut = la page V7 (mémo hero + bandeau semaine restent fixes). */
export function defaultHomeLayout(): HomeSection[] {
  return [
    {
      id: "haut",
      title: "",
      blocks: [
        { kind: "cycle", span: 3 },
        { kind: "testsBanner", span: 3 },
        { kind: "bilan", span: 3 },
      ],
    },
    {
      id: "principal",
      title: "",
      blocks: [
        { kind: "seance", span: 2 },
        { kind: "nutrition", span: 1 },
        { kind: "regles", span: 2 },
        { kind: "liens", span: 1 },
      ],
    },
  ];
}

const KINDS = Object.keys(HOME_BLOCKS);

/** Clé d'unicité d'un bloc dans la disposition (les blocs multi se distinguent par refId). */
export const blockKeyOf = (b: HomeBlockInstance) => `${b.kind}|${b.refId ?? ""}`;

/** Valeur stockée (JSONB) → disposition valide. Vide/invalide = disposition par défaut. */
export function normalizeHomeLayout(raw: unknown): HomeSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultHomeLayout();
  const used = new Set<string>();
  const sections: HomeSection[] = [];
  for (const s of raw as { id?: unknown; title?: unknown; blocks?: unknown }[]) {
    if (!s || !Array.isArray(s.blocks)) continue;
    const blocks: HomeBlockInstance[] = [];
    for (const b of s.blocks as { kind?: unknown; span?: unknown; refId?: unknown }[]) {
      const kind = String(b.kind) as HomeBlockKind;
      if (!KINDS.includes(kind)) continue;
      const refId = typeof b.refId === "string" && b.refId ? b.refId.slice(0, 40) : undefined;
      const key = `${kind}|${refId ?? ""}`;
      // 1 instance max par bloc ; les blocs « multi » (ex. un skill précis) se
      // distinguent par leur refId dans la clé.
      if (used.has(key)) continue;
      used.add(key);
      const span = b.span === 2 || b.span === 3 ? b.span : 1;
      blocks.push(refId ? { kind, span, refId } : { kind, span });
    }
    sections.push({
      id: typeof s.id === "string" && s.id ? s.id : generateUUID(),
      title: typeof s.title === "string" ? s.title.slice(0, 40) : "",
      blocks,
    });
  }
  // Blocs "manquants" = retirés par l'utilisateur → on respecte son choix,
  // on ne les réinjecte PAS (il peut toujours les rajouter via « ➕ Ajouter »).
  if (!sections.length) return defaultHomeLayout();
  return sections;
}
