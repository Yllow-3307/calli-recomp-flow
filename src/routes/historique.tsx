import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { type Database } from "@/integrations/supabase/types";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Video,
  ChevronRight,
  Sparkles,
  Dumbbell,
  Timer,
  Heart,
  Trash2,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react";
import { useAppActions, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";
import { parseSessionNotes, SESSION_TAGS } from "@/lib/session-tags";

export const Route = createFileRoute("/historique")({
  head: () => ({ meta: [{ title: "Historique des séances — Calli Recomp" }] }),
  component: HistoriquePage,
});

type SessionWithLogs = Database["public"]["Tables"]["workout_sessions"]["Row"] & {
  exercise_logs: Database["public"]["Tables"]["exercise_logs"]["Row"][];
};

type CardioLogRow = Database["public"]["Tables"]["cardio_logs"]["Row"];

type HistoryItem =
  | {
      type: "workout";
      id: string;
      date: string;
      title: string;
      category: "Push" | "Pull" | "Legs" | "Autre";
      duration: number;
      rpe: number | null;
      filmed: boolean;
      notes: string | null;
      setsPlanned: number;
      setsDone: number;
      status: "terminée" | "partielle";
      tags: string[];
      noteText: string;
    }
  | {
      type: "cardio";
      id: string;
      date: string;
      title: string;
      cardioType: "course" | "rameur" | "natation" | "vélo";
      distance: number | null;
      duration: number;
      pace: string | null;
      zone: string | null;
      notes: string | null;
      status: "terminée";
      tags: string[];
      noteText: string;
    };

/** Tous les types d'entraînement uniques dans l'historique. */
const TYPE_FILTERS = ["Toutes", "Push", "Pull", "Legs", "Running"] as const;

function HistoriquePage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const actions = useAppActions();
  const state = useAppState();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("Toutes");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [sortAsc, setSortAsc] = useState(false);

  const deleteWorkout = (id: string) => {
    if (!confirm("Supprimer définitivement cette séance ?")) return;
    actions.removeWorkout(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);

        // Mapper les séances locales (Zustand / local state) d'abord
        const localWorkouts: HistoryItem[] = state.workouts.map((w) => {
          let setsPlanned = 0;
          let setsDone = 0;
          (w.exercises || []).forEach((e) => {
            setsPlanned += e.sets.length;
            setsDone += e.sets.filter((s) => s.done).length;
          });
          let category: "Push" | "Pull" | "Legs" | "Autre" = "Autre";
          const titleLower = (w.dayTitle || "").toLowerCase();
          if (titleLower.includes("push")) category = "Push";
          else if (titleLower.includes("pull")) category = "Pull";
          else if (titleLower.includes("legs") || titleLower.includes("jambes")) category = "Legs";

          const ratio = setsPlanned > 0 ? setsDone / setsPlanned : 0;
          const status: "terminée" | "partielle" =
            setsPlanned > 0 && (setsDone === setsPlanned || ratio >= 0.8)
              ? "terminée"
              : "partielle";

          const { tags, note: noteText } = parseSessionNotes(w.notes ?? null);

          return {
            type: "workout" as const,
            id: w.id,
            date: w.date,
            title: w.dayTitle || "Séance musculation",
            category,
            duration: w.duration,
            rpe: w.rpe ?? null,
            filmed: !!w.filmed,
            notes: w.notes ?? null,
            setsPlanned,
            setsDone,
            status,
            tags,
            noteText,
          };
        });

        const localCardios: HistoryItem[] = state.cardio.map((c) => ({
          type: "cardio" as const,
          id: c.id,
          date: c.date,
          title:
            c.type === "course"
              ? "Running"
              : c.type.charAt(0).toUpperCase() + c.type.slice(1),
          cardioType: c.type,
          distance: c.distance ?? null,
          duration: c.duration,
          pace: c.pace ?? null,
          zone: c.zone ?? null,
          notes: null,
          status: "terminée" as const,
          tags: [],
          noteText: "",
        }));

        let remoteWorkouts: HistoryItem[] = [];
        let remoteCardios: HistoryItem[] = [];

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const userId = session.user.id;

            const { data: workoutsData } = await supabase
              .from("workout_sessions")
              .select("*, exercise_logs(*)")
              .eq("user_id", userId)
              .order("date", { ascending: false });

            const { data: cardioData } = await supabase
              .from("cardio_logs")
              .select("*")
              .eq("user_id", userId)
              .order("date", { ascending: false });

            if (workoutsData) {
              remoteWorkouts = workoutsData.map((session) => {
                let setsPlanned = 0;
                let setsDone = 0;
                (session.exercise_logs || []).forEach((log) => {
                  const sets = (log.sets as Array<{ done?: boolean }>) || [];
                  setsPlanned += sets.length;
                  setsDone += sets.filter((s) => s.done).length;
                });

                let category: "Push" | "Pull" | "Legs" | "Autre" = "Autre";
                const titleLower = session.day_title.toLowerCase();
                if (titleLower.includes("push")) category = "Push";
                else if (titleLower.includes("pull")) category = "Pull";
                else if (titleLower.includes("legs") || titleLower.includes("jambes")) category = "Legs";

                const ratio = setsPlanned > 0 ? setsDone / setsPlanned : 0;
                const status: "terminée" | "partielle" =
                  setsPlanned > 0 && (setsDone === setsPlanned || ratio >= 0.8)
                    ? "terminée"
                    : "partielle";

                const { tags, note: noteText } = parseSessionNotes(session.notes);

                return {
                  type: "workout" as const,
                  id: session.id,
                  date: session.date,
                  title: session.day_title || "Séance musculation",
                  category,
                  duration: session.duration,
                  rpe: session.rpe,
                  filmed: !!session.filmed,
                  notes: session.notes,
                  setsPlanned,
                  setsDone,
                  status,
                  tags,
                  noteText,
                };
              });
            }

            if (cardioData) {
              remoteCardios = cardioData.map((log) => ({
                type: "cardio" as const,
                id: log.id,
                date: log.date,
                title:
                  log.type === "course"
                    ? "Running"
                    : log.type.charAt(0).toUpperCase() + log.type.slice(1),
                cardioType: log.type,
                distance: log.distance,
                duration: log.duration,
                pace: log.pace,
                zone: log.zone,
                notes: null,
                status: "terminée" as const,
                tags: [],
                noteText: "",
              }));
            }
          }
        } catch (netErr) {
          console.warn("Réseau indisponible, affichage des séances locales:", netErr);
        }

        // Fusion sans doublons
        const itemMap = new Map<string, HistoryItem>();
        [...localWorkouts, ...localCardios, ...remoteWorkouts, ...remoteCardios].forEach((item) => {
          itemMap.set(item.id, item);
        });

        const combined = Array.from(itemMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setItems(combined);
      } catch (err) {
        console.error("Erreur historique :", err);
        setError("Impossible de charger ton historique.");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [state.workouts, state.cardio]);

  // Filtrage & tri
  const filtered = useMemo(() => {
    let result = [...items];

    // Filtre texte
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          i.noteText.toLowerCase().includes(q),
      );
    }

    // Filtre type
    if (typeFilter !== "Toutes") {
      if (typeFilter === "Running") {
        result = result.filter((i) => i.type === "cardio");
      } else {
        result = result.filter((i) => i.type === "workout" && i.category === typeFilter);
      }
    }

    // Filtre tag
    if (tagFilter) {
      result = result.filter((i) => i.tags.includes(tagFilter));
    }

    // Tri
    result.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortAsc ? diff : -diff;
    });

    return result;
  }, [items, search, typeFilter, tagFilter, sortAsc]);

  // Tags présents dans l'historique
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [items]);

  const formatHeaderDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <PageShell>
      <TopBar
        title="Historique"
        subtitle={
          filtered.length > 0 ? `${filtered.length} séance(s)` : "Toutes tes séances passées"
        }
      />

      {/* Barre de recherche */}
      <div className="px-5 mt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, tag, note..."
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-input border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filtres par type */}
      <div className="px-5 mt-3 flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTypeFilter(f)}
            className={`px-3 h-7 rounded-full text-[10px] font-bold border transition-all ${
              typeFilter === f
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSortAsc((v) => !v)}
          className={`px-3 h-7 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${
            sortAsc
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpDown className="h-3 w-3" /> {sortAsc ? "↑" : "↓"}
        </button>
      </div>

      {/* Filtres par tag */}
      {allTags.length > 0 && (
        <div className="px-5 mt-2 flex flex-wrap gap-1.5">
          {tagFilter && (
            <button
              type="button"
              onClick={() => setTagFilter("")}
              className="px-2 h-6 rounded-full text-[10px] font-bold border border-white/10 text-muted-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Tous les tags
            </button>
          )}
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(tagFilter === t ? "" : t)}
              className={`px-2 h-6 rounded-full text-[10px] font-bold border transition-all ${
                tagFilter === t
                  ? "bg-primary/15 border-primary/40"
                  : "bg-white/[0.03] border-white/10 text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="px-5 space-y-4 mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        ) : error ? (
          <div className="card-premium p-6 text-center space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-float">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-white">
                {search || typeFilter !== "Toutes" || tagFilter
                  ? "Aucun résultat"
                  : "Aucune séance"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {search || typeFilter !== "Toutes" || tagFilter
                  ? "Essaie de modifier tes filtres."
                  : "Commence ta première séance !"}
              </p>
            </div>
            {!search && typeFilter === "Toutes" && !tagFilter && (
              <Link
                to="/seance"
                className="inline-flex h-11 items-center justify-center rounded-xl btn-hero px-6 text-sm font-bold"
              >
                Lancer une séance
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6 lg:space-y-0 masonry-lg">
            {filtered.map((item) => {
              const isWorkout = item.type === "workout";
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                    <span className="capitalize">{formatHeaderDate(item.date)}</span>
                    <span>{formatTime(item.date)}</span>
                  </div>

                  <div className="card-premium p-4 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 border border-white/[0.04]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-3">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {isWorkout ? (
                            <>
                              <span
                                className={cn(
                                  "text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-black border",
                                  item.category === "Push" &&
                                    "bg-orange-500/15 text-orange-400 border-orange-500/25",
                                  item.category === "Pull" &&
                                    "bg-violet-500/15 text-violet-400 border-violet-500/25",
                                  item.category === "Legs" &&
                                    "bg-amber-500/15 text-amber-400 border-amber-500/25",
                                  item.category === "Autre" &&
                                    "bg-slate-500/15 text-slate-400 border-slate-500/25",
                                )}
                              >
                                {item.category}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black flex items-center gap-1 border",
                                  item.status === "terminée"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                    : "bg-amber-500/15 text-amber-400 border-amber-500/25",
                                )}
                              >
                                {item.status === "terminée" ? (
                                  <CheckCircle className="h-3 w-3 stroke-[2.5px]" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 stroke-[2.5px]" />
                                )}
                                {item.status}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 flex items-center gap-1">
                                <Heart className="h-3 w-3" /> Running
                              </span>
                              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> terminée
                              </span>
                            </>
                          )}
                          {isWorkout && item.filmed && (
                            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                              <Video className="h-3 w-3" /> Vidéo
                            </span>
                          )}
                          {/* Tags V11 */}
                          {item.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>

                        {/* Title & Stats */}
                        <div>
                          <h3 className="font-bold text-base leading-snug text-white group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                              <Clock className="h-3.5 w-3.5 text-primary" /> {item.duration} min
                            </span>
                            {isWorkout ? (
                              <>
                                <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                                  <Dumbbell className="h-3.5 w-3.5 text-accent" /> {item.setsDone}/
                                  {item.setsPlanned} séries
                                </span>
                                {item.rpe !== null && (
                                  <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono">
                                    RPE {item.rpe}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {item.distance !== null && (
                                  <span className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-bold text-accent">
                                    <Timer className="h-3.5 w-3.5 text-cyan-400" /> {item.distance}{" "}
                                    km
                                  </span>
                                )}
                                {item.pace && (
                                  <span className="font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                                    {item.pace} /km
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Notes */}
                        {item.noteText && (
                          <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2.5 italic line-clamp-2 mt-2 leading-relaxed bg-white/[0.01] py-1 pr-1 rounded-r">
                            {item.noteText}
                          </p>
                        )}
                      </div>

                      {/* Boutons */}
                      {isWorkout && (
                        <div className="flex flex-col items-center gap-2 self-center shrink-0">
                          <button
                            type="button"
                            title="Supprimer"
                            onClick={() => deleteWorkout(item.id)}
                            className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <Link
                            to="/historique/$id"
                            params={{ id: item.id }}
                            className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
