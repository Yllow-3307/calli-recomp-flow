// ─────────────────────────────────────────────────────────────────────────────
// Synchro Notion — fonction serveur (RPC) qui appelle l'API Notion.
// Le navigateur ne peut PAS appeler api.notion.com directement (CORS),
// d'où ce relais côté serveur (hébergé sur ton Vercel, gratuit).
// La clé Notion n'est jamais stockée côté serveur : elle voyage dans la
// requête depuis l'appareil de l'utilisateur (stockée en localStorage chez lui).
// ─────────────────────────────────────────────────────────────────────────────
import { createServerFn } from "@tanstack/react-start";

const API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const THROTTLE_MS = 340; // ~3 requêtes/s (limite Notion)
const MAX_CREATES = 40; // budget temps d'une fonction serverless (~60 s)

export interface NotionRowPayload {
  uid: string;
  name: string;
  date: string;
  values: Record<string, string | number | null>;
}

export interface SyncPayload {
  secret: string;
  parentPageId: string;
  /** id de la base si déjà créée (null = première synchro → la créer) */
  dbId: string | null;
  title: string;
  columns: { name: string; type: "number" | "text" }[];
  rows: NotionRowPayload[];
}

export interface SyncResult {
  ok: boolean;
  dbId?: string;
  created?: number;
  skipped?: number;
  remaining?: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function notionFetch(
  secret: string,
  path: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

function friendlyError(status: number, body: Record<string, unknown>): string {
  const msg = typeof body.message === "string" ? body.message : `Erreur Notion (${status})`;
  if (status === 401) return "Clé Notion invalide (401). Vérifie ta clé d'intégration.";
  if (status === 404)
    return "Page introuvable (404). As-tu bien CONNECTÉ ton intégration à la page ? (⋯ → Connexions)";
  if (status === 429) return "Notion demande de ralentir — réessaie dans une minute.";
  return msg;
}

/** Propriétés d'une page = colonnes de la base. */
type NotionProperties = Record<string, unknown>;

function pageProperties(row: NotionRowPayload, columns: SyncPayload["columns"]): NotionProperties {
  const props: NotionProperties = {
    Nom: { title: [{ text: { content: row.name.slice(0, 2000) } }] },
    Date: row.date ? { date: { start: row.date } } : { date: null },
    ID: { rich_text: [{ text: { content: row.uid } }] },
  };
  for (const col of columns) {
    const v = row.values[col.name];
    if (v === null || v === undefined || v === "") continue;
    props[col.name] =
      col.type === "number" && typeof v === "number"
        ? { number: v }
        : { rich_text: [{ text: { content: String(v).slice(0, 2000) } }] };
  }
  return props;
}

export const syncNotionDataset = createServerFn({ method: "POST" })
  .validator((payload: unknown): SyncPayload => payload as SyncPayload)
  .handler(async ({ data }): Promise<SyncResult> => {
    try {
      const { secret, parentPageId, title, columns, rows } = data;
      let { dbId } = data;
      if (!secret || !parentPageId) return { ok: false, error: "Clé ou page manquante." };

      // 1) Créer la base si première synchro
      if (!dbId) {
        const properties: NotionProperties = {
          Nom: { title: {} },
          Date: { date: {} },
          ID: { rich_text: {} },
        };
        for (const col of columns)
          properties[col.name] = col.type === "number" ? { number: {} } : { rich_text: {} };

        const created = await notionFetch(secret, "/databases", {
          method: "POST",
          body: JSON.stringify({
            parent: { type: "page_id", page_id: parentPageId },
            title: [{ type: "text", text: { content: title } }],
            properties,
          }),
        });
        if (!created.ok) return { ok: false, error: friendlyError(created.status, created.body) };
        dbId = created.body.id as string;
      }

      // 2) Récupérer les ID existants (anti-doublons)
      const existing = new Set<string>();
      let cursor: string | undefined;
      for (let page = 0; page < 10; page++) {
        const q = await notionFetch(secret, `/databases/${dbId}/query`, {
          method: "POST",
          body: JSON.stringify({
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
          }),
        });
        if (!q.ok) {
          if (q.status === 404) {
            // Base supprimée dans Notion → on la recrée au prochain appel
            return {
              ok: false,
              error:
                "Base introuvable dans Notion (supprimée ?). Supprime l'ID de base dans les réglages pour la recréer.",
            };
          }
          return { ok: false, error: friendlyError(q.status, q.body) };
        }
        const results = (q.body.results ?? []) as {
          properties?: Record<string, { rich_text?: { plain_text?: string }[] }>;
        }[];
        for (const r of results) {
          const uid = r.properties?.ID?.rich_text?.[0]?.plain_text;
          if (uid) existing.add(uid);
        }
        if (q.body.has_more && typeof q.body.next_cursor === "string") {
          cursor = q.body.next_cursor;
        } else break;
      }

      // 3) Créer les lignes manquantes (limité par appel)
      const todo = rows.filter((r) => !existing.has(r.uid));
      const batch = todo.slice(0, MAX_CREATES);
      let created = 0;
      for (const row of batch) {
        const res = await notionFetch(secret, "/pages", {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: dbId },
            properties: pageProperties(row, columns),
          }),
        });
        if (!res.ok)
          return {
            ok: false,
            dbId,
            created,
            skipped: rows.length - todo.length,
            remaining: todo.length - created,
            error: friendlyError(res.status, res.body),
          };
        created++;
        await sleep(THROTTLE_MS);
      }

      return {
        ok: true,
        dbId,
        created,
        skipped: rows.length - todo.length,
        remaining: todo.length - created,
      };
    } catch (err) {
      console.error("syncNotionDataset:", err);
      return {
        ok: false,
        error: "Le serveur de synchro n'a pas répondu. Réessaie dans un instant.",
      };
    }
  });
