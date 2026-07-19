import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    };

function HistoriquePage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setError("Vous devez être connecté pour voir votre historique.");
          setLoading(false);
          return;
        }

        const userId = session.user.id;

        // 1. Fetch workout sessions with exercise logs
        const { data: workoutsData, error: workoutsError } = await supabase
          .from("workout_sessions")
          .select("*, exercise_logs(*)")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (workoutsError) throw workoutsError;

        // 2. Fetch cardio logs
        const { data: cardioData, error: cardioError } = await supabase
          .from("cardio_logs")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (cardioError) throw cardioError;

        // Map workouts to HistoryItem
        const workoutItems: HistoryItem[] = (workoutsData || []).map((session) => {
          let setsPlanned = 0;
          let setsDone = 0;

          (session.exercise_logs || []).forEach((log) => {
            const sets = (log.sets as Array<{ done?: boolean }>) || [];
            setsPlanned += sets.length;
            setsDone += sets.filter((s) => s.done).length;
          });

          // Determine category: Push, Pull, Legs, Autre
          let category: "Push" | "Pull" | "Legs" | "Autre" = "Autre";
          const titleLower = session.day_title.toLowerCase();
          if (titleLower.includes("push")) category = "Push";
          else if (titleLower.includes("pull")) category = "Pull";
          else if (titleLower.includes("legs") || titleLower.includes("jambes")) category = "Legs";

          // Status determination:
          // terminée = all sets done or at least 80% done
          // partielle = at least 1 set done but < 80%
          const ratio = setsPlanned > 0 ? setsDone / setsPlanned : 0;
          const status: "terminée" | "partielle" =
            setsPlanned > 0 && (setsDone === setsPlanned || ratio >= 0.8)
              ? "terminée"
              : "partielle";

          return {
            type: "workout",
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
          };
        });

        // Map cardio to HistoryItem
        const cardioItems: HistoryItem[] = (cardioData || []).map((log) => {
          const formattedType =
            log.type === "course"
              ? "Running"
              : log.type.charAt(0).toUpperCase() + log.type.slice(1);

          return {
            type: "cardio",
            id: log.id,
            date: log.date,
            title: formattedType,
            cardioType: log.type,
            distance: log.distance,
            duration: log.duration,
            pace: log.pace,
            zone: log.zone,
            notes: null, // Cardio logs in schema don't have separate notes column, or use notes if exists
            status: "terminée",
          };
        });

        // Combine and sort chronologically desc
        const combined = [...workoutItems, ...cardioItems].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setItems(combined);
      } catch (err) {
        console.error("Erreur lors de la récupération de l'historique :", err);
        setError("Impossible de charger votre historique des séances.");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const formatHeaderDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <PageShell>
      <TopBar title="Historique" subtitle="Toutes tes séances passées" />

      <div className="px-5 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Chargement de ton historique...</p>
          </div>
        ) : error ? (
          <div className="card-premium p-6 text-center space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="card-premium p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-float">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-white">Aucune séance</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Aucune séance enregistrée pour le moment. Commence ta première séance !
              </p>
            </div>
            <Link
              to="/seance"
              className="inline-flex h-11 items-center justify-center rounded-xl btn-hero px-6 text-sm font-bold shadow-[0_4px_15px_rgba(139,92,246,0.3)]"
            >
              Lancer une séance
            </Link>
          </div>
        ) : (
          <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
            {items.map((item) => {
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
                        {/* Tags / Badges */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {isWorkout ? (
                            <>
                              <span
                                className={cn(
                                  "text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-black border",
                                  item.category === "Push" &&
                                    "bg-orange-500/15 text-orange-400 border-orange-500/25 shadow-[0_0_8px_rgba(249,115,22,0.1)]",
                                  item.category === "Pull" &&
                                    "bg-violet-500/15 text-violet-400 border-violet-500/25 shadow-[0_0_8px_rgba(139,92,246,0.1)]",
                                  item.category === "Legs" &&
                                    "bg-amber-500/15 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.1)]",
                                  item.category === "Autre" &&
                                    "bg-slate-500/15 text-slate-400 border-slate-500/25 shadow-[0_0_8px_rgba(100,116,139,0.1)]",
                                )}
                              >
                                {item.category}
                              </span>

                              <span
                                className={cn(
                                  "text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black flex items-center gap-1 border",
                                  item.status === "terminée"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                                    : "bg-amber-500/15 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.1)]",
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
                              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.1)] flex items-center gap-1">
                                <Heart className="h-3 w-3" /> Running
                              </span>
                              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)] flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 stroke-[2.5px]" /> terminée
                              </span>
                            </>
                          )}

                          {isWorkout && item.filmed && (
                            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                              <Video className="h-3 w-3" /> Vidéo
                            </span>
                          )}
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
                        {item.notes && (
                          <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2.5 italic line-clamp-2 mt-2 leading-relaxed bg-white/[0.01] py-1 pr-1 rounded-r">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Detail Link for Workouts */}
                      {isWorkout && (
                        <Link
                          to="/historique/$id"
                          params={{ id: item.id }}
                          className="shrink-0 h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-all self-center shadow"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Link>
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
