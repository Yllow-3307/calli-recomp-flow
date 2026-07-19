import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Flame,
  Droplet,
  Beef,
  Footprints,
  ChevronRight,
  Play,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { getTodayProgram, RULES, type DayProgram } from "@/lib/program";
import {
  nutritionTargets,
  planDays,
  plannedSessionsPerWeek,
  WEEKDAY_LABELS,
  type GeneratedNutrition,
} from "@/lib/plan";
import {
  useAppState,
  useAppActions,
  computeStreak,
  thisWeekWorkouts,
  kmThisWeek,
  proteinToday,
  todayKey,
  isTestWeek,
  currentProgramWeek,
  programCycle,
  weeklyStats,
  type Profile,
  type WorkoutLog,
  type WeeklyStats,
} from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { WaterBottle } from "@/components/WaterBottle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aujourd'hui — Calli Recomp" },
      { name: "description", content: "Ta séance du jour, ta progression, tes rappels." },
    ],
  }),
  component: Dashboard,
});

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, X, ClipboardList, PartyPopper } from "lucide-react";

// Badges colorés de type de séance stylisés
export function SessionTypeBadge({
  type,
}: {
  type: "running" | "push" | "pull" | "legs" | "recovery" | "rest";
}) {
  const styles = {
    push: "bg-orange-500/15 text-orange-400 border-orange-500/25 shadow-[0_0_8px_rgba(249,115,22,0.1)]",
    pull: "bg-violet-500/15 text-violet-400 border-violet-500/25 shadow-[0_0_8px_rgba(139,92,246,0.1)]",
    legs: "bg-amber-500/15 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.1)]",
    running: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.1)]",
    recovery:
      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)]",
    rest: "bg-slate-500/15 text-slate-400 border-slate-500/25 shadow-[0_0_8px_rgba(100,116,139,0.1)]",
  };

  const labels = {
    push: "Push",
    pull: "Pull",
    legs: "Legs",
    running: "Running",
    recovery: "Rest",
    rest: "Rest",
  };

  return (
    <span
      className={`text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full border ${styles[type] || styles.rest}`}
    >
      {labels[type] || "Rest"}
    </span>
  );
}

