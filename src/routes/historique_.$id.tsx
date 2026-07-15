import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { type Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Calendar,
  Clock,
  Sparkles,
  Dumbbell,
  CheckCircle,
  AlertCircle,
  Video,
  FileText,
  Flame,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historique_/$id")({
  head: () => ({ meta: [{ title: "Détail de la séance — Calli Recomp" }] }),
  component: SessionDetailPage,
});

type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];

type DetailedSession = WorkoutSession & {
  exercise_logs: ExerciseLog[];
};

function SessionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<DetailedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessionDetails() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("workout_sessions")
          .select("*, exercise_logs(*)")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Séance introuvable.");
          return;
        }

        setSession(data as DetailedSession);
      } catch (err) {
        console.error("Erreur lors de la récupération des détails de la séance :", err);
        setError("Impossible de charger les détails de cette séance.");
      } finally {
        setLoading(false);
      }
    }

    fetchSessionDetails();
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement des détails...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !session) {
    return (
      <PageShell>
        <div className="px-5 pt-6">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/historique" })}
            className="flex items-center gap-2 pl-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Retour à l'historique
          </Button>
          <div className="card-premium p-6 text-center space-y-4 mt-6">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-semibold">{error || "Séance introuvable."}</p>
            <Button onClick={() => navigate({ to: "/historique" })} className="btn-hero">
              Retourner à l'historique
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // Calculate totals
  let totalSetsPlanned = 0;
  let totalSetsDone = 0;
  (session.exercise_logs || []).forEach((log) => {
    const sets = (log.sets as Array<{ done?: boolean }>) || [];
    totalSetsPlanned += sets.length;
    totalSetsDone += sets.filter((s) => s.done).length;
  });

  const ratio = totalSetsPlanned > 0 ? totalSetsDone / totalSetsPlanned : 0;
  const isCompleted = totalSetsPlanned > 0 && (totalSetsDone === totalSetsPlanned || ratio >= 0.8);

  const formattedDate = new Date(session.date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = new Date(session.date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PageShell>
      <div className="px-5 pt-6 pb-2">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/historique" })}
          className="flex items-center gap-2 pl-0 text-muted-foreground hover:text-foreground mb-4 font-bold text-xs"
        >
          <ChevronLeft className="h-4 w-4 text-primary" /> Retour à l'historique
        </Button>
      </div>

      <div className="px-5 text-center pb-6">
        <h1 className="text-2xl font-black text-white">{session.day_title}</h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mt-1.5 capitalize">
          {formattedDate} • {formattedTime}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="px-5 grid grid-cols-2 gap-3">
        <div className="card-premium p-4 border border-white/[0.04]">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> Durée
          </p>
          <p className="text-2xl font-black mt-2 text-gradient">{session.duration} min</p>
        </div>
        <div className="card-premium p-4 border border-white/[0.04]">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" /> RPE Moyen
          </p>
          <p className="text-2xl font-black mt-2 text-gradient">
            {session.rpe !== null ? `${session.rpe}/10` : "—"}
          </p>
        </div>
        <div className="card-premium p-4 border border-white/[0.04]">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5 text-accent" /> Séries
          </p>
          <p className="text-2xl font-black mt-2 text-gradient">
            {totalSetsDone}/{totalSetsPlanned}
          </p>
        </div>
        <div className="card-premium p-4 border border-white/[0.04]">
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" /> Statut
          </p>
          <p
            className={cn(
              "text-base font-black mt-2 flex items-center gap-1 capitalize",
              isCompleted ? "text-emerald-400" : "text-amber-400",
            )}
          >
            {isCompleted ? (
              <CheckCircle className="h-4 w-4 stroke-[2.5px]" />
            ) : (
              <AlertCircle className="h-4 w-4 stroke-[2.5px]" />
            )}
            {isCompleted ? "terminée" : "partielle"}
          </p>
        </div>
      </div>

      {session.total_volume !== null && session.total_volume > 0 && (
        <div className="px-5 mt-3">
          <div className="card-premium p-4 flex items-center gap-3 border border-white/[0.04]">
            <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Volume total
              </p>
              <p className="text-xl font-black mt-0.5 text-white">
                {session.total_volume.toLocaleString("fr-FR")} kg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Session Notes */}
      {session.notes && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold px-1">
            Notes globales
          </p>
          <div className="card-premium p-4 text-sm text-slate-300 flex gap-2.5 items-start border border-white/[0.04]">
            <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="italic leading-relaxed">{session.notes}</p>
          </div>
        </section>
      )}

      {/* "Je me suis filmé" Notification */}
      {session.filmed && (
        <section className="px-5 mt-3">
          <div className="card-premium p-4 flex items-center gap-3 text-xs text-primary font-black uppercase tracking-wider border border-primary/10 bg-primary/5">
            <Video className="h-5 w-5" />
            <span>Je me suis filmé sur cette séance</span>
          </div>
        </section>
      )}

      {/* Exercises Details */}
      <section className="px-5 mt-5 space-y-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold px-1">
          Exercices de la séance
        </p>

        {(session.exercise_logs || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun log d'exercice enregistré pour cette séance.
          </p>
        ) : (
          (session.exercise_logs || []).map((exLog, index) => {
            const sets =
              (exLog.sets as Array<{
                reps?: number;
                time?: number;
                weight?: number;
                rpe?: number;
                done?: boolean;
              }>) || [];

            return (
              <div
                key={exLog.id}
                className="card-premium p-4 space-y-3.5 border border-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-white">{exLog.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Type :{" "}
                      <span className="text-slate-300 font-semibold">
                        {exLog.kind === "time"
                          ? "Chronométré"
                          : exLog.kind === "distance"
                            ? "Cardio"
                            : "Répétitions"}
                      </span>
                      {exLog.target_min !== null && (
                        <>
                          {" "}
                          • Cible :{" "}
                          <span className="text-primary font-bold">
                            {exLog.target_min}-{exLog.target_max}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-wider bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-300">
                    {sets.filter((s) => s.done).length} / {sets.length} séries
                  </span>
                </div>

                {/* Sets List */}
                <div className="space-y-2">
                  {sets.map((set, setIdx) => (
                    <div
                      key={setIdx}
                      className={cn(
                        "flex items-center justify-between text-xs py-2 px-3 rounded-xl border transition-all",
                        set.done
                          ? "bg-emerald-500/5 border-emerald-500/20 text-white font-semibold"
                          : "bg-white/[0.01] border-white/5 text-muted-foreground line-through opacity-40",
                      )}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Série {setIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        {exLog.kind === "time" ? (
                          <span className="font-mono">{set.time ?? "—"} s</span>
                        ) : (
                          <span className="font-mono">{set.reps ?? "—"} reps</span>
                        )}

                        {set.weight !== undefined && set.weight > 0 && (
                          <span className="font-bold text-primary">{set.weight} kg</span>
                        )}

                        {set.rpe !== undefined && (
                          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-muted-foreground font-black font-mono">
                            RPE {set.rpe}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Exercise notes */}
                {exLog.notes && (
                  <p className="text-xs text-slate-400 border-l-2 border-primary/40 pl-2.5 italic mt-2 bg-white/[0.01] py-1">
                    {exLog.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </section>

      <div className="px-5 mt-8 mb-8">
        <Button
          onClick={() => navigate({ to: "/historique" })}
          className="w-full h-14 rounded-2xl btn-hero text-sm font-extrabold shadow-[0_8px_30px_rgba(139,92,246,0.3)]"
        >
          Retourner à l'historique
        </Button>
      </div>
    </PageShell>
  );
}
