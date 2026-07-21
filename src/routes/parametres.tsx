import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions, generateUUID } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { GOALS, goalDefOf, WEEKDAY_LABELS } from "@/lib/plan";
import { NAV_CANDIDATES, MAX_NAV_PICKS, normalizeNavPicks } from "@/lib/nav-menu";
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
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  Music,
  ExternalLink,
  Sun,
  Moon,
  BellPlus,
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
  type LinkedBase,
  type NotionSchema,
  type NotionPropDef,
} from "@/lib/notion";
import {
  buildNotionRows,
  guessProperty,
  detectDataset,
  COMPAT,
  NOTION_DATASETS,
  DATASET_ORDER,
  type NotionDatasetKind,
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
import {
  isPushSupported as isPushSupportedBrowser,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  getVapidPublicKey,
} from "@/lib/push-notifications";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Calli Recomp" }] }),
  component: ParamsPage,
});

function ParamsPage() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const navigate = useNavigate();

  return (
    <PageShell>
      <TopBar title="Paramètres" subtitle="Compte, profil, données" />

      <div className="px-5 space-y-5">
        {/* 👤 Compte */}
        <section>
          <SectionTitle>👤 Compte</SectionTitle>
          <div className="space-y-3 lg:space-y-0 masonry-lg mt-1.5">
            <AccountCard />
            <RemindersCard />
          </div>
        </section>

        {/* 🏋️ Profil */}
        <section>
          <SectionTitle>🏋️ Profil</SectionTitle>
          <div className="space-y-3 lg:space-y-0 masonry-lg mt-1.5">
            <div className="card-premium p-4 space-y-3 min-w-0 overflow-hidden">
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
                <Select
                  value={goalDefOf(state.profile.goal).id}
                  onValueChange={(v) => setProfile({ goal: v })}
                >
                  <SelectTrigger className="bg-input w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.emoji} {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Moment séance">
                <Select
                  value={state.profile.trainingTime ?? "evening"}
                  onValueChange={(v) => setProfile({ trainingTime: v as "morning" | "evening" })}
                >
                  <SelectTrigger className="bg-input w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">🌅 Matin (à jeun)</SelectItem>
                    <SelectItem value="evening">🌙 Soir</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Durée cible">
                <Select
                  value={String(state.profile.sessionDuration ?? 55)}
                  onValueChange={(v) => setProfile({ sessionDuration: Number(v) })}
                >
                  <SelectTrigger className="bg-input w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[30, 40, 45, 50, 55, 60, 70, 80].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            </div>

            <div className="card-premium p-4 space-y-3 min-w-0 overflow-hidden">
              <h3 className="font-bold">Fréquence</h3>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((lbl, i) => {
                  const active = (state.profile.trainingDays ?? []).includes(i);
                  return (
                    <button
                      key={lbl}
                      onClick={() => {
                        const cur = state.profile.trainingDays ?? [];
                        const next = active
                          ? cur.length <= 3
                            ? (toast.error("Minimum 3 jours d'entraînement"), cur)
                            : cur.filter((d) => d !== i)
                          : cur.length >= 6
                            ? (toast.error(
                                "Maximum 6 jours : garde au moins 1 jour de repos complet 🧘",
                              ),
                              cur)
                            : [...cur, i].sort((a, b) => a - b);
                        setProfile({
                          trainingDays: next,
                          daysPerWeek: next.length,
                        });
                      }}
                      className={`py-2 rounded-lg text-[11px] font-bold border transition-all active:scale-90 ${
                        active
                          ? "btn-hero border-transparent"
                          : "bg-white/5 border-white/10 text-muted-foreground"
                      }`}
                    >
                      {lbl.slice(0, 1)}
                      <span className="sr-only">{lbl}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {(state.profile.trainingDays ?? []).length} jour(s)/semaine. Touche les jours où tu
                t'entraînes (3 à 6). Les autres deviennent du repos 🧘.
              </p>
            </div>

            <div className="card-premium p-4 space-y-3 min-w-0 overflow-hidden">
              <h3 className="font-bold">Niveau</h3>
              <div className="grid grid-cols-3 gap-2 min-w-0">
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

            <div className="card-premium p-4 space-y-2 min-w-0 mobile-break">
              <h3 className="font-bold">Équipement</h3>
              {[
                "Barre traction",
                "Anneaux",
                "Haltères",
                "Sangle TRX",
                "Rameur",
                "Piscine",
                "Vélo",
              ].map((eq) => {
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
              })}
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
          </div>
        </section>

        {/* 📓 Notion & données */}
        {/* 📱 Barre de menu mobile */}
        <section>
          <SectionTitle>📱 Barre de menu (mobile)</SectionTitle>
          <div className="mt-1.5">
            <NavMenuCard />
          </div>
        </section>

        <section>
          <SectionTitle>📓 Notion & données</SectionTitle>
          <div className="space-y-3 lg:space-y-0 masonry-lg mt-1.5">
            <ExportDataCard />
            <NotionSyncCard />
          </div>
        </section>

        {/* 🎵 Musique */}
        <section>
          <SectionTitle>🎵 Musique</SectionTitle>
          <div className="mt-1.5">
            <MusicCard />
          </div>
        </section>

        {/* 🌗 Thème */}
        <section>
          <SectionTitle>🌗 Thème</SectionTitle>
          <div className="mt-1.5">
            <ThemeCard />
          </div>
        </section>

        {/* 🔔 Notifications push */}
        <section>
          <SectionTitle>🔔 Notifications push</SectionTitle>
          <div className="mt-1.5">
            <PushCard />
          </div>
        </section>

        {/* 🔗 Raccourcis & divers */}
        <section>
          <SectionTitle>🔗 Raccourcis & divers</SectionTitle>
          <div className="space-y-3 lg:space-y-0 masonry-lg mt-1.5">
            <div className="card-premium p-2 space-y-1">
              <Link
                to="/skills"
                className="flex items-center justify-between px-2 py-2.5 rounded-lg text-sm font-semibold text-secondary hover:bg-white/5"
              >
                Suivre mes Skills Sportifs
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                to="/historique"
                className="flex items-center justify-between px-2 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/5"
              >
                Consulter l'historique des séances
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                to="/mesures"
                className="flex items-center justify-between px-2 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/5"
              >
                Enregistrer mesures & photos
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>

            <div className="card-premium p-4 space-y-3 border border-destructive/25">
              <h3 className="font-bold text-destructive">Zone danger</h3>
              <Button
                variant="secondary"
                className="w-full text-destructive border border-destructive/30 bg-destructive/10 hover:bg-destructive/20"
                onClick={() => {
                  if (!confirm("Effacer TOUTES les données locales de cet appareil ?")) return;
                  [
                    "calli-recomp-v2",
                    "calli-reminders-v1",
                    "calli-theme",
                    "weekly-recap-dismissed",
                    "deleted-test-ids",
                  ].forEach((k) => localStorage.removeItem(k));
                  supabase.auth.signOut().then(() => {
                    toast.success("Données réinitialisées.");
                    navigate({ to: "/connexion" });
                  });
                }}
              >
                Réinitialiser toutes les données
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-4">
            v1.0 — Calli Recomp Tracker
          </p>
        </section>
      </div>
    </PageShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 pb-0.5">
      {children}
    </h2>
  );
}

/** Section Compte : email, nom d'utilisateur, mot de passe, déconnexion. */
function AccountCard() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email);
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

  const handlePassword = async () => {
    if (pw1.length < 6) {
      toast.error("Mot de passe trop court (6 caractères minimum).");
      return;
    }
    if (pw1 !== pw2) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      toast.success("Mot de passe mis à jour ✅");
      setPw1("");
      setPw2("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de changer le mot de passe.");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="card-premium p-4 space-y-3 border border-primary/25">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Compte connecté</p>
          <p className="text-sm font-bold truncate">{state.profile.username || userEmail || "…"}</p>
          {state.profile.username && userEmail && (
            <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
          )}
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

      <Row label="Nom d'utilisateur">
        <Input
          value={state.profile.username ?? ""}
          onChange={(e) => setProfile({ username: e.target.value })}
          placeholder="Ex. Louis"
          className="bg-input w-36"
          maxLength={30}
        />
      </Row>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Affiché dans la barre latérale (desktop) à la place de l'email.
      </p>

      <div className="border-t border-white/5 pt-3 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5 text-primary" /> Changer de mot de passe
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="Nouveau (6 min.)"
            className="bg-input h-9 text-xs"
            autoComplete="new-password"
          />
          <Input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirmation"
            className="bg-input h-9 text-xs"
            autoComplete="new-password"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="w-full border border-white/10 bg-white/5"
          disabled={!pw1 || !pw2 || pwBusy}
          onClick={handlePassword}
        >
          {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour le mot de passe"}
        </Button>
      </div>
    </div>
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
    <div className="card-premium p-4 space-y-3 min-w-0 overflow-hidden">
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

      {/* Rappel d'export (toutes les 2 semaines, rythme pesée) */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">📤 Export des données</p>
          <p className="text-[11px] text-muted-foreground">
            Toutes les 2 semaines, le jour choisi — pense à la pesée ⚖️
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={String(settings.exportDay)}
            onValueChange={(v) => update({ exportDay: Number(v) })}
          >
            <SelectTrigger
              className="w-[4.9rem] h-8 bg-input text-xs px-2"
              aria-label="Jour du rappel d'export"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                [1, "lun."],
                [2, "mar."],
                [3, "mer."],
                [4, "jeu."],
                [5, "ven."],
                [6, "sam."],
                [0, "dim."],
              ].map(([v, label]) => (
                <SelectItem key={v} value={String(v)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Switch
            checked={settings.exportReminder}
            onCheckedChange={(v) =>
              update(
                v
                  ? { exportReminder: true, exportAnchor: new Date().toISOString() }
                  : { exportReminder: false },
              )
            }
            aria-label="Activer le rappel d'export"
          />
        </div>
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
    <div className="card-premium p-4 space-y-3 min-w-0 overflow-hidden">
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
/** Types de colonnes Notion que l'app peut remplir. */
const FILLABLE_TYPES: readonly string[] = ["number", "date", "rich_text", "select", "checkbox"];

/** Une ligne du tableau de correspondance : colonne Notion → donnée de l'app. */
function PropRow({
  prop,
  dataset,
  mapping,
  onAssign,
}: {
  prop: NotionPropDef;
  dataset: NotionDatasetKind;
  mapping: Record<string, string>;
  onAssign: (propName: string, fieldKey: string | null) => void;
}) {
  const def = NOTION_DATASETS[dataset];
  const current = Object.entries(mapping).find(([, p]) => p === prop.name)?.[0];
  const options = def.fields.filter((f) => COMPAT[f.kind].includes(prop.type));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] flex-1 min-w-0 truncate text-muted-foreground" title={prop.name}>
        {typeBadge(prop.type)} {prop.name}
      </span>
      <Select
        value={current ?? IGNORE}
        onValueChange={(v) => onAssign(prop.name, v === IGNORE ? null : v)}
      >
        <SelectTrigger className="h-7 w-[54%] shrink-0 text-[11px] bg-input">
          <SelectValue placeholder="— Ne pas remplir —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={IGNORE}>— Ne pas remplir —</SelectItem>
          {options.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
              {f.required ? " ★" : ""}
            </SelectItem>
          ))}
          {current && !options.some((f) => f.key === current) && (
            <SelectItem value={current}>⚠️ {current} (champ indisponible)</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Synchro vers le Notion de l'utilisateur : liste de bases liées, nom réel + colonnes réelles. */
type SyncPeriod = "14j" | "semaine" | "2semaines" | "mois" | "custom";

const PERIOD_LABELS: Record<SyncPeriod, string> = {
  "14j": "14 derniers jours",
  semaine: "semaine dernière",
  "2semaines": "2 dernières semaines",
  mois: "mois au choix",
  custom: "période personnalisée",
};

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysISO(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return fmtISO(d);
}
function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOfISO(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fmtISO(d);
}

function NotionSyncCard() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const [settings, setSettings] = useState<NotionSettings>(() => loadNotionSettings());
  const [schemas, setSchemas] = useState<Record<string, NotionSchema>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<string[] | null>(null);
  const [period, setPeriod] = useState<SyncPeriod>("14j");
  const [monthPick, setMonthPick] = useState(() => todayLocalISO().slice(0, 7));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [pickedBases, setPickedBases] = useState<string[]>([]); // [] = toutes

  /** Période choisie → bornes ISO (undefined = fenêtre par défaut de 14 j). */
  const range = useMemo<{ from: string; to: string } | undefined>(() => {
    const today = todayLocalISO();
    switch (period) {
      case "14j":
        return undefined;
      case "semaine": {
        const monday = mondayOfISO(today);
        return { from: addDaysISO(monday, -7), to: addDaysISO(monday, -1) };
      }
      case "2semaines": {
        const monday = mondayOfISO(today);
        return { from: addDaysISO(monday, -14), to: addDaysISO(monday, -1) };
      }
      case "mois": {
        const from = `${monthPick}-01`;
        const d = new Date(`${from}T12:00:00`);
        d.setMonth(d.getMonth() + 1, 0); // dernier jour du mois
        const to = fmtISO(d);
        return { from, to: to > today ? today : to };
      }
      case "custom":
        return customFrom && customTo
          ? { from: customFrom, to: customTo < customFrom ? customFrom : customTo }
          : undefined;
    }
  }, [period, monthPick, customFrom, customTo]);

  const rows = useMemo(() => buildNotionRows(state, range), [state, range]);

  // Sur un nouvel appareil : adopte la config enregistrée dans le profil (si l'appareil est vierge).
  const adoptedRef = useRef(false);
  useEffect(() => {
    if (adoptedRef.current) return;
    const cloud = state.profile.notionConfig as unknown as NotionSettings | undefined;
    const local = loadNotionSettings();
    if (cloud?.secret && !local.secret && !local.bases.length) {
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

  const updateBase = (id: string, patch: Partial<LinkedBase>) => {
    update({ bases: settings.bases.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  };

  const addBase = () => {
    const used = new Set(settings.bases.map((b) => b.dataset));
    const free = DATASET_ORDER.find((k) => !used.has(k)) ?? "seances";
    update({
      bases: [...settings.bases, { id: generateUUID(), dataset: free, mode: "existing" }],
    });
  };

  const removeBase = (id: string) => {
    update({ bases: settings.bases.filter((b) => b.id !== id) });
    toast.success("Base retirée de la synchro.");
  };

  /** Pré-remplit les correspondances champ → colonne (n'écrase pas les choix existants). */
  const prefillMapping = (
    schema: NotionSchema,
    dataset: NotionDatasetKind,
    current: Record<string, string>,
  ): { mapping: Record<string, string>; filled: number } => {
    const mapping: Record<string, string> = { ...current };
    let filled = 0;
    for (const f of NOTION_DATASETS[dataset].fields) {
      if (mapping[f.key]) continue;
      const g = guessProperty(schema.props, f);
      if (g) {
        mapping[f.key] = g;
        filled++;
      }
    }
    return { mapping, filled };
  };

  const analyze = async (base: LinkedBase) => {
    const dbId = parseNotionPageId(base.databaseUrl ?? "");
    if (!settings.secret) {
      toast.error("Colle d'abord ta clé d'intégration.");
      return;
    }
    if (!dbId) {
      toast.error("Colle l'URL de ta base Notion.");
      return;
    }
    setAnalyzing(base.id);
    try {
      const res = await fetchDatabaseSchema(settings.secret, dbId);
      if (!res.ok || !res.schema) {
        toast.error(res.error ?? "Analyse impossible.");
        return;
      }
      setSchemas((s) => ({ ...s, [base.id]: res.schema! }));
      // V7 : le type de données est DÉTECTÉ automatiquement (colonnes + nom de la base)
      const det = detectDataset(res.schema.props, res.schema.title);
      const detDef = NOTION_DATASETS[det.dataset];
      const { mapping, filled } = prefillMapping(res.schema, det.dataset, base.mapping ?? {});
      updateBase(base.id, { dataset: det.dataset, mapping, knownName: res.schema.title });
      if (det.confident) {
        toast.success(
          `« ${res.schema.title} » → ${detDef.emoji} ${detDef.label} (détecté auto) · ${filled} correspondance(s) pré-remplie(s) ✅`,
        );
      } else {
        toast.warning(
          `Type détecté (incertain) : ${detDef.emoji} ${detDef.label} — vérifie les correspondances ci-dessous.`,
        );
      }
    } finally {
      setAnalyzing(null);
    }
  };

  /** Changement manuel du jeu de données — uniquement utile en mode « base auto ». */
  const changeDataset = (base: LinkedBase, dataset: NotionDatasetKind) => {
    const schema = schemas[base.id];
    const mapping = schema ? prefillMapping(schema, dataset, {}).mapping : {};
    updateBase(base.id, { dataset, mapping });
  };

  /** Affecte un champ de l'app à une colonne (1 colonne = 1 champ max, et réciproquement). */
  const assignField = (base: LinkedBase, propName: string, fieldKey: string | null) => {
    const m = { ...(base.mapping ?? {}) };
    for (const [f, p] of Object.entries(m)) if (p === propName) delete m[f];
    if (fieldKey) {
      for (const [f, p] of Object.entries(m)) if (f === fieldKey) delete m[f];
      m[fieldKey] = propName;
    }
    updateBase(base.id, { mapping: m });
  };

  const createUid = async (base: LinkedBase) => {
    const dbId = parseNotionPageId(base.databaseUrl ?? "");
    if (!settings.secret || !dbId) return;
    const res = await addUidColumn(settings.secret, dbId, "ID");
    if (!res.ok) {
      toast.error(res.error ?? "Impossible d'ajouter la colonne.");
      return;
    }
    toast.success("Colonne « ID » ajoutée à ta base ✅");
    await analyze(base); // relit le schéma + pré-remplit
  };

  const ready = !!settings.secret && settings.bases.length > 0;

  const run = async () => {
    setRunning(true);
    setReport(null);
    setProgress("Préparation…");
    try {
      const onlyBases =
        pickedBases.length > 0 && pickedBases.length < settings.bases.length
          ? pickedBases
          : undefined; // [] ou tout coché = toutes les bases
      const res = await syncToNotion(state, setProgress, { range, onlyBases });
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
    <div className="card-premium p-4 space-y-3 border border-violet-400/20 min-w-0 mobile-break">
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
            Clique <b>« ➕ Ajouter une base »</b>, colle son URL → <b>Analyser</b> : le nom et les
            colonnes de TA base s'affichent, avec les correspondances pré-remplies (★ = requis).
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
          <div className="flex gap-1.5 mt-1">
            <Input
              type={showSecret ? "text" : "password"}
              value={settings.secret}
              onChange={(e) => update({ secret: e.target.value.trim() })}
              placeholder="ntn_…"
              className="bg-input flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowSecret((v) => !v)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={showSecret ? "Cacher la clé" : "Afficher la clé"}
              aria-label={showSecret ? "Cacher la clé" : "Afficher la clé"}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
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
            ).map(([v, label2]) => (
              <button
                key={v}
                onClick={() => update({ titleStyle: v })}
                className={`h-9 rounded-lg border text-xs font-semibold transition ${
                  settings.titleStyle === v
                    ? "btn-hero border-transparent"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {label2}
              </button>
            ))}
          </div>
        </div>
      </div>

      {settings.bases.some((b) => b.mode === "auto") && (
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Page parente (bases auto) — URL ou ID
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
        {settings.bases.map((base) => {
          const def = NOTION_DATASETS[base.dataset];
          const schema = schemas[base.id];
          const shownName = schema?.title ?? base.knownName;
          const fillable =
            schema?.props.filter((p) => p.type !== "title" && FILLABLE_TYPES.includes(p.type)) ??
            [];
          const skipped =
            schema?.props.filter((p) => p.type !== "title" && !FILLABLE_TYPES.includes(p.type)) ??
            [];
          const missingReq = def.fields.filter((f) => f.required && !base.mapping?.[f.key]);
          return (
            <div key={base.id} className="rounded-xl border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate">
                  🗂️ {shownName ? `« ${shownName} »` : "Nouvelle base"}
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                    {def.emoji} {def.label} · 🤖 détecté auto · {rows[base.dataset].length} ligne(s)
                  </span>
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeBase(base.id)}
                  title="Retirer cette base de la synchro (ta base Notion n'est pas supprimée)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Select
                value={base.mode}
                onValueChange={(v) => updateBase(base.id, { mode: v as LinkedBase["mode"] })}
              >
                <SelectTrigger className="h-8 text-xs bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">🗂️ Ma base existante</SelectItem>
                  <SelectItem value="auto">✨ Base auto (créée par l'app)</SelectItem>
                </SelectContent>
              </Select>

              {/* Jeu de données : choix manuel UNIQUEMENT pour une base auto
                  (l'app crée la structure, il faut savoir laquelle). Pour une base
                  existante, le type est détecté automatiquement à l'analyse. */}
              {base.mode === "auto" && (
                <Select
                  value={base.dataset}
                  onValueChange={(v) => changeDataset(base, v as NotionDatasetKind)}
                >
                  <SelectTrigger className="h-8 text-xs bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATASET_ORDER.map((k) => (
                      <SelectItem key={k} value={k}>
                        {NOTION_DATASETS[k].emoji} {NOTION_DATASETS[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {base.mode === "existing" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={base.databaseUrl ?? ""}
                      onChange={(e) => updateBase(base.id, { databaseUrl: e.target.value.trim() })}
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
                        void analyze(base);
                      }}
                    >
                      {analyzing === base.id ? (
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
                        Titre : colonne <b className="text-foreground">« {schema.titleProp} »</b>{" "}
                        (remplie automatiquement)
                      </p>
                      {missingReq.length > 0 && (
                        <p className="text-[10px] text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded-md px-2 py-1.5">
                          ⚠️ Requis : {missingReq.map((f) => f.label).join(" + ")} — associe
                          {missingReq.length > 1 ? "-les" : "e"} à une colonne ci-dessous.
                        </p>
                      )}
                      {base.dataset === "tests" && !base.mapping?.uid && (
                        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1.5">
                          <p className="text-[10px] text-amber-200">
                            Tests : une colonne texte « ID » est requise contre les doublons.
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[10px] shrink-0"
                            onClick={() => {
                              void createUid(base);
                            }}
                          >
                            ➕ L'ajouter
                          </Button>
                        </div>
                      )}
                      {fillable.map((p) => (
                        <PropRow
                          key={p.name}
                          prop={p}
                          dataset={base.dataset}
                          mapping={base.mapping ?? {}}
                          onAssign={(prop, f) => assignField(base, prop, f)}
                        />
                      ))}
                      {skipped.length > 0 && (
                        <p className="text-[10px] text-muted-foreground/70 leading-relaxed pt-1">
                          Colonnes ignorées (formules, relations…) :{" "}
                          {skipped.map((p) => p.name).join(", ")} — jamais écrites ✌️
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {base.mode === "auto" && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {base.autoDbId
                    ? "✅ Base déjà créée par l'app — colonnes gérées automatiquement."
                    : "La base sera créée dans ta page parente à la première synchro."}
                </p>
              )}
            </div>
          );
        })}

        <Button
          variant="secondary"
          className="w-full h-10 border border-dashed border-violet-400/40 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20"
          onClick={addBase}
        >
          ➕ Ajouter une base Notion
        </Button>
      </div>

      {/* Période à synchroniser */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground">Période à synchroniser</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PERIOD_LABELS) as SyncPeriod[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriod(k)}
              className={`px-3 h-8 rounded-full text-[11px] font-bold border transition-all ${
                period === k
                  ? "bg-violet-400/15 border-violet-400/50 text-violet-200"
                  : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[k]}
            </button>
          ))}
        </div>
        {period === "mois" && (
          <Input
            type="month"
            value={monthPick}
            onChange={(e) => e.target.value && setMonthPick(e.target.value)}
            className="bg-input h-9 text-sm w-44"
          />
        )}
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-input h-9 text-sm flex-1"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-input h-9 text-sm flex-1"
            />
          </div>
        )}
        {period === "custom" && (!customFrom || !customTo) && (
          <p className="text-[10px] text-amber-300">Choisis une date de début et de fin.</p>
        )}
      </div>

      {/* Bases à synchroniser */}
      {settings.bases.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-muted-foreground">Bases à synchroniser</p>
          <div className="flex flex-wrap gap-1.5">
            {settings.bases.map((b) => {
              const def = NOTION_DATASETS[b.dataset];
              const on = pickedBases.length === 0 || pickedBases.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    setPickedBases((prev) => {
                      const all = settings.bases.map((x) => x.id);
                      const cur = prev.length === 0 ? all : prev;
                      const next = cur.includes(b.id)
                        ? cur.filter((x) => x !== b.id)
                        : [...cur, b.id];
                      return next.length >= all.length ? [] : next;
                    })
                  }
                  className={`px-3 h-8 rounded-full text-[11px] font-bold border transition-all ${
                    on
                      ? "bg-violet-400/15 border-violet-400/50 text-violet-200"
                      : "bg-white/[0.03] border-white/10 text-muted-foreground/50"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {def.emoji} {b.knownName ? `« ${b.knownName} »` : def.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button onClick={run} disabled={!ready || running} className="w-full h-11 btn-hero font-bold">
        {running ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {progress || "Synchro…"}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Synchroniser : {PERIOD_LABELS[period]}
          </span>
        )}
      </Button>
      {!ready && !settings.secret && (
        <p className="text-[10px] text-amber-300 text-center">
          Colle ta clé d'intégration et ajoute au moins une base pour lancer la synchro.
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

/** Carte de configuration des notifications push (web-push). */
function PushCard() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const vapidKey = getVapidPublicKey();

  useEffect(() => {
    isPushSupportedBrowser().then(async (ok) => {
      setSupported(ok);
      if (ok) {
        const sub = await getExistingSubscription();
        setSubscribed(!!sub);
      }
    });
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    const res = await subscribeToPush();
    if (res.ok) {
      setSubscribed(true);
      toast.success("Notifications push activées 🔔");
    } else {
      toast.error(res.error || "Impossible de s'abonner.");
    }
    setBusy(false);
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    const res = await unsubscribeFromPush();
    if (res.ok) {
      setSubscribed(false);
      toast.success("Notifications push désactivées.");
    } else {
      toast.error(res.error || "Erreur de désabonnement.");
    }
    setBusy(false);
  };

  return (
    <div className="card-premium p-4 space-y-3 border border-blue-400/20">
      <div className="flex items-center gap-2">
        <BellPlus className="h-4 w-4 text-blue-400" />
        <h3 className="font-bold text-sm">Rappel push quotidien</h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <span className="hidden sm:inline">
          Reçois une notification push chaque jour si tu n'as pas encore fait ta séance.
        </span>
        <span className="sm:hidden">Notification push si séance manquée.</span>
        100% gratuit, fonctionne même quand l'app est fermée (PWA installée).
      </p>

      {!supported ? (
        <p className="text-[11px] text-amber-300">
          ⚠️ Ce navigateur ne supporte pas les notifications push. Installe l'app (menu ⋮ →
          Installer) ou utilise Chrome/Edge sur Android.
        </p>
      ) : !vapidKey ? (
        <p className="text-[11px] text-amber-300">
          ⚙️ La clé VAPID publique n'est pas configurée — demande au développeur d'ajouter
          <code className="bg-white/5 px-1 rounded"> VITE_VAPID_PUBLIC_KEY </code>
          dans les variables d'environnement Vercel.
        </p>
      ) : (
        <Button
          size="sm"
          onClick={subscribed ? handleUnsubscribe : handleSubscribe}
          disabled={busy}
          className={`w-full h-9 text-xs font-bold ${
            subscribed
              ? "bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20"
              : "btn-hero"
          }`}
        >
          {busy ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
              {subscribed ? "Désabonnement…" : "Abonnement…"}
            </span>
          ) : subscribed ? (
            "🔕 Désactiver les notifications push"
          ) : (
            "🔔 Activer les notifications push"
          )}
        </Button>
      )}

      {subscribed && (
        <p className="text-[10px] text-emerald-300 flex items-center gap-1">
          <BellRing className="h-3 w-3" /> Notifications push activées sur cet appareil.
        </p>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Le rappel est envoyé une fois par jour (Vercel cron). Pas de spam, pas de data collectée.
        Sur iOS, installe l'app via Partager → « Sur l'écran d'accueil ».
      </p>
    </div>
  );
}

/** Carte de configuration du thème (clair/sombre/système). */
const THEME_KEY = "calli-theme";

function ThemeCard() {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem(THEME_KEY) || "system";
  });

  const applyTheme = (t: string) => {
    setTheme(t);
    if (t === "system") {
      localStorage.removeItem(THEME_KEY);
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      localStorage.setItem(THEME_KEY, t);
      document.documentElement.setAttribute("data-theme", t);
    }
  };

  const options: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: "dark", label: "Sombre", icon: <Moon className="h-4 w-4" /> },
    { id: "light", label: "Clair", icon: <Sun className="h-4 w-4" /> },
    { id: "system", label: "Système", icon: <span className="text-xs">🖥️</span> },
  ];

  return (
    <div className="card-premium p-4 space-y-3 min-w-0 overflow-hidden">
      <h3 className="font-bold text-sm">Apparence</h3>
      <div className="grid grid-cols-3 gap-2 min-w-0">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => applyTheme(opt.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
              theme === opt.id
                ? "bg-primary/10 border-primary/40 text-foreground"
                : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        « Système » suit les réglages de ton téléphone/ordinateur.
      </p>
    </div>
  );
}

/** Carte de configuration des playlists musique (dynamique, ajout/suppression). */
function MusicCard() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const playlists = Array.isArray(state.profile.musicPlaylists)
    ? (state.profile.musicPlaylists as { id: string; label: string; url: string }[])
    : [];

  // Migration ancien format (Record<string, string>) vers nouveau format (array)
  const [items, setItems] = useState<{ id: string; label: string; url: string }[]>(() => {
    const raw = state.profile.musicPlaylists;
    if (Array.isArray(raw)) return raw as { id: string; label: string; url: string }[];
    if (raw && typeof raw === "object") {
      const migrated: { id: string; label: string; url: string }[] = [];
      for (const [k, v] of Object.entries(raw as Record<string, string>)) {
        if (v)
          migrated.push({
            id: k,
            label:
              k === "running"
                ? "Course 🏃"
                : k === "push"
                  ? "Push 💪"
                  : k === "pull"
                    ? "Pull 🎯"
                    : k === "legs"
                      ? "Legs 🦵"
                      : k,
            url: v,
          });
      }
      return migrated;
    }
    return [
      { id: "push", label: "Push 💪", url: "" },
      { id: "pull", label: "Pull 🎯", url: "" },
      { id: "legs", label: "Legs 🦵", url: "" },
      { id: "running", label: "Course 🏃", url: "" },
    ];
  });

  const save = () => {
    setProfile({ musicPlaylists: items });
    toast.success("Playlists enregistrées ✅");
  };

  const addItem = () => {
    const id = `playlist-${Date.now()}`;
    setItems((prev) => [...prev, { id, label: "Nouvelle playlist 🎧", url: "" }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<{ label: string; url: string }>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <div className="card-premium p-4 space-y-3 border border-pink-400/20 min-w-0 mobile-break">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-pink-400" />
        <h3 className="font-bold text-sm">Playlists sport</h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Ajoute des liens <b>Spotify</b>, <b>Deezer</b> ou <b>Apple Music</b>. Le bon lien
        s'affichera dans le bloc Musique selon la séance du jour.
      </p>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                placeholder="Nom de la playlist"
                className="bg-input h-8 text-xs flex-1"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="h-8 w-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={item.url}
              onChange={(e) => updateItem(item.id, { url: e.target.value.trim() })}
              placeholder="Lien Spotify / Deezer / Apple Music…"
              className="bg-input h-8 text-xs"
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant="secondary"
        onClick={addItem}
        className="w-full h-9 border border-dashed border-pink-400/40 bg-pink-400/10 text-pink-200 hover:bg-pink-400/20 text-xs font-bold"
      >
        ➕ Ajouter une playlist
      </Button>
      <Button size="sm" onClick={save} className="w-full h-9 btn-hero text-xs font-bold">
        Enregistrer mes playlists
      </Button>
    </div>
  );
}

/** Choix des 3 menus de la barre du bas (mobile) — Accueil & Plus sont fixes. */
function NavMenuCard() {
  const picks = normalizeNavPicks(useAppState().profile.navMenus);
  const { setProfile } = useAppActions();

  const toggle = (id: string) => {
    if (picks.includes(id)) {
      if (picks.length <= 1) {
        toast.error("Garde au moins un menu dans la barre.");
        return;
      }
      setProfile({ navMenus: picks.filter((p) => p !== id) });
    } else {
      if (picks.length >= MAX_NAV_PICKS) {
        toast.error(`Maximum ${MAX_NAV_PICKS} menus — « Accueil » et « Plus » sont toujours là.`);
        return;
      }
      setProfile({ navMenus: [...picks, id] });
    }
  };

  return (
    <div className="card-premium p-4 space-y-3 min-w-0 overflow-hidden">
      <h3 className="font-bold">Barre du bas (téléphone)</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Choisis jusqu'à <strong>{MAX_NAV_PICKS} menus</strong> affichés dans la barre du bas. «
        Accueil » et « Plus » y sont toujours — le reste se range automatiquement dans « Plus ».
      </p>
      <div className="grid grid-cols-2 gap-2">
        {NAV_CANDIDATES.map((c) => {
          const Icon = c.icon;
          const on = picks.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              aria-pressed={on}
              className={`flex items-center gap-2 px-3 h-10 rounded-xl border text-xs font-bold transition-all ${
                on
                  ? "bg-primary/10 border-primary/40 text-foreground"
                  : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`p-1.5 rounded-lg border ${c.color} shrink-0`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate flex-1 text-left">{c.label}</span>
              {on && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Dans la barre : <strong>Accueil</strong>
        {NAV_CANDIDATES.filter((c) => picks.includes(c.id))
          .map((c) => ` · ${c.label}`)
          .join("")}{" "}
        · <strong>Plus</strong>
      </p>
    </div>
  );
}
