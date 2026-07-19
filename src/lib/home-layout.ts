// ─────────────────────────────────────────────────────────────────────────────
// Accueil personnalisable (V8) — modèle de disposition.
// Le contenu de l'accueil est décrit par des sections (comme dans Paramètres)
// contenant des blocs. Sauvegardé dans le profil (colonne home_layout) → la
// disposition suit l'utilisateur sur tous ses appareils.
// ─────────────────────────────────────────────────────────────────────────────
import { generateUUID } from "./store";

export type HomeBlockKind =
  "seance" | "nutrition" | "regles" | "liens" | "bilan" | "cycle" | "testsBanner";

export interface HomeBlockMeta {
  kind: HomeBlockKind;
  label: string;
  /** largeur initiale sur desktop (1 à 3 colonnes) */
  defaultSpan: 1 | 2 | 3;
}

export const HOME_BLOCKS: Record<HomeBlockKind, HomeBlockMeta> = {
  seance: { kind: "seance", label: "🏋️ Séance du jour", defaultSpan: 2 },
  nutrition: { kind: "nutrition", label: "🥩 Protéines & eau", defaultSpan: 1 },
  regles: { kind: "regles", label: "📜 Règles d'or", defaultSpan: 2 },
  liens: { kind: "liens", label: "🔗 Liens rapides", defaultSpan: 1 },
  bilan: { kind: "bilan", label: "📅 Bilan de la semaine", defaultSpan: 3 },
  cycle: { kind: "cycle", label: "🏁 Fin de cycle", defaultSpan: 3 },
  testsBanner: { kind: "testsBanner", label: "🎯 Bannière semaine de test", defaultSpan: 3 },
};

export interface HomeBlockInstance {
  kind: HomeBlockKind;
  span: 1 | 2 | 3;
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

/** Valeur stockée (JSONB) → disposition valide. Vide/invalide = disposition par défaut. */
export function normalizeHomeLayout(raw: unknown): HomeSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultHomeLayout();
  const used = new Set<HomeBlockKind>();
  const sections: HomeSection[] = [];
  for (const s of raw as { id?: unknown; title?: unknown; blocks?: unknown }[]) {
    if (!s || !Array.isArray(s.blocks)) continue;
    const blocks: HomeBlockInstance[] = [];
    for (const b of s.blocks as { kind?: unknown; span?: unknown }[]) {
      const kind = String(b.kind) as HomeBlockKind;
      if (!KINDS.includes(kind) || used.has(kind)) continue; // 1 instance par bloc max
      used.add(kind);
      const span = b.span === 2 || b.span === 3 ? b.span : 1;
      blocks.push({ kind, span });
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
