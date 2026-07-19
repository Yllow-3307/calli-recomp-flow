// ─────────────────────────────────────────────────────────────────────────────
// Synchro Notion V5 — réglages, introspection de bases existantes et
// orchestration (create/update). Toute la logique vit ici (côté app) ; le
// serveur ne fait que relayer les requêtes (voir notion-sync.ts).
// Deux modes par jeu de données :
//   • « auto »     → l'app crée la base dans ta page parente (simple)
//   • « existing » → l'app écrit dans TA base, selon TES correspondances
// ─────────────────────────────────────────────────────────────────────────────
import { notionRequest } from "./notion-sync";
import {
  buildNotionRows,
  DATASET_ORDER,
  NOTION_DATASETS,
  windowStartDay,
  type DatasetDef,
  type NotionDatasetKind,
  type NotionRow,
  type NotionStateSlice,
} from "./notion-datasets";

export type { NotionDatasetKind, NotionStateSlice } from "./notion-datasets";

/** Appel API Notion via le relais serveur + parsing du corps JSON. */
async function callNotion<T>(
  secret: string,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await notionRequest({ data: { secret, method, path, body } });
  if (!res.ok) return { ok: false, error: res.error };
  if (!res.body) return { ok: true };
  try {
    return { ok: true, data: JSON.parse(res.body) as T };
  } catch {
    return { ok: false, error: "Réponse Notion illisible (JSON invalide)." };
  }
}

// ── Réglages ─────────────────────────────────────────────────────────────────

export type NotionMode = "off" | "auto" | "existing";

export interface DatasetBinding {
  mode: NotionMode;
  /** URL ou ID de TA base (mode « existing ») */
  databaseUrl?: string;
  /** champ app → nom de colonne Notion */
  mapping?: Record<string, string>;
  /** id de la base créée par l'app (mode « auto », rempli à la 1re synchro) */
  autoDbId?: string;
}

export interface NotionSettings {
  secret: string;
  /** page parente pour les bases créées en mode auto */
  parentPageId: string;
  /** titres en mention date « @aujourd'hui » ou texte simple */
  titleStyle: "mention" | "texte";
  bindings: Partial<Record<NotionDatasetKind, DatasetBinding>>;
  lastSync?: string;
}

const KEY = "calli-notion-v1"; // même clé : migration V1 → V2 transparente
const DEFAULTS: NotionSettings = {
  secret: "",
  parentPageId: "",
  titleStyle: "mention",
  bindings: {},
};

export function loadNotionSettings(): NotionSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, unknown> & {
      databases?: Partial<Record<string, string>>;
    };
    if (raw && !raw.bindings) {
      // Migration V4 → V5 : les bases auto (Séances/Mesures/Tests) restent branchées.
      const bindings: NotionSettings["bindings"] = {};
      for (const [oldKey, kind] of [
        ["seances", "seances"],
        ["mesures", "mesures"],
        ["tests", "tests"],
      ] as const) {
        const id = raw.databases?.[oldKey];
        if (id) bindings[kind] = { mode: "auto", autoDbId: id };
      }
      // « repas » V4 (détail) → jeu « macros » V5 (totaux/jour) : nouvelle base auto
      if (raw.databases?.repas) bindings.macros = { mode: "auto" };
      return {
        ...DEFAULTS,
        secret: typeof raw.secret === "string" ? raw.secret : "",
        parentPageId: typeof raw.parentPageId === "string" ? raw.parentPageId : "",
        lastSync: typeof raw.lastSync === "string" ? raw.lastSync : undefined,
        bindings,
      };
    }
    return { ...DEFAULTS, ...(raw as object) } as NotionSettings;
  } catch {
    return DEFAULTS;
  }
}

