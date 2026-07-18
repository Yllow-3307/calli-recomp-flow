import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, LogOut, User } from "lucide-react";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Calli Recomp" }] }),
  component: ParamsPage,
});

function ParamsPage() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Déconnexion réussie !");
      navigate({ to: "/connexion" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue lors de la déconnexion.";
      toast.error(message);
    }
  };

  return (
    <PageShell>
      <TopBar title="Paramètres" subtitle="Profil, objectifs, équipement" />

      <div className="px-5 space-y-3">
        {userEmail && (
          <div className="card-premium p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Compte connecté</p>
                <p className="text-sm font-bold truncate">{userEmail}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive shrink-0"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Profil</h3>
          <Row label="Poids (kg)">
            <Input
              type="number"
              value={state.profile.weight}
              onChange={(e) => setProfile({ weight: parseFloat(e.target.value) || 0 })}
              className="bg-input w-24"
            />
          </Row>
          <Row label="Taille (cm)">
            <Input
              type="number"
              value={state.profile.height}
              onChange={(e) => setProfile({ height: parseFloat(e.target.value) || 0 })}
              className="bg-input w-24"
            />
          </Row>
          <Row label="Objectif">
            <Input
              value={state.profile.goal}
              onChange={(e) => setProfile({ goal: e.target.value })}
              className="bg-input flex-1"
            />
          </Row>
        </div>

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Fréquence</h3>
          <div className="grid grid-cols-2 gap-2">
            {[5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setProfile({ daysPerWeek: n as 5 | 6 })}
                className={`h-14 rounded-xl border font-bold transition ${
                  state.profile.daysPerWeek === n
                    ? "btn-hero border-transparent"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {n} jours / semaine
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            En 5j, le running Zone 2 récup du vendredi est retiré. Tu peux inverser dans les Notes
            du programme.
          </p>
        </div>

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Niveau</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["débutant", "intermédiaire", "avancé"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setProfile({ level: lvl })}
                className={`h-12 rounded-xl border text-sm font-semibold transition capitalize ${
                  state.profile.level === lvl
                    ? "btn-hero border-transparent"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <Link
          to="/onboarding"
          className="card-premium card-premium-hover flex items-center justify-between p-4 border border-primary/25 group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔄</span>
            <div>
              <p className="font-bold text-sm">Générer un nouveau plan</p>
              <p className="text-[11px] text-muted-foreground">
                Objectif + capacités → plan recalculé (ton cycle n'est pas remis à zéro)
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <div className="card-premium p-4 space-y-2">
          <h3 className="font-bold">Équipement</h3>
          {["Barre traction", "Anneaux", "Haltères", "Sangle TRX", "Rameur", "Piscine", "Vélo"].map(
            (eq) => {
              const on = state.profile.equipment.includes(eq);
              return (
                <button
                  key={eq}
                  onClick={() => {
                    const next = on
                      ? state.profile.equipment.filter((x) => x !== eq)
                      : [...state.profile.equipment, eq];
                    setProfile({ equipment: next });
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium border ${
                    on
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-transparent border-border text-muted-foreground"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {eq}
                </button>
              );
            },
          )}
        </div>

        <Link
          to="/skills"
          className="card-premium p-4 block text-center font-semibold text-secondary"
        >
          Suivre mes Skills Sportifs →
        </Link>

        <Link
          to="/historique"
          className="card-premium p-4 block text-center font-semibold text-primary"
        >
          Consulter l'historique des séances →
        </Link>

        <Link to="/mesures" className="card-premium p-4 block text-center font-semibold">
          Enregistrer mesures & photos →
        </Link>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            localStorage.removeItem("calli-recomp-v1");
            toast.success("Données réinitialisées. Recharge la page.");
          }}
        >
          Réinitialiser toutes les données
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-4">
          v1.0 — Calli Recomp Tracker
        </p>
      </div>
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