function Dashboard() {
  const state = useAppState();
  const actions = useAppActions();
  const today = getTodayProgram(state.profile.daysPerWeek === 5, planDays(state.profile));
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });
  }, []);
  const streak = computeStreak(state.workouts);
  const done = thisWeekWorkouts(state.workouts).length;
  const km = kmThisWeek(state.cardio);
  const protein = proteinToday(state.meals);
  // Cibles personnalisées (plan généré à l'onboarding), recalculées sinon
  const nut = nutritionTargets(state.profile);
  const proteinTarget = Math.round((nut.proteinMin + nut.proteinMax) / 2);
  const water = state.water[todayKey()] || 0;
  const waterTarget = nut.waterL;
  const daysGoal = plannedSessionsPerWeek(state.profile);
  const showTestBanner = isTestWeek(state.profile);
  const week = currentProgramWeek(state.profile);
  const weekDays = planDays(state.profile);
  // Bilan hebdo (dimanche = semaine en cours, lundi = semaine écoulée)
  const recap = useMemo(() => weeklyStats(state), [state]);

  return (
    <PageShell>
      {/* Hero Header avec Gradient Animé Premium */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] border-b border-white/5 bg-slate-950/80 px-5 pt-8 pb-8 shadow-2xl">
        {/* Cercles de gradients floutés en arrière-plan */}
        <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl animate-pulse-subtle" />
        <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Tableau de bord
              </p>
              <h1 className="text-3xl font-black tracking-tight mt-1 text-gradient">Salut 👋</h1>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-muted-foreground bg-white/5 border border-white/10 px-3 py-1.5 rounded-full capitalize">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>

          {/* Connected User Indicator */}
          {userEmail && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-white/[0.04] border border-white/5 rounded-full px-3 py-1 w-fit">
                <UserCheck className="h-3 w-3 text-accent" />
                <span>Connecté : {userEmail}</span>
              </div>
            </div>
          )}

          {/* Streak / Weekly en mode premium aligné */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <Stat
              icon={<Flame className="h-4 w-4 text-orange-500" />}
              label="Streak"
              value={`${streak}j`}
              accent
            />
            <Stat
              icon={<Sparkles className="h-4 w-4 text-purple-400" />}
              label="Semaine"
              value={`${done}/${daysGoal}`}
            />
            <Stat
              icon={<Footprints className="h-4 w-4 text-cyan-400" />}
              label="Course"
              value={`${km.toFixed(1)} km`}
            />
          </div>
        </div>
      </div>

      {/* Pastilles de la semaine (fait / prévu / repos) */}
      <WeekStripCard days={weekDays} workouts={state.workouts} />

      {/* Fin de cycle (semaine 12) */}
      <CycleEndCard profile={state.profile} />

      {showTestBanner && (
        <div className="px-5 mt-5">
          <Link
            to="/progression"
            className="card-premium p-4 flex items-center gap-3 border-l-4 border-l-primary hover:border-primary/40"
            style={{ backgroundImage: "var(--gradient-card)" }}
          >
            <div className="h-10 w-10 grid place-items-center rounded-full btn-hero shrink-0 animate-float">
              <Target className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gradient">Semaine de test S{week}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Enregistre tes max reps & temps.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>
      )}

      {/* Bilan hebdo (dimanche / lundi, masquable) */}
      <WeeklyRecapCard recap={recap} planned={daysGoal} nut={nut} />

      {/* Grille desktop : [séance | nutrition] puis [règles | raccourcis] — colonnes inchangées sur mobile */}
      <div className="masonry-lg masonry-xl-3">
        {/* Today's session */}
        <section className="px-5 mt-6 lg:mt-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Séance du jour
            </p>
            <SessionTypeBadge type={today.type} />
          </div>
          {/* Panel héros "Coral Glass" (inspi app running) */}
          <Link
            to="/seance"
            className="panel-coral card-premium-hover block p-5 relative overflow-hidden group"
          >
            {/* Lueur de survol subtile */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="min-w-0">
                <div className="text-4xl mb-3">{today.emoji}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {today.day}
                </p>
                <h2 className="text-xl font-black mt-1 group-hover:text-primary transition-colors">
                  {today.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{today.summary}</p>
                <div className="flex items-center gap-2 mt-3 text-xs font-semibold text-muted-foreground">
                  <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                    ⏱️ ~{today.duration} min
                  </span>
                </div>
              </div>
              <div className="grid place-items-center h-12 w-12 rounded-full btn-hero shrink-0 shadow-[0_4px_20px_rgba(255,107,74,0.55)] group-hover:scale-105 transition-transform duration-300">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            </div>
          </Link>
        </section>

        {/* Nutrition — cartes colorées par catégorie (inspi dashboard) */}
        <section className="px-5 mt-6 lg:mt-0 grid grid-cols-2 lg:grid-cols-1 gap-3">
          {/* Protéines · lime */}
          <div className="card-premium p-4 border border-lime-400/25 bg-gradient-to-b from-lime-400/[0.12] to-transparent">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <Beef className="h-4 w-4 text-lime-400" /> Protéines
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-lime-200">
              {protein}
              <span className="text-xs text-muted-foreground font-medium"> / {proteinTarget}g</span>
            </p>
            <div className="mt-2.5 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(183,240,76,0.5)]"
                style={{ width: `${Math.min(100, (protein / proteinTarget) * 100)}%` }}
              />
            </div>
          </div>
          {/* Eau · cyan + bouteille qui se remplit */}
          <div className="card-premium p-4 border border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.12] to-transparent flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <WaterBottle liters={water} target={waterTarget} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
                  <Droplet className="h-4 w-4 text-cyan-400" /> Eau
                </div>
                <p className="mt-1.5 text-2xl font-black tracking-tight text-cyan-100">
                  {water.toFixed(1)}
                  <span className="text-xs text-muted-foreground font-medium">
                    {" "}
                    / {waterTarget}L
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-7 text-[10px] font-bold bg-white/5 hover:bg-cyan-400/20 hover:text-cyan-100 text-foreground border border-white/5 rounded-lg transition-colors"
                onClick={() => actions.addWater(0.25)}
              >
                +25cl
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-7 text-[10px] font-bold bg-white/5 hover:bg-cyan-400/20 hover:text-cyan-100 text-foreground border border-white/5 rounded-lg transition-colors"
                onClick={() => actions.addWater(0.5)}
              >
                +50cl
              </Button>
            </div>
          </div>
        </section>

        {/* Rules of gold */}
        <section className="px-5 mt-6 lg:mt-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold px-1">
            Règles d'or
          </p>
          <div className="card-premium p-5 space-y-3 border border-white/[0.05]">
            {RULES.map((r, idx) => (
              <p
                key={r}
                className="text-sm flex items-start gap-2.5 text-slate-300 leading-relaxed"
              >
                <span className="text-primary font-black mt-0.5 text-base">0{idx + 1}</span>
                <span>{r}</span>
              </p>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section className="px-5 mt-6 lg:mt-0 mb-8 space-y-2">
          <QuickLink
            to="/historique"
            label="Historique des séances"
            icon={<Trophy className="h-4 w-4 text-purple-400" />}
          />
          <QuickLink
            to="/mesures"
            label="Mesures & photos"
            icon={<Target className="h-4 w-4 text-cyan-400" />}
          />
          <QuickLink
            to="/progression"
            label="Progression 3 mois"
            icon={<Sparkles className="h-4 w-4 text-amber-400" />}
          />
        </section>
      </div>
    </PageShell>
  );
}

/** Vue hebdo : pastilles L→D (✓ fait · emoji = séance prévue · point = repos). */
function WeekStripCard({ days, workouts }: { days: DayProgram[]; workouts: WorkoutLog[] }) {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const doneKeys = useMemo(() => new Set(workouts.map((w) => w.date.slice(0, 10))), [workouts]);
  return (
    <section className="px-5 mt-4">
      <div className="card-premium p-3.5 border border-white/[0.05]">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const key = date.toISOString().slice(0, 10);
            const isDone = doneKeys.has(key);
            const isPlanned = d.type !== "rest";
            const isToday = key === todayKey();
            return (
              <div key={d.key} className="flex flex-col items-center gap-1">
                <span
                  className={`text-[9px] font-bold uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}
                >
                  {WEEKDAY_LABELS[i]}
                </span>
                <span
                  className={`h-8 w-8 grid place-items-center rounded-full border text-[11px] ${
                    isDone
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-black"
                      : isPlanned
                        ? "bg-white/[0.03] border-white/10 opacity-70"
                        : "border-white/5 text-slate-600"
                  }`}
                >
                  {isDone ? "✓" : isPlanned ? d.emoji : "·"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Carte « Fin du cycle » (semaine 12) → régénération du plan sur perfs réelles. */
function CycleEndCard({ profile }: { profile: Profile }) {
  const { cycle, cycleWeek } = programCycle(profile);
  if (!profile.onboarded || cycleWeek !== 12) return null;
  return (
    <div className="px-5 mt-5">
      <Link
        to="/onboarding"
        className="card-premium p-4 flex items-center gap-3 border-l-4 border-l-amber-400 hover:border-amber-400/40"
        style={{ backgroundImage: "var(--gradient-card)" }}
      >
        <div className="h-10 w-10 grid place-items-center rounded-full btn-hero shrink-0 animate-float">
          <PartyPopper className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gradient">Fin du cycle {cycle} 🎉</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Régénère ton plan : tes capacités seront recalculées sur tes vraies perfs ✨
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}

/** Bilan du dimanche / lundi : stats + 1 conseil ciblé (masquable jusqu'à la semaine suivante). */
function WeeklyRecapCard({
  recap,
  planned,
  nut,
}: {
  recap: WeeklyStats | null;
  planned: number;
  nut: GeneratedNutrition;
}) {
  const [dismissed, setDismissed] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("weekly-recap-dismissed") : null,
  );
  if (!recap || dismissed === recap.windowKey) return null;
  const advice =
    recap.sessions < planned
      ? "Sans jugement 🙂 bloque tes créneaux tout de suite — même 30 min comptent."
      : recap.proteinAvg !== null && recap.proteinAvg < nut.proteinMin
        ? "Protéines un peu basses : ajoute un shake ou des œufs au petit-dej."
        : recap.waterAvg !== null && recap.waterAvg < nut.waterL
          ? "Hydratation courte : garde une bouteille d'1L visible sur ton bureau."
          : "Semaine carrée 🔥 Reconduis exactement ça.";
  const close = () => {
    localStorage.setItem("weekly-recap-dismissed", recap.windowKey);
    setDismissed(recap.windowKey);
  };
  return (
    <div className="px-5 mt-5">
      <div className="card-premium p-4 border border-violet-400/25 bg-gradient-to-b from-violet-400/[0.08] to-transparent relative">
        <button
          onClick={close}
          aria-label="Masquer le bilan"
          className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-white p-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-violet-300 mb-3">
          <ClipboardList className="h-4 w-4" /> Bilan — {recap.label}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-base font-black">
              {recap.sessions}
              <span className="text-[10px] text-muted-foreground font-semibold">/{planned}</span>
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">séances</p>
          </div>
          <div>
            <p className="text-base font-black">{recap.km}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">km</p>
          </div>
          <div>
            <p className="text-base font-black">
              {recap.proteinAvg !== null ? `${recap.proteinAvg}g` : "—"}
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">prot/j</p>
          </div>
          <div>
            <p className="text-base font-black">
              {recap.waterAvg !== null ? `${recap.waterAvg}L` : "—"}
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">eau/j</p>
          </div>
        </div>
        {recap.weightDelta !== null && (
          <p className="text-[11px] text-muted-foreground mt-2.5">
            ⚖️ Poids sur la période :{" "}
            <b className={recap.weightDelta <= 0 ? "text-emerald-300" : "text-amber-300"}>
              {recap.weightDelta > 0 ? "+" : ""}
              {recap.weightDelta} kg
            </b>
          </p>
        )}
        <p className="text-[11px] text-violet-200/90 mt-2.5 leading-relaxed border-t border-white/5 pt-2.5">
          💡 {advice}
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-premium p-3 text-center border ${accent ? "border-primary/20 bg-white/[0.03]" : "border-white/[0.05]"}`}
    >
      <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p
        className={`mt-2 text-xl font-black tracking-tight ${accent ? "text-gradient" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="card-premium card-premium-hover flex items-center justify-between p-4 border border-white/[0.05] group"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
          {label}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
