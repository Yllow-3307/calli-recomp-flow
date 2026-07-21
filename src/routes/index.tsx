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
  Pencil,
  Check,
  Trash2,
  GripVertical,
  MoveDiagonal2,
  RefreshCw,
  Loader2,
  Music,
  Wheat,
  Egg,
  Medal,
} from "lucide-react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { getTodayProgram, RULES, SKILLS_GUIDE, type DayProgram } from "@/lib/program";
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
  generateUUID,
  type Profile,
  type WorkoutLog,
  type WeeklyStats,
} from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  normalizeHomeLayout,
  HOME_BLOCKS,
  blockKeyOf,
  type HomeBlockInstance,
  type HomeBlockKind,
  type HomeSection,
} from "@/lib/home-layout";
import { WaterBottle } from "@/components/WaterBottle";
import { WeightChart } from "@/components/WeightChart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accueil — Calli Recomp" },
      { name: "description", content: "Ta séance du jour, ta progression, tes rappels." },
    ],
  }),
  component: Dashboard,
});

import { useState, useEffect, useMemo, useRef } from "react";
import { computeAutoStatus, SKILL_STATUS_META } from "@/lib/skill-status";
import { loadNotionSettings, syncToNotion } from "@/lib/notion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, X, ClipboardList, PartyPopper, ExternalLink } from "lucide-react";

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

  // ---- Mise en page personnalisable de l'accueil ----
  const layout = useMemo(
    () => normalizeHomeLayout(state.profile.homeLayout ?? []),
    [state.profile.homeLayout],
  );
  const [editing, setEditing] = useState(false);

  const applyLayout = (next: HomeSection[]) => actions.setProfile({ homeLayout: next });

  // ---- Glisser-déposer des blocs (Pointer Events : tactile ET souris) ----
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{
    from: { si: number; bi: number };
    dx: number;
    dy: number;
    over: { si: number; bi: number } | null;
  } | null>(null);
  const dragging = drag !== null;

  const moveBlockToIndex = (from: { si: number; bi: number }, to: { si: number; bi: number }) => {
    if (from.si === to.si && (to.bi === from.bi || to.bi === from.bi + 1)) return;
    const next = layoutRef.current.map((s) => ({ ...s, blocks: [...s.blocks] }));
    const fromSec = next[from.si];
    const toSec = next[to.si];
    if (!fromSec || !toSec) return;
    const [b] = fromSec.blocks.splice(from.bi, 1);
    if (!b) return;
    const ti = from.si === to.si && to.bi > from.bi ? to.bi - 1 : to.bi;
    toSec.blocks.splice(Math.min(ti, toSec.blocks.length), 0, b);
    applyLayout(next);
  };

  const startBlockDrag = (e: React.PointerEvent, si: number, bi: number) => {
    e.preventDefault();
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    setDrag({ from: { si, bi }, dx: 0, dy: 0, over: null });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (ev: PointerEvent) => {
      const origin = dragOrigin.current;
      if (!origin) return;
      const dx = ev.clientX - origin.x;
      const dy = ev.clientY - origin.y;
      let over: { si: number; bi: number } | null = null;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const cell = el?.closest?.("[data-block-pos]");
      if (cell) {
        const [s, b] = (cell.getAttribute("data-block-pos") ?? "0:0").split(":").map(Number);
        const r = cell.getBoundingClientRect();
        over = { si: s, bi: ev.clientY > r.top + r.height / 2 ? b + 1 : b };
      } else {
        const grid = el?.closest?.("[data-sec-grid]");
        if (grid) {
          const s = Number(grid.getAttribute("data-sec-grid"));
          over = { si: s, bi: layoutRef.current[s]?.blocks.length ?? 0 };
        }
      }
      setDrag((d) => (d ? { ...d, dx, dy, over } : d));
    };
    const onUp = () => {
      setDrag((d) => {
        if (d?.over && (Math.abs(d.dx) > 4 || Math.abs(d.dy) > 4)) moveBlockToIndex(d.from, d.over);
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // ---- Redimensionnement fluide continu (Pointer Events, pas de snap) ----
  // ---- Redimensionnement style Apple : 3 poignées, fluide, hauteur + largeur ----
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; si: number; bi: number; mode: "corner" | "bottom" | "right" } | null>(null);
  const setBlockSpan = (si: number, bi: number, span: 1 | 2 | 3) => {
    const next = layoutRef.current.map((s) => ({ ...s, blocks: [...s.blocks] }));
    if (!next[si]?.blocks[bi]) return;
    next[si].blocks[bi].span = span;
    applyLayout(next);
  };
  const setBlockHeight = (si: number, bi: number, height: 1 | 2 | 3 | 4) => {
    const next = layoutRef.current.map((s) => ({ ...s, blocks: [...s.blocks] }));
    if (!next[si]?.blocks[bi]) return;
    next[si].blocks[bi].height = height;
    applyLayout(next);
  };
  const startResize = (e: React.PointerEvent, si: number, bi: number, mode: "corner" | "bottom" | "right") => {
    e.preventDefault();
    const cur = layoutRef.current[si]?.blocks[bi];
    if (!cur) return;
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: cur.span, origH: cur.height, si, bi, mode };
    const onMove = (ev: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      if (r.mode === "corner" || r.mode === "right") {
        const dx = ev.clientX - r.startX;
        const newW = Math.min(3, Math.max(1, r.origW + Math.round(dx / 90))) as 1 | 2 | 3;
        if (layoutRef.current[r.si]?.blocks[r.bi]?.span !== newW) setBlockSpan(r.si, r.bi, newW);
      }
      if (r.mode === "corner" || r.mode === "bottom") {
        const dy = ev.clientY - r.startY;
        const newH = Math.min(4, Math.max(1, r.origH + Math.round(dy / 60))) as 1 | 2 | 3 | 4;
        if (layoutRef.current[r.si]?.blocks[r.bi]?.height !== newH) setBlockHeight(r.si, r.bi, newH);
      }
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const removeBlock = (si: number, bi: number) => {
    const next = layout.map((s) => ({ ...s, blocks: [...s.blocks] }));
    next[si].blocks.splice(bi, 1);
    applyLayout(next);
  };

  const addBlock = (si: number, kind: HomeBlockKind, refId?: string) => {
    const next = layout.map((s) => ({ ...s, blocks: [...s.blocks] }));
    const inst: HomeBlockInstance = { kind, span: HOME_BLOCKS[kind].defaultSpan, height: 1 };
    if (refId) inst.refId = refId;
    next[si].blocks.push(inst);
    applyLayout(next);
  };

  const setBlockRef = (si: number, bi: number, refId: string) => {
    const next = layout.map((s) => ({ ...s, blocks: [...s.blocks] }));
    if (!next[si]?.blocks[bi]) return;
    next[si].blocks[bi].refId = refId;
    applyLayout(next);
  };

  const addSection = () => applyLayout([...layout, { id: generateUUID(), title: "", blocks: [] }]);

  const renameSection = (si: number, title: string) => {
    const next = layout.map((s) => ({ ...s, blocks: [...s.blocks] }));
    next[si].title = title;
    applyLayout(next);
  };

  const removeSection = (si: number) => {
    if (layout.length <= 1) {
      toast.error("Il faut garder au moins une sous-section.");
      return;
    }
    const next = layout.map((s) => ({ ...s, blocks: [...s.blocks] }));
    const [removed] = next.splice(si, 1);
    const target = si > 0 ? si - 1 : 0;
    next[target].blocks.push(...removed.blocks);
    applyLayout(next);
  };

  const resetLayout = () => {
    if (confirm("Revenir a la mise en page d'origine de l'accueil ?")) applyLayout([]);
  };

  /** Réorganise les blocs pour combler les trous visuels : tri par span descendant (gros d'abord)
   *  puis position dans la section. Utile après un resize sauvage. */
  const compactLayout = () => {
    const next = layout.map((s) => ({
      ...s,
      blocks: [...s.blocks].sort((a, b) => {
        if (a.span !== b.span) return b.span - a.span; // les plus larges d'abord
        return blockKeyOf(a).localeCompare(blockKeyOf(b));
      }),
    }));
    applyLayout(next);
    toast.success("Blocs réorganisés pour remplir les trous ✨");
  };

  const usedKinds = new Set(layout.flatMap((s) => s.blocks.map((b) => b.kind)));
  const unusedKinds = (Object.keys(HOME_BLOCKS) as HomeBlockKind[]).filter(
    (k) => !HOME_BLOCKS[k].multi && !usedKinds.has(k),
  );
  const usedSkillRefs = new Set(
    layout.flatMap((s) =>
      s.blocks.filter((b) => b.kind === "skill" && b.refId).map((b) => b.refId as string),
    ),
  );
  /** Entrées proposées par le bouton « + Bloc » (blocs restants + chaque skill individuel). */
  const addableEntries: { kind: HomeBlockKind; refId?: string; label: string; hint?: string }[] = [
    ...unusedKinds.map((k) => ({
      kind: k,
      label: HOME_BLOCKS[k].label,
      hint: HOME_BLOCKS[k].hint,
    })),
    ...SKILLS_GUIDE.filter((g) => !usedSkillRefs.has(g.id)).map((g) => ({
      kind: "skill" as HomeBlockKind,
      refId: g.id,
      label: `🎯 ${g.name}`,
      hint: "Carte dédiée à ce skill (niveau + record)",
    })),
  ];
  const [addOpen, setAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState(0);

  // Totaux nutrition du jour (blocs Kcal / Glucides / Lipides)
  const todayMeals = useMemo(
    () => state.meals.filter((m) => (m.date ?? "").slice(0, 10) === todayKey()),
    [state.meals],
  );
  const kcalToday = Math.round(todayMeals.reduce((a, m) => a + m.kcal, 0));
  const carbsToday = Math.round(todayMeals.reduce((a, m) => a + m.carbs, 0));
  const fatToday = Math.round(todayMeals.reduce((a, m) => a + m.fat, 0));

  const blockContent = (si: number, bi: number, b: HomeBlockInstance) => {
    switch (b.kind) {
      case "cycle":
        return <CycleEndCard profile={state.profile} />;
      case "testsBanner":
        return showTestBanner ? (
          <div>
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
                  Enregistre tes max reps &amp; temps.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        ) : editing ? (
          <PlaceholderBlock text="Banniere << semaine de test >> : visible automatiquement les semaines S4, S8 et S12." />
        ) : null;
      case "bilan":
        return <WeeklyRecapCard recap={recap} planned={daysGoal} nut={nut} />;
      case "seance":
        return (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                Seance du jour
              </p>
              <SessionTypeBadge type={today.type} />
            </div>
            <Link
              to="/seance"
              className="panel-coral card-premium-hover block p-5 relative overflow-hidden group"
            >
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
                      ~{today.duration} min
                    </span>
                  </div>
                </div>
                <div className="grid place-items-center h-12 w-12 rounded-full btn-hero shrink-0 shadow-[0_4px_20px_rgba(255,107,74,0.55)] group-hover:scale-105 transition-transform duration-300">
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                </div>
              </div>
            </Link>
          </div>
        );
      case "nutrition":
        return (
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="card-premium p-4 border border-lime-400/25 bg-gradient-to-b from-lime-400/[0.12] to-transparent flex flex-col">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
                <Beef className="h-4 w-4 text-lime-400" /> Proteines
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-lime-200">
                {protein}
                <span className="text-xs text-muted-foreground font-medium">
                  {" "}
                  / {proteinTarget}g
                </span>
              </p>
              <div className="mt-2.5 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(183,240,76,0.5)]"
                  style={{ width: `${Math.min(100, (protein / proteinTarget) * 100)}%` }}
                />
              </div>
            </div>
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
          </div>
        );
      case "regles":
        return (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold px-1">
              Regles d'or
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
          </div>
        );
      case "liens":
        return (
          <div className="space-y-2">
            <QuickLink
              to="/historique"
              label="Historique des seances"
              icon={<Trophy className="h-4 w-4 text-purple-400" />}
            />
            <QuickLink
              to="/mesures"
              label="Mesures &amp; photos"
              icon={<Target className="h-4 w-4 text-cyan-400" />}
            />
            <QuickLink
              to="/progression"
              label="Progression 3 mois"
              icon={<Sparkles className="h-4 w-4 text-amber-400" />}
            />
          </div>
        );
      case "kcal":
        return (
          <MacroBlock
            label="Kcal du jour"
            icon={<Flame className="h-4 w-4 text-orange-400" />}
            value={kcalToday}
            target={nut.kcalTarget}
            unit="kcal"
            gradient="from-orange-400 to-amber-400"
            textCls="text-orange-200"
            borderCls="border-orange-400/25 from-orange-400/[0.12]"
          />
        );
      case "glucides":
        return (
          <MacroBlock
            label="Glucides du jour"
            icon={<Wheat className="h-4 w-4 text-sky-400" />}
            value={carbsToday}
            target={nut.carbsTarget}
            unit="g"
            gradient="from-sky-400 to-cyan-400"
            textCls="text-sky-200"
            borderCls="border-sky-400/25 from-sky-400/[0.12]"
          />
        );
      case "lipides":
        return (
          <MacroBlock
            label="Lipides du jour"
            icon={<Egg className="h-4 w-4 text-yellow-400" />}
            value={fatToday}
            target={nut.fatTarget}
            unit="g"
            gradient="from-yellow-400 to-amber-400"
            textCls="text-yellow-200"
            borderCls="border-yellow-400/25 from-yellow-400/[0.12]"
          />
        );
      case "skills":
        return <HomeSkillsBlock />;
      case "skill":
        return (
          <HomeSkillBlock
            skillId={b.refId}
            editing={editing}
            onPick={(id) => setBlockRef(si, bi, id)}
          />
        );
      case "syncData":
        return <SyncDataBlock />;
      case "mesures":
        return <HomeMesuresBlock />;
      case "musique":
        return <MusiqueBlock />;
    }
  };

  const renderBlock = (si: number, bi: number, b: HomeBlockInstance) => {
    const content = blockContent(si, bi, b);
    if (!editing && content === null) return null;
    const spanCls = b.span === 3 ? "lg:col-span-3" : b.span === 2 ? "lg:col-span-2" : "";
    const heightCls = b.height === 4 ? "lg:row-span-4 min-h-[28rem]" : b.height === 3 ? "lg:row-span-3 min-h-[22rem]" : b.height === 2 ? "lg:row-span-2 min-h-[16rem]" : "min-h-[10rem]";
    const isDragged = drag?.from.si === si && drag?.from.bi === bi;
    const isDropTarget = editing && drag?.over?.si === si && drag?.over?.bi === bi && !isDragged;
    return (
      <div
        key={blockKeyOf(b)}
        data-block-pos={`${si}:${bi}`}
        className={`${spanCls} ${
          isDropTarget
            ? "rounded-2xl outline-2 outline-dashed outline-primary/70 -outline-offset-2"
            : ""
        }`}
        style={
          isDragged && drag
            ? {
                transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.03)`,
                zIndex: 50,
                opacity: 0.92,
                pointerEvents: "none",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--color-primary)",
                borderRadius: "1rem",
                transition: "box-shadow 0.15s ease",
              }
            : undefined
        }
      >
        <div className="relative isolate">
          {editing && (
            <div className="absolute -top-2 right-2 z-20 flex gap-1 rounded-full border border-primary/40 bg-slate-950/95 p-1 shadow-lg">
              <button
                type="button"
                title="Glisser pour deplacer"
                aria-label="Glisser pour deplacer"
                onPointerDown={(e) => startBlockDrag(e, si, bi)}
                className="h-6 w-6 grid place-items-center rounded-md cursor-grab active:cursor-grabbing touch-none hover:bg-white/10 transition-colors"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <EditBtn title="Retirer" danger onClick={() => removeBlock(si, bi)}>
                <Trash2 className="h-3.5 w-3.5" />
              </EditBtn>
            </div>
          )}
          <div
            className={`flex flex-col ${heightCls} ${
              editing
                ? "rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] p-1 pt-6"
                : ""
            }`}
          >
            <div className="flex-1">{content ?? <PlaceholderBlock text={HOME_BLOCKS[b.kind].label} />}</div>
          </div>
          {editing && (
            <>
              {/* Coin bas-droit : largeur + hauteur */}
              <button
                type="button"
                title="Redimensionner (largeur + hauteur)"
                aria-label="Redimensionner (largeur + hauteur)"
                onPointerDown={(e) => startResize(e, si, bi, "corner")}
                className="absolute -bottom-2 -right-2 z-40 h-6 w-6 grid place-items-center rounded-full border-2 border-primary bg-slate-950 shadow-[0_0_0_2px_rgba(255,107,74,0.3),0_4px_12px_rgba(0,0,0,0.4)] cursor-nw-resize touch-none hover:scale-125 active:scale-90 transition-transform"
              >
                <MoveDiagonal2 className="h-3 w-3 text-primary" />
              </button>
              {/* Bord droit : largeur seule */}
              <button
                type="button"
                title="Redimensionner (largeur)"
                aria-label="Redimensionner (largeur)"
                onPointerDown={(e) => startResize(e, si, bi, "right")}
                className="absolute -top-0 -right-2 z-40 h-8 w-2 rounded-full bg-primary/60 shadow-[0_0_0_1px_rgba(255,107,74,0.3)] cursor-ew-resize touch-none hover:bg-primary transition-colors"
              />
              {/* Bord bas : hauteur seule */}
              <button
                type="button"
                title="Redimensionner (hauteur)"
                aria-label="Redimensionner (hauteur)"
                onPointerDown={(e) => startResize(e, si, bi, "bottom")}
                className="absolute -bottom-2 left-2 z-40 h-2 w-8 rounded-full bg-primary/60 shadow-[0_0_0_1px_rgba(255,107,74,0.3)] cursor-ns-resize touch-none hover:bg-primary transition-colors"
              />
            </>
          )}
        </div>
      </div>
    );
  };

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
                <span>Connecté : {state.profile.username || userEmail}</span>
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

      {/* Barre de personalisation de l'accueil */}
      <div className="px-5 mt-4 flex flex-wrap justify-end gap-2">
        {editing && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs border-dashed"
              onClick={addSection}
            >
              + Sous-section
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs border-dashed"
              onClick={() => {
                setAddTarget(Math.max(0, layout.length - 1));
                setAddOpen(true);
              }}
            >
              + Bloc
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-xs text-muted-foreground"
              onClick={compactLayout}
            >
              Réorganiser
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-xs text-muted-foreground"
              onClick={resetLayout}
            >
              Reinitialiser
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant={editing ? "default" : "outline"}
          className={editing ? "btn-hero rounded-full text-xs" : "rounded-full text-xs"}
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? (
            <Check className="h-3.5 w-3.5 mr-1" />
          ) : (
            <Pencil className="h-3.5 w-3.5 mr-1" />
          )}
          {editing ? "Terminer" : "Personnaliser"}
        </Button>
      </div>

      {/* Sections personnalisables de l'accueil */}
      <div className="mt-2 space-y-5 pb-8">
        {layout.map((sec, si) => (
          <section key={sec.id}>
            {editing ? (
              <div className="px-5 mb-2 flex items-center gap-2">
                <Input
                  value={sec.title}
                  onChange={(e) => renameSection(si, e.target.value)}
                  placeholder="Nom de la sous-section (optionnel)"
                  className="h-8 max-w-64 text-xs bg-input border-dashed"
                />
                <EditBtn title="Supprimer la sous-section" danger onClick={() => removeSection(si)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </EditBtn>
              </div>
            ) : (
              sec.title.trim() !== "" && (
                <h2 className="px-5 mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {sec.title}
                </h2>
              )
            )}
            <div
              data-sec-grid={si}
              className="grid grid-cols-1 gap-3 px-5 lg:grid-cols-3 lg:gap-6 lg:grid-flow-dense"
            >
              {sec.blocks.map((b, bi) => renderBlock(si, bi, b))}
              {editing && sec.blocks.length === 0 && (
                <p className="text-[11px] text-muted-foreground/70 italic py-2">
                  <span className="hidden sm:inline">Sous-section vide — ajoute un bloc avec le bouton « + Bloc » ci-dessus.</span><span className="sm:hidden">Sous-section vide — ajoute un bloc.</span>
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Panneau « + Bloc » : tous les blocs de l'app, section cible au choix */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[2rem] border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl pb-8 max-w-md mx-auto max-h-[75vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-center font-black">Ajouter un bloc</SheetTitle>
          </SheetHeader>
          <div className="pt-3 pb-1 flex items-center gap-2">
            <p className="text-xs text-muted-foreground shrink-0">Dans la sous-section :</p>
            <Select value={String(addTarget)} onValueChange={(v) => setAddTarget(Number(v))}>
              <SelectTrigger className="h-8 flex-1 text-xs bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layout.map((s, i) => (
                  <SelectItem key={s.id} value={String(i)}>
                    {s.title.trim() || `Sous-section ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {addableEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              <span className="hidden sm:inline">Tous les blocs sont deja sur ton accueil 🎉</span><span className="sm:hidden">Tous les blocs sont là 🎉</span>
            </p>
          ) : (
            <div className="grid gap-2 pt-2">
              {addableEntries.map((e) => (
                <button
                  key={`${e.kind}|${e.refId ?? ""}`}
                  type="button"
                  onClick={() => {
                    addBlock(addTarget, e.kind, e.refId);
                    setAddOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.06] active:scale-[0.98] transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{e.label}</p>
                    {e.hint && (
                      <p className="text-[11px] text-muted-foreground truncate">{e.hint}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
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

/** Barre de progression du cycle en cours (SVG cercle). */
function CycleProgressBar({ profile }: { profile: Profile }) {
  const { cycle, cycleWeek } = programCycle(profile);
  const pct = Math.round((cycleWeek / 12) * 100);
  const size = 48;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-500"
        />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-foreground)">
          {pct}%
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-xs font-bold">Cycle {cycle}</p>
        <p className="text-[10px] text-muted-foreground">Semaine {cycleWeek}/12</p>
      </div>
    </div>
  );
}

/** Estimation des calories brûlées via MET (approximatif). */
function useCalorieBurn(): number | null {
  const state = useAppState();
  return useMemo(() => {
    const thisWeek = thisWeekWorkouts(state.workouts);
    if (!thisWeek.length) return null;
    // MET ~5 pour muscu, ~8 pour running
    const total = thisWeek.reduce((a, w) => {
      const met = w.dayKey === "mon" || w.dayKey === "wed" || w.dayKey === "fri" ? 8 : 5;
      return a + met * (state.profile.weight || 75) * (w.duration / 60);
    }, 0);
    return Math.round(total);
  }, [state.workouts, state.profile.weight]);
}

/** Carte « Fin du cycle » (semaine 12) → régénération du plan sur perfs réelles. */
function CycleEndCard({ profile }: { profile: Profile }) {
  const { cycle, cycleWeek } = programCycle(profile);
  if (!profile.onboarded || cycleWeek !== 12) return null;
  return (
    <div>
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
            <span className="hidden sm:inline">Régénère ton plan : tes capacités seront recalculées sur tes vraies perfs ✨</span><span className="sm:hidden">Régénère le plan → perfs ✨</span>
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
    <div>
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

/** Petit bouton rond de la barre d'edition d'un bloc. */
function EditBtn({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`h-6 w-6 grid place-items-center rounded-md transition-colors disabled:opacity-30 ${
        danger ? "hover:text-destructive hover:bg-destructive/10" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

/** Carton d'information visible en mode edition pour un bloc conditionnel. */
function PlaceholderBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 p-4 text-[11px] text-muted-foreground">
      {text}
    </div>
  );
}

/** Carte macro generique (Kcal / Glucides / Lipides) avec barre de progression. */
function MacroBlock({
  label,
  icon,
  value,
  target,
  unit,
  gradient,
  textCls,
  borderCls,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  target: number;
  unit: string;
  gradient: string;
  textCls: string;
  borderCls: string;
}) {
  const ratio = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className={`card-premium p-4 border bg-gradient-to-b to-transparent flex flex-col ${borderCls}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
        {icon} {label}
      </div>
      <p className={`mt-3 text-2xl font-black tracking-tight ${textCls}`}>
        {value}
        <span className="text-xs text-muted-foreground font-medium">
          {" "}
          / {target} {unit}
        </span>
      </p>
      <div className="mt-2.5 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500`}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

/** Bloc « Mes skills » : statut de chaque skill en un coup d'oeil. */
function HomeSkillsBlock() {
  const state = useAppState();
  return (
    <Link
      to="/skills"
      className="card-premium p-4 block border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.10] to-transparent h-full flex flex-col hover:border-amber-400/40 transition-colors"
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
        <Trophy className="h-4 w-4 text-amber-400" /> Mes skills
      </div>
      <div className="mt-3 space-y-1.5">
        {SKILLS_GUIDE.map((g) => {
          const logs = state.tests
            .filter((t) => t.testId === g.id)
            .sort((a, b2) => +new Date(b2.date) - +new Date(a.date));
          const latest = logs[0]?.value;
          const meta = SKILL_STATUS_META[computeAutoStatus(g.id, latest)];
          return (
            <div key={g.id} className="flex items-center justify-between text-xs gap-2">
              <span className="text-slate-300 truncate">
                {meta.emoji} {g.name}
              </span>
              <span className="font-bold text-foreground shrink-0">
                {latest !== undefined ? `${latest} ${g.unit}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}

/** Bloc « Un skill » : carte dediee a un skill precis (choisi dans le bloc). */
function HomeSkillBlock({
  skillId,
  editing,
  onPick,
}: {
  skillId?: string;
  editing: boolean;
  onPick: (id: string) => void;
}) {
  const state = useAppState();
  const guide = SKILLS_GUIDE.find((g) => g.id === skillId) ?? SKILLS_GUIDE[0];
  const logs = state.tests
    .filter((t) => t.testId === guide.id)
    .sort((a, b2) => +new Date(b2.date) - +new Date(a.date));
  const latest = logs[0]?.value;
  const best = logs.length ? Math.max(...logs.map((l) => l.value)) : null;
  const meta = SKILL_STATUS_META[computeAutoStatus(guide.id, latest)];
  return (
    <div className="card-premium p-4 border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.10] to-transparent h-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold min-w-0">
          <Medal className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="truncate">{guide.name}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
          {meta.emoji} {meta.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-white/[0.03] border border-white/5 py-2">
          <p className="text-lg font-black">
            {latest ?? "—"}
            <span className="text-[10px] text-muted-foreground font-semibold"> {guide.unit}</span>
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Niveau
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/5 py-2">
          <p className="text-lg font-black">
            {best ?? "—"}
            <span className="text-[10px] text-muted-foreground font-semibold"> {guide.unit}</span>
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Record
          </p>
        </div>
      </div>
      {editing ? (
        <Select value={guide.id} onValueChange={onPick}>
          <SelectTrigger className="mt-3 h-8 w-full text-xs bg-input border-dashed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SKILLS_GUIDE.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Link
          to="/skills"
          className="mt-3 block text-center text-[11px] font-bold text-primary hover:underline"
        >
          Voir mes skills →
        </Link>
      )}
    </div>
  );
}

/** Bloc « Synchroniser mes donnees » : lance la synchro Notion depuis l'accueil. */
function SyncDataBlock() {
  const state = useAppState();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const s = loadNotionSettings();
    if (!s.secret || !s.bases.length) {
      toast.error("Configure d'abord ta synchro : Parametres → Notion & donnees.");
      return;
    }
    setBusy(true);
    try {
      const res = await syncToNotion(state, () => {});
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch {
      toast.error("La synchro a echoue. Reessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-premium p-4 border border-violet-400/25 bg-gradient-to-b from-violet-400/[0.10] to-transparent h-full flex flex-col">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
        <RefreshCw className="h-4 w-4 text-violet-400" /> Synchronisation
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed flex-1">
        Envoie les 14 derniers jours vers Notion.
      </p>
      <Button
        size="sm"
        onClick={run}
        disabled={busy}
        className="mt-2.5 w-full h-8 text-xs font-bold bg-violet-500/20 hover:bg-violet-500/30 text-violet-100 border border-violet-400/30"
      >
        {busy ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Synchro…
          </span>
        ) : (
          "Synchroniser"
        )}
      </Button>
    </div>
  );
}

/** Bloc « Mes mesures » : derniere pesee + sommeil. */
function HomeMesuresBlock() {
  const state = useAppState();
  const latest = [...state.metrics].sort((a, b2) => +new Date(b2.date) - +new Date(a.date))[0];
  return (
    <Link
      to="/mesures"
      className="card-premium p-4 block border border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.10] to-transparent h-full flex flex-col hover:border-cyan-400/40 transition-colors"
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
        <Target className="h-4 w-4 text-cyan-400" /> Mes mesures
      </div>
      {latest ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-black">{latest.weight ?? "—"}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              kg
            </p>
          </div>
          <div>
            <p className="text-lg font-black">{latest.waist ?? "—"}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              cm
            </p>
          </div>
          <div>
            <p className="text-lg font-black">{latest.sleep ?? "—"}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              h sommeil
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          Aucune mesure — rappel tous les 14 jours 📏
        </p>
      )}
    </Link>
  );
}

/** Bloc « Musique » : lance ta playlist sport depuis l'app (format dynamique). */
function MusiqueBlock() {
  const state = useAppState();
  const today = getTodayProgram(state.profile.daysPerWeek === 5, planDays(state.profile));
  const raw = state.profile.musicPlaylists;
  const playlists = Array.isArray(raw) 
    ? raw as { id: string; label: string; url: string }[]
    : [];
  // Fallback ancien format
  const tType = today.type;
  const sessionType: string =
    tType === "running" ? "running" : tType === "rest" || tType === "recovery" ? "recovery" : tType;

  // Trouver la playlist qui correspond le mieux
  const match = playlists.length > 0
    ? playlists.find((p) => p.label.toLowerCase().includes(tType) || p.id === tType) || playlists[0]
    : null;
  const url = match?.url || "";

  const appName = url.includes("spotify")
    ? "Spotify"
    : url.includes("deezer")
      ? "Deezer"
      : url.includes("music.apple") || url.includes("apple")
        ? "Apple Music"
        : null;

  const appColors: Record<string, string> = {
    Spotify: "bg-green-500/20 text-green-400 border-green-500/30",
    Deezer: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "Apple Music": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };

  return (
    <div className="card-premium p-5 border border-pink-400/25 bg-gradient-to-b from-pink-400/[0.10] to-transparent relative overflow-hidden h-full">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
        <Music className="h-4 w-4 text-pink-400" /> Musique
      </div>
      {playlists.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {playlists.map((p) => (
            <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${p.url ? "bg-pink-500/10 border-pink-500/20 text-pink-200" : "bg-white/5 border-white/10 text-muted-foreground"}`}>
              {p.label} {p.url ? "🔗" : "⛔"}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-sm font-black">
        {sessionType === "recovery" || sessionType === "rest"
          ? "Récup 💆"
          : `Playlist ${sessionType === "running" ? "🏃 Course" : sessionType === "push" ? "💪 Push" : sessionType === "pull" ? "🎯 Pull" : "🦵 Legs"}`}
      </p>
      {url ? (
        <div className="mt-3 space-y-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02] ${
              appColors[appName ?? ""] ?? "bg-white/10 text-foreground border-white/20"
            }`}
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Lancer sur {appName ?? "le lecteur"}
            </span>
            <span className="text-[10px] opacity-70">↗</span>
          </a>
          <Link to="/parametres" className="block text-[10px] text-muted-foreground hover:text-primary text-center transition-colors">
            Changer de playlist dans Paramètres
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="hidden sm:inline">Configure tes playlists dans Paramètres → Musique.</span><span className="sm:hidden">🎵 Non configurée</span>
          </p>
          <Link to="/parametres" className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl border border-dashed border-pink-400/40 text-[11px] font-bold text-pink-200 hover:bg-pink-400/10 transition-all">
            <Music className="h-3.5 w-3.5" /> Configurer mes playlists
          </Link>
        </div>
      )}
    </div>
  );
}