export function saveNotionSettings(s: NotionSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

/** Accepte une URL Notion complète (page ou base) ou un ID brut → ID 32 hex. */
export function parseNotionPageId(input: string): string {
  const hex = (input.replace(/-/g, "").match(/[0-9a-fA-F]{32}/) ?? [null])[0];
  return hex ?? input.trim();
}

// ── Schéma d'une base existante (introspection) ──────────────────────────────

export interface NotionPropDef {
  name: string;
  type: string;
  options?: string[];
}

export interface NotionSchema {
  id: string;
  title: string;
  titleProp: string;
  props: NotionPropDef[];
}

export async function fetchDatabaseSchema(
  secret: string,
  dbId: string,
): Promise<{ ok: boolean; schema?: NotionSchema; error?: string }> {
  const res = await callNotion<{
    id: string;
    title?: { plain_text: string }[];
    properties?: Record<string, { type: string; select?: { options?: { name: string }[] } }>;
  }>(secret, "GET", `/v1/databases/${dbId}`);
  if (!res.ok || !res.data) return { ok: false, error: res.error };
  const b = res.data;
  const props: NotionPropDef[] = Object.entries(b.properties ?? {}).map(([name, p]) => ({
    name,
    type: p.type,
    options: p.select?.options?.map((o) => o.name),
  }));
  if (!props.some((p) => p.type === "title"))
    return { ok: false, error: "Cette base n'a pas de colonne titre (étrange 🤔)." };
  return {
    ok: true,
    schema: {
      id: b.id,
      title: b.title?.[0]?.plain_text || "Base Notion",
      titleProp: props.find((p) => p.type === "title")?.name ?? "Nom",
      props,
    },
  };
}

/** Ajoute la colonne anti-doublons « ID » (texte) dans une base existante. */
export async function addUidColumn(
  secret: string,
  dbId: string,
  name = "ID",
): Promise<{ ok: boolean; error?: string }> {
  const res = await callNotion<object>(secret, "PATCH", `/v1/databases/${dbId}`, {
    properties: { [name]: { rich_text: {} } },
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

// ── Mode auto : création des bases + schéma/mapping implicites ───────────────

const AUTO_TITLE: Record<NotionDatasetKind, string> = {
  seances: "Calli — Séances du jour",
  hebdo: "Calli — Résumé hebdo",
  macros: "Calli — Macros du jour",
  mensuel: "Calli — Résumé mensuel",
  mesures: "Calli — Mesures",
  tests: "Calli — Tests & skills",
};

function autoSchema(kind: NotionDatasetKind): NotionSchema {
  const def = NOTION_DATASETS[kind];
  const props: NotionPropDef[] = [
    { name: "Nom", type: "title" },
    { name: "Date", type: "date" },
    { name: "ID", type: "rich_text" },
    ...def.fields
      .filter((f) => f.key !== "date" && f.key !== "uid")
      .map((f) => ({
        name: f.label,
        type:
          f.kind === "number"
            ? "number"
            : f.kind === "select"
              ? "select"
              : f.kind === "checkbox"
                ? "checkbox"
                : "rich_text",
      })),
  ];
  return { id: "", title: AUTO_TITLE[kind], titleProp: "Nom", props };
}

function autoMapping(kind: NotionDatasetKind): Record<string, string> {
  const def = NOTION_DATASETS[kind];
  const m: Record<string, string> = { date: "Date" };
  if (def.upsertBy === "uid") m.uid = "ID";
  for (const f of def.fields) if (f.key !== "date" && f.key !== "uid") m[f.key] = f.label;
  return m;
}

/** Corps « création de colonne » pour l'API Notion selon le type voulu. */
function columnDefOf(type: string): Record<string, unknown> {
  switch (type) {
    case "title":
      return { title: {} };
    case "date":
      return { date: {} };
    case "number":
      return { number: {} };
    case "select":
      return { select: {} };
    case "checkbox":
      return { checkbox: {} };
    default:
      return { rich_text: {} };
  }
}

async function createAutoDatabase(
  secret: string,
  parentPageId: string,
  kind: NotionDatasetKind,
): Promise<{ ok: boolean; dbId?: string; error?: string }> {
  const properties: Record<string, unknown> = {};
  for (const p of autoSchema(kind).props) properties[p.name] = columnDefOf(p.type);
  const res = await callNotion<{ id: string }>(secret, "POST", "/v1/databases", {
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: AUTO_TITLE[kind] } }],
    properties,
  });
  if (!res.ok || !res.data) return { ok: false, error: res.error };
  return { ok: true, dbId: res.data.id };
}

// ── Construction des propriétés d'une ligne ──────────────────────────────────

function buildPageProps(
  row: NotionRow,
  def: DatasetDef,
  schema: NotionSchema,
  mapping: Record<string, string>,
  titleStyle: NotionSettings["titleStyle"],
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Titre : mention date « @aujourd'hui » (collé à ton usage) ou texte simple.
  props[schema.titleProp] =
    titleStyle === "mention"
      ? {
          title: [
            { type: "mention", mention: { type: "date", date: { start: row.dateISO } } },
            ...(row.titleSuffix
              ? [{ type: "text", text: { content: row.titleSuffix.slice(0, 1900) } }]
              : []),
          ],
        }
      : {
          title: [
            {
              type: "text",
              text: { content: `${row.title}${row.titleSuffix ?? ""}`.slice(0, 2000) },
            },
          ],
        };

  const typeByName = new Map(schema.props.map((p) => [p.name, p.type]));
  for (const f of def.fields) {
    const propName = mapping[f.key];
    if (!propName) continue; // champ non mappé → jamais écrit
    const propType = typeByName.get(propName);
    if (!propType) continue;
    const v =
      f.key === "uid" ? row.key : (row.fields[f.key] ?? (f.key === "date" ? row.dateISO : null));
    if (v === null || v === undefined || v === "") continue;
    switch (propType) {
      case "number":
        if (typeof v === "number") props[propName] = { number: v };
        break;
      case "date":
        props[propName] = { date: { start: String(v).slice(0, 10) } };
        break;
      case "select":
        props[propName] = { select: { name: String(v).slice(0, 100) } };
        break;
      case "checkbox":
        props[propName] = { checkbox: !!v };
        break;
      case "rich_text":
        props[propName] = {
          rich_text: [{ type: "text", text: { content: String(v).slice(0, 2000) } }],
        };
        break;
      // formules, rollups, relations… : lus mais jamais écrits
    }
  }
  return props;
}

// ── Récupération des lignes existantes (upsert par date ou par ID) ───────────

interface QueryPage {
  id: string;
  properties: Record<
    string,
    { type: string; date?: { start: string } | null; rich_text?: { plain_text?: string }[] }
  >;
}

async function findExistingPages(
  secret: string,
  dbId: string,
  def: DatasetDef,
  mapping: Record<string, string>,
): Promise<{ ok: boolean; byKey: Map<string, string>; error?: string }> {
  const byKey = new Map<string, string>();
  const dateProp = mapping.date;
  if (!dateProp) return { ok: false, byKey, error: "Colonne Date non associée." };
  const uidProp = def.upsertBy === "uid" ? mapping.uid : undefined;
  if (def.upsertBy === "uid" && !uidProp)
    return { ok: false, byKey, error: "Colonne ID (anti-doublons) non associée." };

  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const res = await callNotion<{
      results?: QueryPage[];
      has_more?: boolean;
      next_cursor?: string;
    }>(secret, "POST", `/v1/databases/${dbId}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
      filter: { property: dateProp, date: { on_or_after: windowStartDay() } },
    });
    if (!res.ok || !res.data) return { ok: false, byKey, error: res.error };
    const b = res.data;
    for (const r of b.results ?? []) {
      if (def.upsertBy === "uid") {
        const uid = uidProp ? r.properties[uidProp]?.rich_text?.[0]?.plain_text : undefined;
        if (uid) byKey.set(uid, r.id);
      } else {
        const d = r.properties[dateProp]?.date?.start?.slice(0, 10);
        if (d) byKey.set(d, r.id);
      }
    }
    if (b.has_more && b.next_cursor) cursor = b.next_cursor;
    else break;
  }
  return { ok: true, byKey };
}

// ── Orchestration de la synchro ──────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SyncReport {
  ok: boolean;
  message: string;
  /** détail par jeu de données, affiché dans la carte */
  lines: string[];
}

export async function syncToNotion(
  state: NotionStateSlice,
  onProgress: (msg: string) => void,
): Promise<SyncReport> {
  const settings = loadNotionSettings();
  if (!settings.secret)
    return { ok: false, message: "Renseigne d'abord ta clé d'intégration.", lines: [] };

  const active = DATASET_ORDER.filter((k) => {
    const b = settings.bindings[k];
    return b && b.mode !== "off";
  });
  if (!active.length)
    return {
      ok: false,
      message:
        "Aucun export activé — choisis un mode (« ma base » ou « auto ») pour au moins un jeu de données.",
      lines: [],
    };

  const rows = buildNotionRows(state);
  const lines: string[] = [];
  let totalCreated = 0;
  let totalUpdated = 0;
  let errors = 0;

  for (const kind of active) {
    const def = NOTION_DATASETS[kind];
    const binding = settings.bindings[kind]!;
    const data = rows[kind];
    if (!data.length) {
      lines.push(`${def.emoji} ${def.label} : aucune donnée sur la période`);
      continue;
    }

    onProgress(`${def.emoji} ${def.label} — préparation…`);

    // 1) Résoudre base + schéma + mapping selon le mode
    let dbId: string | null = null;
    let schema: NotionSchema | null = null;
    let mapping: Record<string, string> | null = null;

    if (binding.mode === "auto") {
      schema = autoSchema(kind);
      mapping = autoMapping(kind);
      dbId = binding.autoDbId ?? null;

      // Base auto existante : vérifier qu'elle existe encore et que toutes les
      // colonnes attendues y sont (ex. base créée par une ancienne version) —
      // les colonnes manquantes sont ajoutées automatiquement.
      if (dbId) {
        const check = await fetchDatabaseSchema(settings.secret, dbId);
        if (!check.ok || !check.schema) {
          dbId = null; // supprimée côté Notion → recréation ci-dessous
          binding.autoDbId = undefined;
          saveNotionSettings(settings);
        } else {
          const missing = schema.props.filter(
            (p) => !check.schema!.props.some((x) => x.name === p.name),
          );
          if (missing.length) {
            const add: Record<string, unknown> = {};
            for (const p of missing) add[p.name] = columnDefOf(p.type);
            await callNotion(settings.secret, "PATCH", `/v1/databases/${dbId}`, {
              properties: add,
            });
          }
        }
      }

      if (!dbId) {
        const parent = parseNotionPageId(settings.parentPageId);
        if (!parent) {
          lines.push(`${def.emoji} ${def.label} : page parente manquante pour le mode auto ⚠️`);
          errors++;
          continue;
        }
        const created = await createAutoDatabase(settings.secret, parent, kind);
        if (!created.ok || !created.dbId) {
          lines.push(`${def.emoji} ${def.label} : ${created.error ?? "création impossible"} ⚠️`);
          errors++;
          continue;
        }
        dbId = created.dbId;
        binding.autoDbId = dbId;
        saveNotionSettings(settings);
      }
    } else {
      dbId = parseNotionPageId(binding.databaseUrl ?? "");
      mapping = binding.mapping ?? {};
      if (!dbId || !mapping.date) {
        lines.push(`${def.emoji} ${def.label} : base non analysée ou colonne Date non associée ⚠️`);
        errors++;
        continue;
      }
      const s = await fetchDatabaseSchema(settings.secret, dbId);
      if (!s.ok || !s.schema) {
        lines.push(`${def.emoji} ${def.label} : ${s.error ?? "base illisible"} ⚠️`);
        errors++;
        continue;
      }
      schema = s.schema;
    }

    // 2) Lignes déjà présentes
    const existing = await findExistingPages(settings.secret, dbId, def, mapping);
    if (!existing.ok) {
      lines.push(`${def.emoji} ${def.label} : ${existing.error ?? "lecture impossible"} ⚠️`);
      errors++;
      continue;
    }

    // 3) Créer / mettre à jour (les colonnes non mappées ne sont JAMAIS touchées)
    let created = 0;
    let updated = 0;
    let failed: string | null = null;
    let i = 0;
    for (const row of data) {
      i++;
      onProgress(`${def.emoji} ${def.label} — ${i}/${data.length}…`);
      const props = buildPageProps(row, def, schema, mapping, settings.titleStyle);
      const pageId = existing.byKey.get(row.key);
      const res = pageId
        ? await callNotion<{ id: string }>(settings.secret, "PATCH", `/v1/pages/${pageId}`, {
            properties: props,
          })
        : await callNotion<{ id: string }>(settings.secret, "POST", "/v1/pages", {
            parent: { database_id: dbId },
            properties: props,
          });
      if (!res.ok || !res.data) {
        failed = `erreur sur « ${row.title} » : ${res.error ?? "inconnue"}`;
        break;
      }
      if (pageId) updated++;
      else {
        created++;
        existing.byKey.set(row.key, res.data.id);
      }
      await sleep(350); // ~3 requêtes/s (limite Notion)
    }

    totalCreated += created;
    totalUpdated += updated;
    if (failed) {
      errors++;
      lines.push(
        `${def.emoji} ${def.label} : ${created} créée(s) · ${updated} màj… puis ${failed} ⚠️`,
      );
    } else {
      lines.push(`${def.emoji} ${def.label} : ${created} créée(s) · ${updated} màj ✅`);
    }
  }

  settings.lastSync = new Date().toISOString();
  saveNotionSettings(settings);

  const message =
    errors === 0
      ? `Synchro terminée : ${totalCreated} créée(s) · ${totalUpdated} mise(s) à jour ✅`
      : `Synchro partielle : ${totalCreated} créée(s) · ${totalUpdated} màj · ${errors} erreur(s) ⚠️`;
  return { ok: errors === 0, message, lines };
}
