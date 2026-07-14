import { Link } from "@tanstack/react-router";
import { Home, Dumbbell, TrendingUp, Apple, Ruler, Settings, CalendarDays } from "lucide-react";

const items = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/seance", label: "Séance", icon: Dumbbell },
  { to: "/programme", label: "Semaine", icon: CalendarDays },
  { to: "/progression", label: "Progrès", icon: TrendingUp },
  { to: "/nutrition", label: "Nutrition", icon: Apple },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary transition-colors"
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
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
        <Link
          to="/parametres"
          className="shrink-0 grid place-items-center h-10 w-10 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen max-w-md mx-auto pb-24">{children}</div>;
}
export { Ruler };
