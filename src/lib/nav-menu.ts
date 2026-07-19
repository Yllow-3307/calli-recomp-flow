// ─────────────────────────────────────────────────────────────────────────────
// Barre de menu mobile personnalisable (V9).
// « Accueil » et « Plus » sont fixes ; l'utilisateur en choisit 3 (sauvegardé
// dans profiles.nav_menus), le reste se range automatiquement dans « Plus ».
// ─────────────────────────────────────────────────────────────────────────────
import {
  Dumbbell,
  Apple,
  TrendingUp,
  CalendarDays,
  History,
  Trophy,
  Ruler,
  Settings,
} from "lucide-react";

export const NAV_CANDIDATES = [
  {
    id: "seance",
    to: "/seance",
    label: "Séance",
    icon: Dumbbell,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "nutrition",
    to: "/nutrition",
    label: "Nutrition",
    icon: Apple,
    color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
  },
  {
    id: "progression",
    to: "/progression",
    label: "Progrès",
    icon: TrendingUp,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "programme",
    to: "/programme",
    label: "Programme",
    icon: CalendarDays,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "historique",
    to: "/historique",
    label: "Historique",
    icon: History,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  },
  {
    id: "skills",
    to: "/skills",
    label: "Skills",
    icon: Trophy,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "mesures",
    to: "/mesures",
    label: "Mesures",
    icon: Ruler,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "parametres",
    to: "/parametres",
    label: "Paramètres",
    icon: Settings,
    color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
] as const;

export const DEFAULT_NAV_PICKS: string[] = ["seance", "nutrition", "progression"];
export const MAX_NAV_PICKS = 3;

/** Choix sauvegardés → 1 à 3 ids valides, dans l'ordre canonique. */
export function normalizeNavPicks(raw: unknown): string[] {
  const saved = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  const valid = NAV_CANDIDATES.filter((c) => saved.includes(c.id)).map((c) => c.id);
  return valid.length ? valid.slice(0, MAX_NAV_PICKS) : DEFAULT_NAV_PICKS;
}
