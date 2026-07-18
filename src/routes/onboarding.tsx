import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Trophy,
  Dumbbell,
  Droplet,
  Beef,
} from "lucide-react";
import { PageShell } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppActions, useAppState, type Profile } from "@/lib/store";
import {
  GOALS,
  CAPACITY_FIELDS,
  TIER_INFO,
  generatePlan,
  goalDefOf,
  computeNutrition,
  type Capacities,
  type GoalId,
} from "@/lib/plan";
import { planDays } from "@/lib/plan";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Ton plan — Calli Recomp" }] }),
  component: OnboardingPage,
});

const STEPS = ["Objectif", "Corps", "Capacités", "Ton plan"] as const;

function OnboardingPage() {
  const state = useAppState();
  const { setProfile } = useAppActions();
  const navigate = useNavigate();

  const alreadyOnboarded = state.profile.onboarded;
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalId>(goalDefOf(state.profile.goal).id);
  const [daysPerWeek, setDaysPerWeek] = useState<5 | 6>(state.profile.daysPerWeek);
  const [sex, setSex] = useState<"homme" | "femme">(state.profile.sex ?? "homme");
  const [age, setAge] = useState(state.profile.age?.toString() ?? "");
  const [weight, setWeight] = useState(state.profile.weight.toString());
  const [height, setHeight] = useState(state.profile.height.toString());
  const [level, setLevel] = useState<Profile["level"]>(state.profile.level);
  const [capacities, setCapacities] = useState<Capacities>(state.profile.capacities ?? {});

  // Aperçu live de la nutrition calculée
  const previewProfile: Profile = useMemo(
    () => ({
      ...state.profile,
      goal,
      daysPerWeek,
      level,
      sex,
      age: parseInt(age) || undefined,
      weight: parseFloat(weight) || state.profile.weight,
      height: parseFloat(height) || state.profile.height,
      capacities,
    }),
    [state.profile, goal, daysPerWeek, level, sex, age, weight, height, capacities],
  );
  const nutrition = useMemo(() => computeNutrition(previewProfile), [previewProfile]);
  const plan = useMemo(() => generatePlan(previewProfile), [previewProfile]);
  const weekDays = useMemo(() => planDays(previewProfile), [previewProfile]);

  const finish = () => {
    const next: Partial<Profile> = {
      goal,
      daysPerWeek,
      level,
      sex,
      age: parseInt(age) || undefined,
      weight: parseFloat(weight) || state.profile.weight,
      height: parseFloat(height) || state.profile.height,
      capacities,
      plan,
      onboarded: true,
    };
    // Nouveau départ de cycle uniquement si c'est la toute première configuration
    if (!alreadyOnboarded) next.startDate = new Date().toISOString();
    setProfile(next);
    toast.success(alreadyOnboarded ? "Plan régénéré 🔥" : "Ton plan est prêt 🔥");
    navigate({ to: "/" });
  };

  const canNext =
    step === 0 ? true : step === 1 ? !!weight && !!height && !!age : step === 2 ? true : true;

  return (
    <PageShell>
      {/* Barre de progression */}
      <div className="px-5 pt-7">
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
          <span>
            Étape {step + 1}/{STEPS.length} · {STEPS[step]}
          </span>
          <span className="text-gradient">Calli Recomp</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-glow)",
            }}
          />
        </div>
      </div>

      <div className="px-5 mt-6 pb-32">
        {/* ── Étape 1 : objectif + fréquence ─────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-black tracking-tight">Quel est ton objectif ? 🎯</h1>
            <p className="text-sm text-muted-foreground">
              L'app générera ton plan hebdo, tes cibles nutrition et ton hydratation en fonction.
            </p>
            <div className="grid gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`card-premium p-4 text-left flex items-start gap-3 transition-all ${
                    goal === g.id
                      ? "border-primary/60 ring-1 ring-primary/40 shadow-[0_0_25px_-5px_var(--shadow-glow)]"
                      : "opacity-80"
                  }`}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span>
                    <span className="block font-extrabold text-sm">{g.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {g.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="card-premium p-4">
              <p className="text-xs font-bold text-muted-foreground mb-2">
                Fréquence d'entraînement
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([5, 6] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setDaysPerWeek(n)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      daysPerWeek === n
                        ? "btn-hero border-transparent"
                        : "bg-white/5 border-white/10 text-muted-foreground"
                    }`}
                  >
                    {n} jours/sem
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Étape 2 : corps ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-black tracking-tight">Parle-moi de toi 🧍</h1>
            <p className="text-sm text-muted-foreground">
              Sert à calculer tes calories (métabolisme de base × activité) et tes cibles
              eau/protéines.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["homme", "femme"] as const).map((sx) => (
                <button
                  key={sx}
                  onClick={() => setSex(sx)}
                  className={`py-3 rounded-xl text-sm font-bold border capitalize transition-all ${
                    sex === sx
                      ? "btn-hero border-transparent"
                      : "bg-white/5 border-white/10 text-muted-foreground"
                  }`}
                >
                  {sx}
                </button>
              ))}
            </div>
            <div className="card-premium p-4 space-y-4">
              <div>
                <Label htmlFor="ob-age" className="text-xs text-muted-foreground">
                  Âge
                </Label>
                <Input
                  id="ob-age"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="ex. 28"
                  className="mt-1 bg-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ob-weight" className="text-xs text-muted-foreground">
                    Poids (kg)
                  </Label>
                  <Input
                    id="ob-weight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="mt-1 bg-input"
                  />
                </div>
                <div>
                  <Label htmlFor="ob-height" className="text-xs text-muted-foreground">
                    Taille (cm)
                  </Label>
                  <Input
                    id="ob-height"
                    type="number"
                    inputMode="decimal"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="mt-1 bg-input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Étape 3 : niveau + capacités ───────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-black tracking-tight">Tes capacités actuelles 💪</h1>
            <p className="text-sm text-muted-foreground">
              L'app ajuste la difficulté (fourchettes de reps/temps). 0 ou vide si tu ne sais pas —
              la progression RPE calibrera ensuite toute seule.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["débutant", "intermédiaire", "avancé"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`py-2.5 rounded-xl text-xs font-bold border capitalize transition-all ${
                    level === lvl
                      ? "btn-hero border-transparent"
                      : "bg-white/5 border-white/10 text-muted-foreground"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <div className="card-premium p-4 space-y-3">
              {CAPACITY_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.placeholder}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      className="w-20 h-9 text-center bg-input"
                      value={capacities[f.key] ?? ""}
                      onChange={(e) =>
                        setCapacities((c) => ({
                          ...c,
                          [f.key]:
                            e.target.value === ""
                              ? undefined
                              : Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                    />
                    <span className="text-xs text-muted-foreground w-8">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Étape 4 : le plan généré ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-black tracking-tight">Ton plan est prêt 🔥</h1>
            <p className="text-sm text-muted-foreground">
              Généré pour <b>{goalDefOf(goal).label.toLowerCase()}</b> · palier{" "}
              <b>{TIER_INFO[plan.tier].label}</b> (×{TIER_INFO[plan.tier].factor} sur les
              fourchettes).
            </p>

            {/* Semaine */}
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-3">
                <Dumbbell className="h-4 w-4 text-primary" /> Ta semaine · {daysPerWeek} jours
              </div>
              <div className="space-y-2">
                {weekDays.map((d) => (
                  <div key={d.key} className="flex items-center gap-3 text-sm">
                    <span className="text-lg w-7">{d.emoji}</span>
                    <span className="w-20 text-xs font-bold text-muted-foreground capitalize">
                      {d.day}
                    </span>
                    <span className="flex-1 text-xs font-semibold truncate">{d.title}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                {TIER_INFO[plan.tier].hint} Tests de progression automatiques toutes les 4 semaines.
              </p>
            </div>

            {/* Cibles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="card-premium p-3 text-center border border-primary/25">
                <Flame className="h-4 w-4 text-primary mx-auto" />
                <p className="text-lg font-black mt-1">{nutrition.kcalTarget}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">kcal/jour</p>
              </div>
              <div className="card-premium p-3 text-center border border-lime-400/25">
                <Beef className="h-4 w-4 text-lime-400 mx-auto" />
                <p className="text-lg font-black mt-1">
                  {nutrition.proteinMin}–{nutrition.proteinMax}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">g prot/jour</p>
              </div>
              <div className="card-premium p-3 text-center border border-cyan-400/25">
                <Droplet className="h-4 w-4 text-cyan-400 mx-auto" />
                <p className="text-lg font-black mt-1">{nutrition.waterL}L</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">eau/jour</p>
              </div>
            </div>

            <div className="card-premium p-4 border border-violet-400/25">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-300 mb-1.5">
                <Trophy className="h-4 w-4" /> Comment l'app te fait progresser
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                <li>· Séances guidées minuteur + saisie reps/RPE</li>
                <li>· +1/+2 reps, +5s de hold quand tu valides en haut de fourchette (RPE ≤ 8)</li>
                <li>· Nouveau cycle toutes les 12 semaines, plan régénérable à volonté</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Navigation bas fixe */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.06] bg-slate-950/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex items-center gap-3 px-5 py-3.5">
          {step > 0 ? (
            <Button
              variant="secondary"
              className="bg-white/5 border border-white/10"
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Plan 100% personnalisé
            </div>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <Button
              className="btn-hero px-6"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              Continuer <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="btn-hero px-6" onClick={finish}>
              {alreadyOnboarded ? "Régénérer mon plan 🔥" : "Commencer 🔥"}
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
