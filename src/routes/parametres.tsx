import { useState, useEffect, useMemo, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight,
  LogOut,
  User,
  Bell,
  BellRing,
  FileDown,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  buildDatasets,
  datasetToCSV,
  datasetToMarkdown,
  download,
  exportFilename,
  EXPORT_WINDOW_DAYS,
} from "@/lib/exporter";
import {
  loadNotionSettings,
  saveNotionSettings,
  parseNotionPageId,
  syncToNotion,
  fetchDatabaseSchema,
  addUidColumn,
  type NotionSettings,
  type DatasetBinding,
  type NotionSchema,
} from "@/lib/notion";
import {
  buildNotionRows,
  guessProperty,
  COMPAT,
  NOTION_DATASETS,
  DATASET_ORDER,
  type NotionDatasetKind,
  type FieldDef,
} from "@/lib/notion-datasets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadReminderSettings,
  saveReminderSettings,
  notificationPermission,
  requestNotificationPermission,
  notificationsSupported,
  type ReminderSettings,
} from "@/lib/reminders";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Calli Recomp" }] }),
  component: ParamsPage,
});

function ParamsPage() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Déconnexion réussie !");
      navigate({ to: "/connexion" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue lors de la déconnexion.";
      toast.error(message);
    }
  };

  return (
    <PageShell>
      <TopBar title="Paramètres" subtitle="Profil, objectifs, équipement" />

      <div className="px-5 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
        {userEmail && (
          <div className="card-premium p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Compte connecté</p>
                <p className="text-sm font-bold truncate">{userEmail}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive shrink-0"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Profil</h3>
          <Row label="Poids (kg)">
            <Input
              type="number"
              value={state.profile.weight}
              onChange={(e) => setProfile({ weight: parseFloat(e.target.value) || 0 })}
              className="bg-input w-24"
            />
          </Row>
          <Row label="Taille (cm)">
            <Input
              type="number"
              value={state.profile.height}
              onChange={(e) => setProfile({ height: parseFloat(e.target.value) || 0 })}
              className="bg-input w-24"
            />
          </Row>
          <Row label="Objectif">
            <Input
              value={state.profile.goal}
              onChange={(e) => setProfile({ goal: e.target.value })}
              className="bg-input flex-1"
            />
          </Row>
        </div>

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Fréquence</h3>
          <div className="grid grid-cols-2 gap-2">
            {[5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setProfile({ daysPerWeek: n as 5 | 6 })}
                className={`h-14 rounded-xl border font-bold transition ${
                  state.profile.daysPerWeek === n
                    ? "btn-hero border-transparent"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {n} jours / semaine
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            En 5j, le running Zone 2 récup du vendredi est retiré. Tu peux inverser dans les Notes
            du programme.
          </p>
        </div>

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Niveau</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["débutant", "intermédiaire", "avancé"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setProfile({ level: lvl })}
                className={`h-12 rounded-xl border text-sm font-semibold transition capitalize ${
                  state.profile.level === lvl
                    ? "btn-hero border-transparent"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <Link
          to="/onboarding"
          className="card-premium card-premium-hover flex items-center justify-between p-4 border border-primary/25 group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔄</span>
            <div>
              <p className="font-bold text-sm">Générer un nouveau plan</p>
              <p className="text-[11px] text-muted-foreground">
                Objectif + capacités → plan recalculé (ton cycle n'est pas remis à zéro)
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <RemindersCard />

        <ExportDataCard />

        <NotionSyncCard />

        <div className="card-premium p-4 space-y-2">
          <h3 className="font-bold">Équipement</h3>
          {["Barre traction", "Anneaux", "Haltères", "Sangle TRX", "Rameur", "Piscine", "Vélo"].map(
            (eq) => {
              const on = state.profile.equipment.includes(eq);
              return (
                <button
                  key={eq}
                  onClick={() => {
                    const next = on
                      ? state.profile.equipment.filter((x) => x !== eq)
                      : [...state.profile.equipment, eq];
                    setProfile({ equipment: next });
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium border ${
                    on
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-transparent border-border text-muted-foreground"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {eq}
                </button>
              );
            },
          )}
        </div>

        <Link
          to="/skills"
          className="card-premium p-4 block text-center font-semibold text-secondary"
        >
          Suivre mes Skills Sportifs →
        </Link>

        <Link
          to="/historique"
          className="card-premium p-4 block text-center font-semibold text-primary"
        >
          Consulter l'historique des séances →
        </Link>

        <Link to="/mesures" className="card-premium p-4 block text-center font-semibold">
          Enregistrer mesures & photos →
        </Link>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            localStorage.removeItem("calli-recomp-v1");
            toast.success("Données réinitialisées. Recharge la page.");
          }}
        >
          Réinitialiser toutes les données
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-4">
          v1.0 — Calli Recomp Tracker
        </p>
      </div>
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Réglages des rappels locaux (par appareil, zéro serveur). Voir src/lib/reminders.ts */
function RemindersCard() {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminderSettings());
  const [perm, setPerm] = useState(() => notificationPermission());

  const update = (patch: Partial<ReminderSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveReminderSettings(next);
  };

  const askPermission = async () => {
    const granted = await requestNotificationPermission();
    setPerm(notificationPermission());
    if (granted) toast.success("Notifications activées 🔔");
    else toast.error("Notifications refusées — les rappels s'afficheront dans l'app.");
  };

  return (
    <div className="card-premium p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Rappels</h3>
      </div>

      {/* Rappel séance */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Séance du jour</p>
          <p className="text-[11px] text-muted-foreground">Si pas encore entraîné à l'heure dite</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="time"
            value={settings.workoutTime}
            onChange={(e) => update({ workoutTime: e.target.value || "18:00" })}
            className="w-[5.2rem] h-8 bg-input text-xs px-2"
            aria-label="Heure du rappel"
          />
          <Switch
            checked={settings.workout}
            onCheckedChange={(v) => update({ workout: !!v })}
            aria-label="Activer le rappel de séance"
          />
        </div>
      </div>

      {/* Rappel hydratation */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">🥤 Hydratation</p>
          <p className="text-[11px] text-muted-foreground">
            À 15h si tu es en dessous de la moitié de ta cible d'eau
          </p>
        </div>
        <Switch
          checked={settings.hydration}
          onCheckedChange={(v) => update({ hydration: !!v })}
          aria-label="Activer le rappel d'hydratation"
        />
      </div>

      {/* Permission notifications */}
      <div className="border-t border-white/5 pt-3">
        {!notificationsSupported() ? (
          <p className="text-[11px] text-muted-foreground">
            ⚠️ Ce navigateur ne gère pas les notifications — les rappels s'afficheront dans l'app.
          </p>
        ) : perm === "granted" ? (
          <p className="text-[11px] text-emerald-300 flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5" /> Notifications natives activées sur cet appareil.
          </p>
        ) : perm === "denied" ? (
          <p className="text-[11px] text-amber-300">
            ⚠️ Notifications bloquées par le navigateur (réglages du site). Les rappels
            s'afficheront dans l'app.
          </p>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs bg-white/5 border border-white/10"
            onClick={askPermission}
          >
            Activer les notifications natives
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          100% gratuit, aucun serveur : fonctionne quand l'app est ouverte ou installée. Sur iPhone
          → installe l'app (Partager → « Sur l'écran d'accueil ») pour recevoir les notifs.
        </p>
      </div>
    </div>
  );
}

/** Export fichiers (2 dernières semaines) — CSV pour base Notion/Excel, Markdown à coller. */
function ExportDataCard() {
  const state = useAppState();
  const datasets = buildDatasets(state);

  return (
    <div className="card-premium p-4 space-y-3 lg:col-span-2">
      <h3 className="font-bold text-sm">📤 Exporter mes données</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Fenêtre glissante des <b>{EXPORT_WINDOW_DAYS} derniers jours</b> — à faire toutes les 2
        semaines, en même temps que ta pesée 😉 Le CSV s'importe tel quel dans Notion (base de
        données), Google Sheets ou Excel ; le Markdown se colle dans une page Notion.
      </p>
      <div className="space-y-2">
        {datasets.map((ds) => (
          <div key={ds.key} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{ds.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {ds.rows.length} ligne(s) sur la période
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!ds.rows.length}
              className="h-8 text-xs bg-white/5 border border-white/10 gap-1"
              onClick={() => {
                download(exportFilename(ds.key, "csv"), datasetToCSV(ds), "text/csv");
                toast.success(`${ds.label} : CSV téléchargé`);
              }}
            >
              <FileDown className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!ds.rows.length}
              className="h-8 text-xs bg-white/5 border border-white/10 gap-1"
              onClick={() => {
                download(exportFilename(ds.key, "md"), datasetToMarkdown(ds), "text/markdown");
                toast.success(`${ds.label} : Markdown téléchargé`);
              }}
            >
              <FileText className="h-3.5 w-3.5" /> MD
            </Button>
          </div>
        ))}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-primary font-bold">
          Comment importer dans Notion ?
        </summary>
        <ol className="list-decimal ml-4 mt-2 space-y-1 text-muted-foreground leading-relaxed">
          <li>Dans Notion, ouvre la page où tu veux tes données.</li>
          <li>Clique ⋯ (en haut) → « Importer » → choisis le fichier CSV téléchargé.</li>
          <li>
            Ton tableau Notion est créé — tu peux le trier, filtrer, le lier à d'autres pages.
          </li>
          <li>Alternative : ouvre le fichier .md, copie tout, colle directement dans une page.</li>
        </ol>
      </details>
    </div>
  );
}

/** Libellé court pour le type d'une colonne Notion. */
function typeBadge(type: string): string {
  switch (type) {
    case "date":
      return "📅";
    case "number":
      return "🔢";
    case "rich_text":
      return "🔤";
    case "select":
      return "🏷️";
    case "checkbox":
      return "☑️";
    case "formula":
      return "🧮";
    default:
      return "▫️";
  }
}

const IGNORE = "__ignore__";

/** Une ligne de correspondance : champ de l'app → colonne Notion. */
function MappingRow({
  field,
  schema,
  value,
  onChange,
}: {
  field: FieldDef;
  schema: NotionSchema;
  value: string | undefined;
  onChange: (v: string | null) => void;
}) {
  const candidates = schema.props.filter(
    (p) => p.type !== "title" && COMPAT[field.kind].includes(p.type),
  );
  const missing = field.required && !value;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-[11px] flex-1 min-w-0 truncate ${
          missing ? "text-amber-300 font-semibold" : "text-muted-foreground"
        }`}
        title={field.label}
      >
        {field.label}
        {field.required ? " *" : ""}
      </span>
      <Select value={value ?? IGNORE} onValueChange={(v) => onChange(v === IGNORE ? null : v)}>
        <SelectTrigger className="h-7 w-[54%] shrink-0 text-[11px] bg-input">
          <SelectValue placeholder="— Ignorer —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={IGNORE}>— Ne pas envoyer —</SelectItem>
          {candidates.map((p) => (
            <SelectItem key={p.name} value={p.name}>
              {typeBadge(p.type)} {p.name}
            </SelectItem>
          ))}
          {value && !candidates.some((p) => p.name === value) && (
            <SelectItem value={value}>⚠️ {value} (colonne introuvable)</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Synchro automatique vers le Notion de l'utilisateur (clé perso, gratuite). */
function NotionSyncCard() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const [settings, setSettings] = useState<NotionSettings>(() => loadNotionSettings());
  const [schemas, setSchemas] = useState<Partial<Record<NotionDatasetKind, NotionSchema>>>({});
  const [analyzing, setAnalyzing] = useState<NotionDatasetKind | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<string[] | null>(null);

  const rows = useMemo(() => buildNotionRows(state), [state]);

  // Sur un nouvel appareil : adopte la config enregistrée dans le profil (si l'appareil est vierge).
  const adoptedRef = useRef(false);
  useEffect(() => {
    if (adoptedRef.current) return;
    const cloud = state.profile.notionConfig as unknown as NotionSettings | undefined;
    const local = loadNotionSettings();
    if (cloud?.secret && !local.secret && !Object.keys(local.bindings).length) {
      adoptedRef.current = true;
      saveNotionSettings(cloud);
      setSettings(cloud);
    }
  }, [state.profile.notionConfig]);

  const update = (patch: Partial<NotionSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveNotionSettings(next);
    // Miroir dans le profil Supabase → config retrouvée sur tous les appareils.
    setProfile({ notionConfig: next as unknown as Record<string, unknown> });
  };

  const bindingOf = (kind: NotionDatasetKind): DatasetBinding =>
    settings.bindings[kind] ?? { mode: "off" };

  const updateBinding = (kind: NotionDatasetKind, patch: Partial<DatasetBinding>) => {
    update({ bindings: { ...settings.bindings, [kind]: { ...bindingOf(kind), ...patch } } });
  };

  const setMapping = (kind: NotionDatasetKind, fieldKey: string, propName: string | null) => {
    const mapping = { ...(bindingOf(kind).mapping ?? {}) };
    if (propName === null) delete mapping[fieldKey];
    else mapping[fieldKey] = propName;
    updateBinding(kind, { mapping });
  };

  const analyze = async (kind: NotionDatasetKind) => {
    const b = bindingOf(kind);
    const dbId = parseNotionPageId(b.databaseUrl ?? "");
    if (!settings.secret) {
      toast.error("Colle d'abord ta clé d'intégration.");
      return;
    }
    if (!dbId) {
      toast.error("Colle l'URL de ta base Notion.");
      return;
    }
    setAnalyzing(kind);
    try {
      const res = await fetchDatabaseSchema(settings.secret, dbId);
      if (!res.ok || !res.schema) {
        toast.error(res.error ?? "Analyse impossible.");
        return;
      }
      setSchemas((s) => ({ ...s, [kind]: res.schema }));
      // Pré-remplissage des correspondances (n'écrase jamais tes choix existants)
      const mapping: Record<string, string> = { ...(b.mapping ?? {}) };
      let filled = 0;
      for (const f of NOTION_DATASETS[kind].fields) {
        if (mapping[f.key]) continue;
        const g = guessProperty(res.schema.props, f);
        if (g) {
          mapping[f.key] = g;
          filled++;
        }
      }
      updateBinding(kind, { mapping });
      toast.success(
        `« ${res.schema.title} » : ${res.schema.props.length} colonnes · ${filled} correspondance(s) pré-remplie(s) ✅`,
      );
    } finally {
      setAnalyzing(null);
    }
  };

  const createUid = async (kind: NotionDatasetKind) => {
    const b = bindingOf(kind);
    const dbId = parseNotionPageId(b.databaseUrl ?? "");
    if (!settings.secret || !dbId) return;
    const res = await addUidColumn(settings.secret, dbId, "ID");
    if (!res.ok) {
      toast.error(res.error ?? "Impossible d'ajouter la colonne.");
      return;
    }
    toast.success("Colonne « ID » ajoutée à ta base ✅");
    await analyze(kind); // relit le schéma + pré-remplit
  };

  const activeKinds = DATASET_ORDER.filter((k) => bindingOf(k).mode !== "off");
  const ready = !!settings.secret && activeKinds.length > 0;

  const run = async () => {
    setRunning(true);
    setReport(null);
    setProgress("Préparation…");
    try {
      const res = await syncToNotion(state, setProgress);
      setReport(res.lines);
      if (res.ok) {
        toast.success(res.message);
        setSettings(loadNotionSettings());
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("La synchro a échoué. Réessaie dans un instant.");
    } finally {
      setRunning(false);
      setProgress("");
    }
  };

  return (
    <div className="card-premium p-4 space-y-3 lg:col-span-2 border border-violet-400/20">
      <h3 className="font-bold text-sm">📓 Synchro vers mon Notion</h3>
      <details className="text-xs">
        <summary className="cursor-pointer text-violet-300 font-bold">
          Config (une seule fois, ~5 min, gratuit)
        </summary>
        <ol className="list-decimal ml-4 mt-2 space-y-1 text-muted-foreground leading-relaxed">
          <li>
            Va sur <b>notion.so/profile/integrations</b> → « + Nouvelle intégration » → copie la{" "}
            <b>clé interne</b> (commence par ntn_).
          </li>
          <li>
            Sur <b>chaque base</b> à synchroniser (ou sur la page qui les contient) : ⋯ en haut →{" "}
            <b>Connexions</b> → choisis ton intégration — sinon erreur 404.
          </li>
          <li>
            Mode <b>« Ma base »</b> : colle l'URL de ta base → <b>Analyser</b> → l'app lit tes
            colonnes et pré-remplit les correspondances (★ = requis). Tes formules, RPE et notes ne
            sont jamais écrasés.
          </li>
          <li>
            Mode <b>« Auto »</b> : colle l'URL d'une page → l'app crée les bases pour toi.
          </li>
          <li>
            La synchro écrit <b>une ligne par jour / semaine / mois</b> et la met à jour ensuite —
            relance-la quand tu veux (rythme pesée 😉), jamais de doublon.
          </li>
        </ol>
      </details>

      <div className="grid gap-2 lg:grid-cols-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Clé d'intégration
          </label>
          <Input
            type="password"
            value={settings.secret}
            onChange={(e) => update({ secret: e.target.value.trim() })}
            placeholder="ntn_…"
            className="bg-input mt-1"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Style de titre des lignes
          </label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(
              [
                ["mention", "@mention date"],
                ["texte", "Texte simple"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => update({ titleStyle: v })}
                className={`h-9 rounded-lg border text-xs font-semibold transition ${
                  settings.titleStyle === v
                    ? "btn-hero border-transparent"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeKinds.some((k) => bindingOf(k).mode === "auto") && (
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Page parente (mode auto) — URL ou ID
          </label>
          <Input
            value={settings.parentPageId}
            onChange={(e) => update({ parentPageId: e.target.value.trim() })}
            placeholder="https://www.notion.so/Calli-Recomp-5f3a…"
            className="bg-input mt-1"
            autoComplete="off"
          />
        </div>
      )}

      <div className="space-y-2">
        {DATASET_ORDER.map((kind) => {
          const def = NOTION_DATASETS[kind];
          const b = bindingOf(kind);
          const schema = schemas[kind];
          return (
            <div key={kind} className="rounded-xl border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {def.emoji} {def.label}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {rows[kind].length} ligne(s) · 14 j
                </span>
              </div>

              <Select
                value={b.mode}
                onValueChange={(v) => updateBinding(kind, { mode: v as DatasetBinding["mode"] })}
              >
                <SelectTrigger className="h-8 text-xs bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">🚫 Ne pas synchroniser</SelectItem>
                  <SelectItem value="existing">🗂️ Ma base existante</SelectItem>
                  <SelectItem value="auto">✨ Base auto (créée dans ma page)</SelectItem>
                </SelectContent>
              </Select>

              {b.mode === "existing" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={b.databaseUrl ?? ""}
                      onChange={(e) => updateBinding(kind, { databaseUrl: e.target.value.trim() })}
                      placeholder="URL de ta base (https://…notion.so/xxxx?v=…)"
                      className="bg-input h-8 text-xs"
                      autoComplete="off"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs shrink-0 bg-white/5 border border-white/10"
                      disabled={analyzing !== null}
                      onClick={() => {
                        void analyze(kind);
                      }}
                    >
                      {analyzing === kind ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : schema ? (
                        "Ré-analyser"
                      ) : (
                        "Analyser"
                      )}
                    </Button>
                  </div>

                  {schema && (
                    <div className="rounded-lg bg-white/5 border border-white/10 p-2.5 space-y-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        Base <b className="text-foreground">« {schema.title} »</b> · titre : colonne{" "}
                        <b className="text-foreground">« {schema.titleProp} »</b>
                      </p>
                      {kind === "tests" && !b.mapping?.uid && (
                        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1.5">
                          <p className="text-[10px] text-amber-200">
                            Tests : une colonne texte « ID » est requise contre les doublons.
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[10px] shrink-0"
                            onClick={() => {
                              void createUid(kind);
                            }}
                          >
                            ➕ L'ajouter
                          </Button>
                        </div>
                      )}
                      {def.fields.map((f) => (
                        <MappingRow
                          key={f.key}
                          field={f}
                          schema={schema}
                          value={b.mapping?.[f.key]}
                          onChange={(v) => setMapping(kind, f.key, v)}
                        />
                      ))}
                      <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                        ★ requis · « Ne pas envoyer » = colonne jamais touchée (RPE, notes,
                        formules… tranquilles ✌️)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {b.mode === "auto" && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {b.autoDbId
                    ? "✅ Base déjà créée par l'app — les colonnes y sont gérées automatiquement."
                    : "La base sera créée dans ta page parente à la première synchro."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={run} disabled={!ready || running} className="w-full h-11 btn-hero font-bold">
        {running ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {progress || "Synchro…"}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Synchroniser les {EXPORT_WINDOW_DAYS} derniers jours
          </span>
        )}
      </Button>
      {!ready && !settings.secret && (
        <p className="text-[10px] text-amber-300 text-center">
          Colle ta clé d'intégration et active au moins un export pour lancer la synchro.
        </p>
      )}

      {report && (
        <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
          {report.map((l, i) => (
            <p key={i} className="text-[11px] text-muted-foreground">
              {l}
            </p>
          ))}
        </div>
      )}

      {settings.lastSync && (
        <p className="text-[10px] text-muted-foreground text-center">
          Dernière synchro :{" "}
          {new Date(settings.lastSync).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        🔒 Ta clé et ta config sont gardées dans TON profil Supabase (règles RLS : toi seul y as
        accès) pour les retrouver sur tous tes appareils. Le relais serveur ne stocke rien, il ne
        fait que contourner la règle CORS de Notion.
      </p>
    </div>
  );
}
