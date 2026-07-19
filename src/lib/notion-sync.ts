// ─────────────────────────────────────────────────────────────────────────────
// Relais Notion — fonction serveur (RPC) générique qui appelle l'API Notion.
// Le navigateur ne peut PAS appeler api.notion.com directement (CORS),
// d'où ce relais côté serveur (hébergé sur ton Vercel, gratuit).
// La clé Notion n'est jamais stockée côté serveur : elle voyage dans chaque
// requête depuis l'appareil de l'utilisateur (config gardée dans son profil).
// ─────────────────────────────────────────────────────────────────────────────
import { createServerFn } from "@tanstack/react-start";

const API = "https://api.notion.com";
const NOTION_VERSION = "2022-06-28";

export interface NotionProxyPayload {
  secret: string;
  method: "GET" | "POST" | "PATCH";
  /** chemin d'API Notion, ex. "/v1/databases/abc" — doit commencer par /v1/ */
  path: string;
  body?: unknown;
}

export interface NotionProxyResult {
  ok: boolean;
  status: number;
  /** corps de réponse Notion, JSON stringifié (null si vide) — à parser côté app */
  body: string | null;
  error?: string;
}

function friendlyError(status: number, bodyText: string): string {
  let msg = "";
  try {
    const parsed = JSON.parse(bodyText) as { message?: unknown };
    if (typeof parsed.message === "string") msg = parsed.message;
  } catch {
    /* corps non-JSON : on garde les messages génériques */
  }
  if (status === 400 && msg) return `Notion refuse : ${msg}`;
  if (status === 401) return "Clé Notion invalide (401). Vérifie ta clé d'intégration.";
  if (status === 403) return "Accès refusé (403). L'intégration n'a pas le droit d'écrire ici.";
  if (status === 404)
    return "Base/page introuvable (404). As-tu bien CONNECTÉ ton intégration à cette base ? (⋯ → Connexions)";
  if (status === 429) return "Notion demande de ralentir — réessaie dans une minute.";
  return msg || `Erreur Notion (${status})`;
}

export const notionRequest = createServerFn({ method: "POST" })
  .validator((payload: unknown): NotionProxyPayload => payload as NotionProxyPayload)
  .handler(async ({ data }): Promise<NotionProxyResult> => {
    try {
      const { secret, method, path, body } = data;
      if (!secret) return { ok: false, status: 0, body: null, error: "Clé Notion manquante." };
      if (
        typeof path !== "string" ||
        !path.startsWith("/v1/") ||
        path.includes("..") ||
        !["GET", "POST", "PATCH"].includes(method)
      )
        return { ok: false, status: 0, body: null, error: "Requête invalide." };

      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${secret}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await res.text().catch(() => "");
      if (!res.ok)
        return {
          ok: false,
          status: res.status,
          body: text || null,
          error: friendlyError(res.status, text),
        };
      return { ok: true, status: res.status, body: text || null };
    } catch (err) {
      console.error("notionRequest:", err);
      return {
        ok: false,
        status: 0,
        body: null,
        error: "Le relais de synchro n'a pas répondu. Vérifie ta connexion et réessaie.",
      };
    }
  });
