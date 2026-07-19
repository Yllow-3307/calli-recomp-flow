# Fix V9 — ecrit les fichiers manquants (BottomNav + nouveaux fichiers du patch)
$root = "D:\Dev\calli-recomp-flow"
$utf8 = New-Object System.Text.UTF8Encoding($false)

$content = @'
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, MoreHorizontal, Ruler } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_CANDIDATES, normalizeNavPicks } from "@/lib/nav-menu";
import { useAppState, computeStreak } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export function BottomNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const picks = normalizeNavPicks(useAppState().profile.navMenus);

  const mainItems = [
    { to: "/", label: "Accueil", icon: Home, exact: true },
    ...NAV_CANDIDATES.filter((c) => picks.includes(c.id)).map((c) => ({
      to: c.to,
      label: c.label,
      icon: c.icon,
      exact: false,
    })),
  ];
  const moreItems = NAV_CANDIDATES.filter((c) => !picks.includes(c.id));

  // L'onboarding est un assistant plein écran : sa propre barre (Continuer/Retour)
  // est fixée en bas, il faut masquer la navigation sinon elle passe par-dessus
  // et bloque le bouton Continuer (même z-index, rendue après dans le DOM).
  if (location.pathname === "/onboarding") return null;

  // Check if any of the items in the "Plus" menu are currently active
  const isMoreActive = moreItems.some((item) => location.pathname.startsWith(item.to));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.06] bg-slate-950/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] lg:hidden">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {mainItems.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="min-w-0">
            <Link
              to={to}
              activeOptions={{ exact }}
              className="relative flex flex-col items-center gap-1.5 py-3 px-0.5 text-[11px] font-bold text-muted-foreground data-[status=active]:text-primary transition-all active:scale-95 duration-200"
            >
              <Icon className="h-5 w-5 shrink-0 transition-transform duration-300 data-[status=active]:scale-110" />
              {/* truncate = anti-chevauchement : jamais de label par-dessus son voisin */}
              <span className="max-w-full truncate">{label}</span>
              {/* Point lumineux sous l'onglet actif */}
              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary opacity-0 shadow-[0_0_10px_3px_var(--color-primary)] transition-opacity duration-300 [[data-status=active]_&]:opacity-100" />
            </Link>
          </li>
        ))}
        <li className="min-w-0">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className={`relative w-full flex flex-col items-center gap-1.5 py-3 px-0.5 text-[11px] font-bold transition-all active:scale-95 duration-200 cursor-pointer ${
                  isMoreActive || isOpen
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate">Plus</span>
                {(isMoreActive || isOpen) && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary shadow-[0_0_10px_3px_var(--color-primary)] transition-opacity duration-300" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-[2.5rem] border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl pb-8 max-w-md mx-auto shadow-[0_-15px_40px_rgba(0,0,0,0.8)]"
            >
              <SheetHeader className="pb-4 border-b border-white/5">
                <SheetTitle className="text-center font-black text-xl text-gradient">
                  Menu Principal
                </SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-3 gap-3.5 pt-6">
                {moreItems.map(({ to, label, icon: Icon, color }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={() => setIsOpen(false)}
                      activeOptions={{ exact: false }}
                      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 active:scale-95 transition-all text-muted-foreground data-[status=active]:text-primary data-[status=active]:border-primary/30 data-[status=active]:bg-primary/5 group"
                    >
                      <div
                        className={`p-2.5 rounded-xl border ${color} group-hover:scale-105 transition-transform duration-300`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-bold text-center text-slate-300 group-hover:text-white transition-colors">
                        {label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-5 pt-6 pb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-accent shadow-[0_0_12px_1px_var(--color-primary)]"
            />
            <h1 className="truncate text-2xl font-black tracking-tight text-white">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1 font-semibold">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-screen max-w-md mx-auto pb-24 relative lg:m-0 lg:max-w-none lg:pl-20 xl:pl-64 lg:pb-10",
        className,
      )}
    >
      <div className="lg:max-w-6xl lg:mx-auto lg:px-6">{children}</div>
    </div>
  );
}

/**
 * Barre latérale desktop (lg = icônes seules, xl = icônes + labels).
 * Masquée sur mobile (la BottomNav prend le relais) et pendant l'onboarding.
 */
export function DesktopNav() {
  const location = useLocation();
  const state = useAppState();
  const streak = computeStreak(state.workouts);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  // Assistant plein écran, même logique que la BottomNav
  if (location.pathname === "/onboarding") return null;

  // Sur desktop, la barre latérale affiche TOUS les menus (pas de « Plus »).
  const items = [
    { to: "/", label: "Accueil", icon: Home, exact: true as const },
    ...NAV_CANDIDATES.map((c) => ({ to: c.to, label: c.label, icon: c.icon, exact: false })),
  ];

  return (
    <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-20 xl:w-64 flex-col border-r border-white/[0.06] bg-slate-950/85 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 xl:px-6 pt-7 pb-8">
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-tr from-primary to-accent shadow-[0_0_20px_-2px_var(--color-primary)] grid place-items-center text-white font-black text-sm"
        >
          C
        </span>
        <div className="hidden xl:block min-w-0">
          <p className="font-black text-base leading-tight text-gradient truncate">Calli Recomp</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Tracker
          </p>
        </div>
      </div>

      {/* Liens de navigation */}
      <ul className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon, ...rest }) => {
          const exact = "exact" in rest ? !!rest.exact : to === "/";
          return (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact }}
                title={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all justify-center xl:justify-start data-[status=active]:text-primary data-[status=active]:bg-primary/10 data-[status=active]:border-primary/25"
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden xl:inline truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Pied : streak + compte */}
      <div className="px-3 pb-6 space-y-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center xl:text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden xl:block">
            Streak
          </p>
          <p className="text-lg font-black text-gradient">🔥 {streak}j</p>
        </div>
        {email && (
          <p
            className="hidden xl:block text-[10px] text-muted-foreground truncate px-1"
            title={email}
          >
            {state.profile.username ? `👤 ${state.profile.username} · ${email}` : email}
          </p>
        )}
      </div>
    </nav>
  );
}

export { Ruler };
'@
$dest = Join-Path $root "src\components\BottomNav.tsx"
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[System.IO.File]::WriteAllText($dest, $content, $utf8)
Write-Host "OK -> src\components\BottomNav.tsx"

$content = @'
// ─────────────────────────────────────────────────────────────────────────────
// Graphique d'évolution d'un test (ligne SVG faite maison → zéro dépendance).
// Utilisé par « Voir l'évolution » dans Progrès et dans Skills.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useAppState } from "@/lib/store";
import { PROGRESS_TESTS } from "@/lib/program";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Trophy } from "lucide-react";

const frDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

export function EvolutionChartDialog({
  testId,
  onClose,
}: {
  /** id du test (PROGRESS_TESTS), ou null = fermé */
  testId: string | null;
  onClose: () => void;
}) {
  const state = useAppState();
  const def = PROGRESS_TESTS.find((t) => t.id === testId);

  const points = useMemo(
    () =>
      state.tests
        .filter((t) => t.testId === testId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [state.tests, testId],
  );

  // Pour les tests chronométrés (5 km), le meilleur = le plus PETIT.
  const lowerBetter = def?.unit === "min";
  const best = points.length
    ? points.reduce(
        (acc, p) => (lowerBetter ? Math.min(acc, p.value) : Math.max(acc, p.value)),
        points[0].value,
      )
    : null;

  return (
    <Dialog open={testId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-950 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution — {def?.name ?? "Test"}
            {def && (
              <span className="text-xs font-semibold text-muted-foreground">({def.unit})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucun test enregistré pour l'instant. Fais ta première mesure (semaines S4, S8, S12) 💪
          </p>
        ) : (
          <>
            <LineChart points={points} lowerBetter={lowerBetter} best={best as number} />
            <div className="flex items-center justify-between text-xs text-muted-foreground -mt-1">
              <span>
                {points.length} mesure{points.length > 1 ? "s" : ""} · {frDay(points[0].date)} →{" "}
                {frDay(points[points.length - 1].date)}
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Trophy className="h-3.5 w-3.5" /> Record : {best}
                {def?.unit && ` ${def.unit}`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 mt-1.5">
              {lowerBetter
                ? "⏱️ Pour un temps, plus la courbe descend, mieux c'est."
                : "📈 Plus la courbe monte, plus tu progresses."}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LineChart({
  points,
  lowerBetter,
  best,
}: {
  points: { id: string; date: string; value: number }[];
  lowerBetter: boolean;
  best: number;
}) {
  const W = 320;
  const H = 170;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 30;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.15;
    min = Math.max(0, min - pad);
    max += pad;
  }

  const x = (i: number) =>
    points.length === 1
      ? padL + (W - padL - padR) / 2
      : padL + (i * (W - padL - padR)) / (points.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe d'évolution">
      {/* grille horizontale */}
      {[0, 1, 2].map((i) => {
        const yy = padT + (i * (H - padT - padB)) / 2;
        const val = max - (i * (max - min)) / 2;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgba(255,255,255,0.07)" />
            <text
              x={padL - 6}
              y={yy + 3}
              textAnchor="end"
              fontSize="9"
              fill="rgba(148,163,184,0.8)"
            >
              {Number.isInteger(val) ? val : val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* ligne d'évolution */}
      <path
        d={path}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* points */}
      {points.map((p, i) => {
        const isBest = p.value === best;
        return (
          <g key={p.id}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={isBest ? 5 : 3.5}
              fill={isBest ? "#f59e0b" : "var(--color-primary)"}
              stroke="#020617"
              strokeWidth="1.5"
            />
            {(isBest || i === 0 || i === points.length - 1) && (
              <text
                x={x(i)}
                y={y(p.value) - 8}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill={isBest ? "#f59e0b" : "#e2e8f0"}
              >
                {p.value}
              </text>
            )}
          </g>
        );
      })}

      {/* dates début / fin */}
      <text x={x(0)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">
        {frDay(points[0].date)}
      </text>
      {points.length > 1 && (
        <text
          x={x(points.length - 1)}
          y={H - 8}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(148,163,184,0.9)"
        >
          {frDay(last.date)}
        </text>
      )}
      <title>{lowerBetter ? "Le plus bas est le meilleur" : "Le plus haut est le meilleur"}</title>
    </svg>
  );
}
'@
$dest = Join-Path $root "src\components\EvolutionChart.tsx"
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[System.IO.File]::WriteAllText($dest, $content, $utf8)
Write-Host "OK -> src\components\EvolutionChart.tsx"

$content = @'
// ─────────────────────────────────────────────────────────────────────────────
// Barre de menu mobile personnalisable (V9).
// « Accueil » et « Plus » sont fixes ; l'utilisateur en choisit 3 (sauvegardé
// dans profiles.nav_menus), le reste se range automatiquement dans « Plus ».
// ─────────────────────────────────────────────────────────────────────────────
import {
  Dumbbell,
  Apple,
  TrendingUp,
  CalendarDays,
  History,
  Trophy,
  Ruler,
  Settings,
} from "lucide-react";

export const NAV_CANDIDATES = [
  {
    id: "seance",
    to: "/seance",
    label: "Séance",
    icon: Dumbbell,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "nutrition",
    to: "/nutrition",
    label: "Nutrition",
    icon: Apple,
    color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
  },
  {
    id: "progression",
    to: "/progression",
    label: "Progrès",
    icon: TrendingUp,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "programme",
    to: "/programme",
    label: "Programme",
    icon: CalendarDays,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "historique",
    to: "/historique",
    label: "Historique",
    icon: History,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  },
  {
    id: "skills",
    to: "/skills",
    label: "Skills",
    icon: Trophy,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "mesures",
    to: "/mesures",
    label: "Mesures",
    icon: Ruler,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "parametres",
    to: "/parametres",
    label: "Paramètres",
    icon: Settings,
    color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
] as const;

export const DEFAULT_NAV_PICKS: string[] = ["seance", "nutrition", "progression"];
export const MAX_NAV_PICKS = 3;

/** Choix sauvegardés → 1 à 3 ids valides, dans l'ordre canonique. */
export function normalizeNavPicks(raw: unknown): string[] {
  const saved = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  const valid = NAV_CANDIDATES.filter((c) => saved.includes(c.id)).map((c) => c.id);
  return valid.length ? valid.slice(0, MAX_NAV_PICKS) : DEFAULT_NAV_PICKS;
}
'@
$dest = Join-Path $root "src\lib\nav-menu.ts"
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[System.IO.File]::WriteAllText($dest, $content, $utf8)
Write-Host "OK -> src\lib\nav-menu.ts"

$content = @'
// ─────────────────────────────────────────────────────────────────────────────
// Statut automatique d'un skill à partir de la dernière valeur testée.
// Partagé entre la page Skills et les blocs « Skills » de l'accueil (V9).
// ─────────────────────────────────────────────────────────────────────────────

export type SkillStatus = "non commencé" | "en cours" | "proche" | "validé";

export function computeAutoStatus(skillId: string, latestValue: number | undefined): SkillStatus {
  if (latestValue === undefined || latestValue === null || latestValue === 0) {
    return "non commencé";
  }

  switch (skillId) {
    case "handstand":
      if (latestValue < 25) return "en cours";
      return "validé";
    case "hspu":
      if (latestValue < 4) return "en cours";
      if (latestValue >= 5) return "validé";
      return "proche";
    case "muscleup":
      if (latestValue < 1) return "en cours";
      if (latestValue >= 5) return "validé";
      return "proche";
    case "tuckflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validé";
      return "proche";
    case "dragonflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validé";
      return "proche";
    case "lsit":
      if (latestValue < 12) return "en cours";
      if (latestValue < 25) return "proche";
      return "validé";
    default:
      return "en cours";
  }
}

export const SKILL_STATUS_META: Record<SkillStatus, { emoji: string; label: string }> = {
  "non commencé": { emoji: "⬜", label: "Non commencé" },
  "en cours": { emoji: "🔄", label: "En cours" },
  proche: { emoji: "🟠", label: "Proche" },
  validé: { emoji: "✅", label: "Validé" },
};
'@
$dest = Join-Path $root "src\lib\skill-status.ts"
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[System.IO.File]::WriteAllText($dest, $content, $utf8)
Write-Host "OK -> src\lib\skill-status.ts"

$content = @'
-- V9 : barre de menu mobile personnalisable (3 entrées choisies, Accueil & Plus fixes)
alter table public.profiles add column if not exists nav_menus jsonb not null default '[]'::jsonb;
'@
$dest = Join-Path $root "supabase\migrations\20260719000005_nav_menus.sql"
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[System.IO.File]::WriteAllText($dest, $content, $utf8)
Write-Host "OK -> supabase\migrations\20260719000005_nav_menus.sql"

Write-Host ""
Write-Host "Termine ! Lance maintenant : npm run build" -ForegroundColor Green
