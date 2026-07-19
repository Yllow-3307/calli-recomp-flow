// ─────────────────────────────────────────────────────────────────────────────
// Réglages Notion (par appareil, localStorage) + orchestration de la synchro.
// La synchro elle-même tourne côté serveur (voir notion-sync.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { buildDatasets, DATASET_LABELS, type AppStateSlice, type DatasetKey } from "./exporter";
import { syncNotionDataset, type NotionRowPayload } from "./notion-sync";

export type { AppStateSlice } from "./exporter";

export interface NotionSettings {
  secret: string;
  parentPageId: string;
  /** id des bases créées par dataset (première synchro) */
  databases: Partial<Record<DatasetKey, string>>;
  lastSync?: string;
}

const KEY = "calli-notion-v1";
const DEFAULTS: NotionSettings = { secret: "", parentPageId: "", databases: {} };

export function loadNotionSettings(): NotionSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as object) };
  } catch {
    return DEFAULTS;
  }
}

export function saveNotionSettings(s: NotionSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

/** Accepte une URL Notion complète ou un ID brut → ID 32 caractères hex. */
export function parseNotionPageId(input: string): string {
  const hex = (input.replace(/-/g, "").match(/[0-9a-fA-F]{32}/) ?? [null])[0];
  return hex ?? input.trim();
}

export interface SyncSummary {
  ok: boolean;
  message: string;
}

/** Synchronise les 2 dernières semaines vers les 4 bases du page parent. */
export async function syncToNotion(
  state: AppStateSlice,
  onProgress: (msg: string) => void,
): Promise<SyncSummary> {
  const settings = loadNotionSettings();
  const parentPageId = parseNotionPageId(settings.parentPageId);
  if (!settings.secret || !parentPageId)
    return { ok: false, message: "Renseigne d'abord la clé d'intégration et la page Notion." };

  const datasets = buildDatasets(state);
  let created = 0;
  let already = 0;
  let synced = 0;

  for (const ds of datasets) {
    if (!ds.rows.length) continue;
    synced++;
    onProgress(`${DATASET_LABELS[ds.key]} (${ds.rows.length})…`);

    const valueKeys = ds.headers.slice(2, -1);
    const columns = valueKeys.map((name) => ({
      name,
      type: (ds.rows.some((r) => typeof r.values[name] === "number") ? "number" : "text") as
        "number" | "text",
    }));
    const rows: NotionRowPayload[] = ds.rows.map((r) => ({
      uid: r.uid,
      name: r.name,
      date: r.date,
      values: r.values,
    }));

    let dbId = settings.databases[ds.key] ?? null;
    // Plusieurs passes si plus de 40 lignes à créer
    for (let pass = 0; pass < 5; pass++) {
      const res = await syncNotionDataset({
        data: {
          secret: settings.secret,
          parentPageId,
          dbId,
          title: `Calli Recomp — ${DATASET_LABELS[ds.key]}`,
          columns,
          rows,
        },
      });
      if (!res.ok) return { ok: false, message: res.error ?? "Erreur de synchro Notion." };
      if (res.dbId) {
        dbId = res.dbId;
        settings.databases[ds.key] = res.dbId;
        saveNotionSettings(settings);
      }
      created += res.created ?? 0;
      already += res.skipped ?? 0;
      if (!res.remaining) break;
    }
  }

  settings.lastSync = new Date().toISOString();
  saveNotionSettings(settings);

  if (!synced) return { ok: true, message: "Aucune donnée sur les 14 derniers jours à envoyer." };
  return {
    ok: true,
    message: `Synchro terminée : ${created} ajouté(s) · ${already} déjà présent(s) ✅`,
  };
}
