// ─────────────────────────────────────────────────────────────────────────────
// Helper : parsing des tags stockés dans workout_sessions.notes (JSON).
// Format: {"t":["💪","🔥"],"n":"bonne séance"}
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionTags {
  tags: string[];
  note: string;
}

/** Parse le champ notes d'une séance (peut être du JSON ou du texte simple). */
export function parseSessionNotes(notes: string | null | undefined): SessionTags {
  if (!notes) return { tags: [], note: "" };
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.t)) {
      return { tags: parsed.t as string[], note: parsed.n ?? "" };
    }
  } catch {
    // Ce n'est pas du JSON, c'est une note texte simple (legacy)
  }
  return { tags: [], note: notes };
}

/** Encode tags + note en JSON pour stockage dans workout_sessions.notes. */
export function encodeSessionTags(tags: string[], note: string): string {
  return JSON.stringify({ t: tags, n: note });
}

/** Tags disponibles dans le sélecteur. */
export const SESSION_TAGS = [
  { emoji: "💪", label: "Bonne séance" },
  { emoji: "🔥", label: "Intense" },
  { emoji: "🏆", label: "Record" },
  { emoji: "😮‍💨", label: "Dur" },
  { emoji: "🤕", label: "Blessure" },
  { emoji: "🫶", label: "Léger" },
] as const;
