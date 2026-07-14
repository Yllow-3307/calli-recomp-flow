import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogOut, RefreshCw, User } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Calli Recomp" }] }),
  component: ParamsPage,
});

function ParamsPage() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const { user, profile: sbProfile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);

  // Auto-sync Supabase Profile parameters to local store when they exist
  useEffect(() => {
    if (sbProfile) {
      setProfile({
        weight: sbProfile.weight,
        height: sbProfile.height,
        goal: sbProfile.goal,
        daysPerWeek: sbProfile.days_per_week as 5 | 6,
        level: sbProfile.level as any,
        equipment: sbProfile.equipment,
        onboarded: sbProfile.onboarded,
      });
    }
  }, [sbProfile, setProfile]);

  const updateSupabaseProfile = async (patch: any) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles" as any)
      .update(patch)
      .eq("id", user.id);

    if (error) {
      toast.error("Erreur de synchronisation Supabase : " + error.message);
    } else {
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleSetWeight = (w: number) => {
    setProfile({ weight: w });
    updateSupabaseProfile({ weight: w });
  };

  const handleSetHeight = (h: number) => {
    setProfile({ height: h });
    updateSupabaseProfile({ height: h });
  };

  const handleSetGoal = (g: string) => {
    setProfile({ goal: g });
    updateSupabaseProfile({ goal: g });
  };

  const handleSetDays = (days: 5 | 6) => {
    setProfile({ daysPerWeek: days });
    updateSupabaseProfile({ days_per_week: days });
  };

  const handleSetLevel = (lvl: string) => {
    setProfile({ level: lvl as any });
    updateSupabaseProfile({ level: lvl });
  };

  const handleSetEquipment = (eqList: string[]) => {
    setProfile({ equipment: eqList });
    updateSupabaseProfile({ equipment: eqList });
  };

  return (
    <PageShell>
      <TopBar title="Paramètres" subtitle="Profil, objectifs, équipement" />

      <div className="px-5 space-y-3">
        {user && (
          <div className="card-premium p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-full bg-primary/20 grid place-items-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Connecté en tant que</p>
                <p className="text-sm font-bold truncate">{user.email}</p>
              </div>
            </div>
            {saving && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        )}

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Profil</h3>
          <Row label="Poids (kg)">
            <Input
              type="number"
              value={state.profile.weight}
              onChange={(e) => handleSetWeight(parseFloat(e.target.value) || 0)}
              className="bg-input w-24"
            />
          </Row>
          <Row label="Taille (cm)">
            <Input
              type="number"
              value={state.profile.height}
              onChange={(e) => handleSetHeight(parseFloat(e.target.value) || 0)}
              className="bg-input w-24"
            />
          </Row>
          <Row label="Objectif">
            <Input
              value={state.profile.goal}
              onChange={(e) => handleSetGoal(e.target.value)}
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
                onClick={() => handleSetDays(n as 5 | 6)}
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
            En 5j, le running Zone 2 récup du vendredi est retiré. Tu peux inverser dans les Notes du programme.
          </p>
        </div>

        <div className="card-premium p-4 space-y-3">
          <h3 className="font-bold">Niveau</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["débutant", "intermédiaire", "avancé"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleSetLevel(lvl)}
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

        <div className="card-premium p-4 space-y-2">
          <h3 className="font-bold">Équipement</h3>
          {["Barre traction", "Anneaux", "Haltères", "Sangle TRX", "Rameur", "Piscine", "Vélo"].map((eq) => {
            const on = state.profile.equipment.includes(eq);
            return (
              <button
                key={eq}
                onClick={() => {
                  const next = on
                    ? state.profile.equipment.filter((x) => x !== eq)
                    : [...state.profile.equipment, eq];
                  handleSetEquipment(next);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium border ${
                  on ? "bg-primary/10 border-primary text-foreground" : "bg-transparent border-border text-muted-foreground"
                }`}
              >
                {on ? "✓ " : ""}{eq}
              </button>
            );
          })}
        </div>

        <Link to="/mesures" className="card-premium p-4 block text-center font-semibold">
          Enregistrer mesures & photos →
        </Link>

        {user && (
          <Button
            variant="destructive"
            className="w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        )}

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            localStorage.removeItem("calli-recomp-v2");
            toast.success("Données réinitialisées. Recharge la page.");
          }}
        >
          Réinitialiser toutes les données locales
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
