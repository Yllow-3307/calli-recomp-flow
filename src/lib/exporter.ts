// ─────────────────────────────────────────────────────────────────────────────
// Export fichiers — 2 dernières semaines uniquement (rythme pesée).
// CSV (import direct dans une base Notion/Sheets) + Markdown (coller dans une page).
// ─────────────────────────────────────────────────────────────────────────────
import type { BodyMetric, MealLog, ProgressTest, WorkoutLog } from "./store";
import { PROGRESS_TESTS } from "./program";

export const EXPORT_WINDOW_DAYS = 14;

/** Sous-ensemble du store nécessaire aux exports. */
export interface AppStateSlice {
  workouts: WorkoutLog[];
  metrics: BodyMetric[];
  tests: ProgressTest[];
  meals: MealLog[];
}

export type DatasetKey = "seances" | "mesures" | "tests" | "repas";

export const DATASET_LABELS: Record<DatasetKey, string> = {
  seances: "📅 Séances",
  mesures: "⚖️ Mesures",
  tests: "🏆 Tests & skills",
  repas: "🍽️ Repas",
};

export interface ExportRow {
  /** identifiant unique stable (pour éviter les doublons à la synchro Notion) */
  uid: string;
  /** première colonne = titre dans Notion */
  name: string;
  /** date ISO (yyyy-mm-dd) */
  date: string;
  /** colonnes additionnelles { label: valeur } */
  values: Record<string, string | number | null>;
}

export interface ExportDataset {
  key: DatasetKey;
  label: string;
  headers: string[];
  rows: ExportRow[];
}

