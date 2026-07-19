// ─────────────────────────────────────────────────────────────────────────────
// Statut automatique d'un skill à partir de la dernière valeur testée.
// Partagé entre la page Skills et les blocs « Skills » de l'accueil (V9).
// ─────────────────────────────────────────────────────────────────────────────

export type SkillStatus = "non commencé" | "en cours" | "proche" | "validé";

export function computeAutoStatus(skillId: string, latestValue: number | undefined): SkillStatus {
  if (latestValue === undefined || latestValue === null || latestValue === 0) {
    return "non commencé";
  }

  switch (skillId) {
    case "handstand":
      if (latestValue < 25) return "en cours";
      return "validé";
    case "hspu":
      if (latestValue < 4) return "en cours";
      if (latestValue >= 5) return "validé";
      return "proche";
    case "muscleup":
      if (latestValue < 1) return "en cours";
      if (latestValue >= 5) return "validé";
      return "proche";
    case "tuckflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validé";
      return "proche";
    case "dragonflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validé";
      return "proche";
    case "lsit":
      if (latestValue < 12) return "en cours";
      if (latestValue < 25) return "proche";
      return "validé";
    default:
      return "en cours";
  }
}

export const SKILL_STATUS_META: Record<SkillStatus, { emoji: string; label: string }> = {
  "non commencé": { emoji: "⬜", label: "Non commencé" },
  "en cours": { emoji: "🔄", label: "En cours" },
  proche: { emoji: "🟠", label: "Proche" },
  validé: { emoji: "✅", label: "Validé" },
};
