import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  Dumbbell,
  TrendingUp,
  Apple,
  Ruler,
  Settings,
  CalendarDays,
  History,
  Trophy,
  MoreHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const mainItems = [
  { to: "/", label: "Aujourd’hui", icon: Home, exact: true },
  { to: "/seance", label: "Séance", icon: Dumbbell, exact: false },
  { to: "/nutrition", label: "Nutrition", icon: Apple, exact: false },
  { to: "/progression", label: "Progression", icon: TrendingUp, exact: false },
] as const;

const moreItems = [
  { to: "/programme", label: "Programme", icon: CalendarDays },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/skills", label: "Skills", icon: Trophy },
  { to: "/mesures", label: "Mesures", icon: Ruler },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

export function BottomNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Check if any of the items in the "Plus" menu are currently active
  const isMoreActive = moreItems.some((item) => {
    if (item.to === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.to);
  });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {mainItems.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary transition-colors"
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
        <li>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className={`w-full flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  isMoreActive || isOpen
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span>Plus</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-3xl border-t border-border bg-card pb-8 max-w-md mx-auto"
            >
              <SheetHeader className="pb-4 border-b border-border/40">
                <SheetTitle className="text-center font-black text-lg">Plus d'options</SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-3 gap-4 pt-6">
                {moreItems.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={() => setIsOpen(false)}
                      activeOptions={{ exact: to === "/" }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-all text-muted-foreground data-[status=active]:text-primary data-[status=active]:border-primary/40 data-[status=active]:bg-primary/5"
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-semibold text-center">{label}</span>
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
          <h1 className="truncate text-2xl font-black tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen max-w-md mx-auto pb-24">{children}</div>;
}
export { Ruler };
