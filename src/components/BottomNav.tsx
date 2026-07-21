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
              className="relative flex flex-col items-center gap-1.5 py-3 px-0.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground data-[status=active]:text-primary transition-all active:scale-95 duration-200"
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
                className={`relative w-full flex flex-col items-center gap-1.5 py-3 px-0.5 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 duration-200 cursor-pointer ${
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
        "min-h-screen max-w-md mx-auto pb-28 relative lg:m-0 lg:max-w-none lg:pl-20 xl:pl-64 lg:pb-12 min-w-0 overflow-x-hidden",
        className,
      )}
    >
      <div className="lg:max-w-6xl lg:mx-auto lg:px-6 min-w-0">{children}</div>
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