const cutoff = () => Date.now() - EXPORT_WINDOW_DAYS * 864e5;
const inWindow = (iso: string) => new Date(iso).getTime() >= cutoff();
const dateOnly = (iso: string) => iso.slice(0, 10);
const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Les 4 jeux de données (fenêtre glissante de 14 jours). */
export function buildDatasets(state: AppStateSlice): ExportDataset[] {
  const seances: ExportRow[] = state.workouts
    .filter((w) => inWindow(w.date))
    .map((w) => {
      const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
      const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
      const totalEx = w.exercises.length;
      return {
        uid: w.id,
        name: `${w.dayTitle || w.dayKey} — ${dateFr(w.date)}`,
        date: dateOnly(w.date),
        values: {
          Durée_min: Math.round(w.duration),
          Séries: `${doneSets}/${totalSets}`,
          Exos_réussis: w.successCount !== undefined ? `${w.successCount}/${totalEx}` : null,
          Volume_kg: w.totalVolume ?? null,
          RPE_moyen: w.rpe ?? null,
          Filmé: w.filmed ? "oui" : null,
          Notes: w.notes?.trim() || null,
        },
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const mesures: ExportRow[] = state.metrics
    .filter((m) => inWindow(m.date))
    .map((m) => ({
      uid: m.id,
      name: `Mesures du ${dateFr(m.date)}`,
      date: dateOnly(m.date),
      values: {
        Poids_kg: m.weight ?? null,
        Tour_de_taille_cm: m.waist ?? null,
        Sommeil_h: m.sleep ?? null,
        Énergie_5: m.energy ?? null,
        Fatigue_5: m.fatigue ?? null,
        Note: m.photoNote?.trim() || null,
      },
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const tests: ExportRow[] = state.tests
    .filter((t) => inWindow(t.date))
    .map((t) => {
      const def = PROGRESS_TESTS.find((p) => p.id === t.testId);
      return {
        uid: t.id,
        name: `${def?.name ?? t.testId} — ${dateFr(t.date)}`,
        date: dateOnly(t.date),
        values: {
          Test: def?.name ?? t.testId,
          Valeur: t.value,
          Unité: def?.unit ?? "",
          Type: def?.isSkill ? "skill" : "force",
        },
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const repas: ExportRow[] = state.meals
    .filter((m) => inWindow(m.date))
    .map((m) => ({
      uid: m.id,
      name: m.name,
      date: dateOnly(m.date),
      values: {
        Heure: m.date.slice(11, 16),
        kcal: m.kcal,
        Protéines_g: m.protein,
        Glucides_g: m.carbs,
        Lipides_g: m.fat,
      },
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const base: ExportDataset[] = [
    { key: "seances", label: DATASET_LABELS.seances, headers: ["Nom", "Date"], rows: seances },
    { key: "mesures", label: DATASET_LABELS.mesures, headers: ["Nom", "Date"], rows: mesures },
    { key: "tests", label: DATASET_LABELS.tests, headers: ["Nom", "Date"], rows: tests },
    { key: "repas", label: DATASET_LABELS.repas, headers: ["Nom", "Date"], rows: repas },
  ];
  return base.map((d) => {
    // En-têtes : Nom, Date, puis toutes les clés de valeurs rencontrées + ID
    const valueKeys: string[] = [];
    for (const r of d.rows)
      for (const k of Object.keys(r.values)) if (!valueKeys.includes(k)) valueKeys.push(k);
    return { ...d, headers: ["Nom", "Date", ...valueKeys, "ID"] };
  });
}

// ── CSV (RFC 4180, virgules + échappement) ──────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function datasetToCSV(d: ExportDataset): string {
  const lines = [d.headers.map(csvCell).join(",")];
  for (const r of d.rows) {
    const valueKeys = d.headers.slice(2, -1);
    lines.push(
      [r.name, r.date, ...valueKeys.map((k) => r.values[k] ?? null), r.uid].map(csvCell).join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}

// ── Markdown (tableau collable dans Notion) ─────────────────────────────────

export function datasetToMarkdown(d: ExportDataset): string {
  const md: string[] = [`## ${d.label} — ${EXPORT_WINDOW_DAYS} derniers jours`, ""];
  if (!d.rows.length) {
    md.push("_Aucune donnée sur la période._");
    return md.join("\n");
  }
  const headers = d.headers;
  md.push(`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`);
  for (const r of d.rows) {
    const valueKeys = headers.slice(2, -1);
    const cells = [r.name, r.date, ...valueKeys.map((k) => r.values[k] ?? ""), r.uid].map((v) =>
      String(v ?? "")
        .replaceAll("|", "\\|")
        .replaceAll("\n", " "),
    );
    md.push(`| ${cells.join(" | ")} |`);
  }
  return md.join("\n");
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportFilename(key: DatasetKey, ext: string): string {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(cutoff()).toISOString().slice(0, 10);
  return `calli-${key}_${start}_au_${end}.${ext}`;
}

// ── Export PDF (html2canvas + jsPDF) ────────────────────────────────────────

export async function exportProgramPDF(): Promise<boolean> {
  try {
    // Attendre que le DOM soit stable
    await new Promise((r) => setTimeout(r, 300));
    const el = document.getElementById("program-pdf-content");
    if (!el) {
      console.error("PDF: élément #program-pdf-content introuvable");
      return false;
    }
    
    // Forcer l'impression navigateur si html2canvas échoue
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      // Dimensions fixes pour éviter les erreurs de rendu
      const canvas = await html2canvas(el, {
        scale: 1.5,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      
      const imgW = pageW - 15;
      const imgH = (canvas.height * imgW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();

      // Première page
      pdf.addImage(imgData, "JPEG", 7.5, 7.5, imgW, Math.min(imgH, pageH - 15));
      
      let remaining = imgH - (pageH - 15);
      let offset = pageH - 15;
      while (remaining > 0) {
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 7.5, 7.5 - offset, imgW, imgH);
        offset += pageH - 15;
        remaining -= pageH - 15;
      }

      const filename = `calli-programme-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      return true;
    } catch (innerErr) {
      console.warn("html2canvas a échoué, fallback sur window.print()", innerErr);
      window.print();
      return true;
    }
  } catch (err) {
    console.error("Erreur export PDF:", err);
    // Fallback ultime
    try { window.print(); return true; } catch {}
    return false;
  }
}
