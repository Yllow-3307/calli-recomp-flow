// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Statut automatique d'un skill Ã  partir de la derniÃ¨re valeur testÃ©e.
// PartagÃ© entre la page Skills et les blocs Â« Skills Â» de l'accueil (V9).
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type SkillStatus = "non commencÃ©" | "en cours" | "proche" | "validÃ©";

export function computeAutoStatus(skillId: string, latestValue: number | undefined): SkillStatus {
  if (latestValue === undefined || latestValue === null || latestValue === 0) {
    return "non commencÃ©";
  }

  switch (skillId) {
    case "handstand":
      if (latestValue < 25) return "en cours";
      return "validÃ©";
    case "hspu":
      if (latestValue < 4) return "en cours";
      if (latestValue >= 5) return "validÃ©";
      return "proche";
    case "muscleup":
      if (latestValue < 1) return "en cours";
      if (latestValue >= 5) return "validÃ©";
      return "proche";
    case "tuckflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validÃ©";
      return "proche";
    case "dragonflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validÃ©";
      return "proche";
    case "lsit":
      if (latestValue < 12) return "en cours";
      if (latestValue < 25) return "proche";
      return "validÃ©";
    default:
      return "en cours";
  }
}

export const SKILL_STATUS_META: Record<SkillStatus, { emoji: string; label: string }> = {
  "non commencÃ©": { emoji: "â¬œ", label: "Non commencÃ©" },
  "en cours": { emoji: "ðŸ”„", label: "En cours" },
  proche: { emoji: "ðŸŸ ", label: "Proche" },
  validÃ©: { emoji: "âœ…", label: "ValidÃ©" },
};