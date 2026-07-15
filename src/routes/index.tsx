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
} from "lucide-react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { getTodayProgram, RULES, NUTRITION } from "@/lib/program";
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
} from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aujourd'hui — Calli Recomp" },
      { name: "description", content: "Ta séance du jour, ta progression, tes rappels." },
    ],
  }),
  component: Dashboard,
});

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck } from "lucide-react";

function Dashboard() {
  const state = useAppState();
  const actions = useAppActions();
  const today = getTodayProgram(state.profile.daysPerWeek === 5);
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
  const proteinTarget = Math.round(
    state.profile.weight * ((NUTRITION.protein_g_per_kg[0] + NUTRITION.protein_g_per_kg[1]) / 2),
  );
  const water = state.water[todayKey()] || 0;
  const waterTarget = (NUTRITION.water_l_per_day[0] + NUTRITION.water_l_per_day[1]) / 2;
  const daysGoal = state.profile.daysPerWeek;
  const showTestBanner = isTestWeek(state.profile);
  const week = currentProgramWeek(state.profile);

  return (
    <PageShell>
      <TopBar
        title="Salut 👋"
        subtitle={new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />

      {/* Connected User Indicator */}
      {userEmail && (
        <div className="px-5 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/40 border border-border/40 rounded-full px-3 py-1.5 w-fit">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            <span>Connecté : {userEmail}</span>
          </div>
        </div>
      )}

      {/* Streak / Weekly */}
      <div className="px-5 grid grid-cols-3 gap-3">
        <Stat icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak}j`} accent />
        <Stat
          icon={<Sparkles className="h-4 w-4" />}
          label="Semaine"
          value={`${done}/${daysGoal}`}
        />
        <Stat
          icon={<Footprints className="h-4 w-4" />}
          label="Course"
          value={`${km.toFixed(1)} km`}
        />
      </div>

      {showTestBanner && (
        <div className="px-5 mt-4">
          <Link
            to="/progression"
            className="card-premium p-3 flex items-center gap-3 ring-1 ring-primary/40"
          >
            <div className="h-9 w-9 grid place-items-center rounded-full btn-hero shrink-0">
              <Target className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Semaine de test S{week}</p>
              <p className="text-[11px] text-muted-foreground">Enregistre tes max reps & temps.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      )}

      {/* Today's session */}
      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Séance du jour
        </p>
        <Link
          to="/seance"
          className="card-premium block p-5 relative overflow-hidden"
          style={{ backgroundImage: "var(--gradient-card)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-4xl mb-2">{today.emoji}</div>
              <p className="text-xs text-muted-foreground">{today.day}</p>
              <h2 className="text-xl font-black mt-0.5">{today.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{today.summary}</p>
              <p className="text-xs text-muted-foreground mt-2">⏱️ ~{today.duration} min</p>
            </div>
            <div className="grid place-items-center h-12 w-12 rounded-full btn-hero shrink-0">
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>
        </Link>
      </section>

      {/* Nutrition rings */}
      <section className="px-5 mt-5 grid grid-cols-2 gap-3">
        <div className="card-premium p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Beef className="h-4 w-4" /> Protéines
          </div>
          <p className="mt-2 text-2xl font-black">
            {protein}
            <span className="text-sm text-muted-foreground font-medium"> / {proteinTarget}g</span>
          </p>
          <Progress value={Math.min(100, (protein / proteinTarget) * 100)} className="mt-2 h-1.5" />
        </div>
        <div className="card-premium p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Droplet className="h-4 w-4" /> Eau
          </div>
          <p className="mt-2 text-2xl font-black">
            {water.toFixed(1)}
            <span className="text-sm text-muted-foreground font-medium"> / {waterTarget}L</span>
          </p>
          <div className="mt-2 flex gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 h-7 text-xs"
              onClick={() => actions.addWater(0.25)}
            >
              +25cl
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 h-7 text-xs"
              onClick={() => actions.addWater(0.5)}
            >
              +50cl
            </Button>
          </div>
        </div>
      </section>

      {/* Rules of gold */}
      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Règles d'or</p>
        <div className="card-premium p-4 space-y-2">
          {RULES.map((r) => (
            <p key={r} className="text-sm flex items-start gap-2">
              <span className="text-primary mt-0.5">▸</span>
              <span>{r}</span>
            </p>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="px-5 mt-5 space-y-2">
        <QuickLink to="/historique" label="Historique des séances" />
        <QuickLink to="/mesures" label="Mesures & photos" />
        <QuickLink to="/progression" label="Progression 3 mois" />
        <QuickLink to="/programme" label="Programme complet" />
      </section>
    </PageShell>
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
    <div className={`card-premium p-3 ${accent ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-lg font-black ${accent ? "text-gradient" : ""}`}>{value}</p>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="card-premium flex items-center justify-between p-4">
      <span className="font-semibold">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
