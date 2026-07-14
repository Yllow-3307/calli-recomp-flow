import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions, proteinToday, kcalToday, todayKey } from "@/lib/store";
import { MEAL_TEMPLATES, NUTRITION } from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Beef, Flame, Droplet, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Calli Recomp" }] }),
  component: NutritionPage,
});

function NutritionPage() {
  const state = useAppState();
  const actions = useAppActions();
  const [form, setForm] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });

  const w = state.profile.weight;
  const [pMin, pMax] = NUTRITION.protein_g_per_kg;
  const proteinTargetMin = Math.round(w * pMin);
  const proteinTargetMax = Math.round(w * pMax);
  const proteinTarget = Math.round(w * ((pMin + pMax) / 2));
  const [wMin, wMax] = NUTRITION.water_l_per_day;
  const waterTarget = (wMin + wMax) / 2;

  const protein = proteinToday(state.meals);
  const kcal = kcalToday(state.meals);
  const water = state.water[todayKey()] || 0;

  const meals = state.meals.filter((m) => m.date.slice(0, 10) === todayKey());
  const carbs = meals.reduce((a, m) => a + m.carbs, 0);
  const fat = meals.reduce((a, m) => a + m.fat, 0);

  const addQuick = (tpl: (typeof MEAL_TEMPLATES)[number]) => {
    actions.addMeal({ id: `m-${Date.now()}`, date: new Date().toISOString(), ...tpl });
    toast.success(`${tpl.name} ajouté`);
  };

  const submit = () => {
    if (!form.name || !form.kcal) return;
    actions.addMeal({
      id: `m-${Date.now()}`,
      date: new Date().toISOString(),
      name: form.name,
      kcal: parseFloat(form.kcal) || 0,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fat: parseFloat(form.fat) || 0,
    });
    setForm({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
    toast.success("Repas ajouté");
  };

  return (
    <PageShell>
      <TopBar
        title="Nutrition"
        subtitle={`Protéines ${proteinTargetMin}–${proteinTargetMax}g · Eau ${wMin}–${wMax}L`}
      />

      <div className="px-5 grid grid-cols-2 gap-3">
        <div className="card-premium p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Beef className="h-4 w-4" /> Protéines
          </div>
          <p className="mt-2 text-2xl font-black">
            {protein}
            <span className="text-sm text-muted-foreground font-medium"> / {proteinTarget}g</span>
          </p>
          <Progress value={Math.min(100, (protein / proteinTarget) * 100)} className="mt-2 h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            Cible {proteinTargetMin}–{proteinTargetMax}g ({pMin}–{pMax}g/kg)
          </p>
        </div>
        <div className="card-premium p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Droplet className="h-4 w-4" /> Eau
          </div>
          <p className="mt-2 text-2xl font-black">
            {water.toFixed(1)}
            <span className="text-sm text-muted-foreground font-medium"> / {waterTarget}L</span>
          </p>
          <Progress value={Math.min(100, (water / waterTarget) * 100)} className="mt-2 h-1.5" />
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
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 h-7 text-xs"
              onClick={() => actions.addWater(1)}
            >
              +1L
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 mt-3 grid grid-cols-3 gap-3">
        <MiniStat label="Calories" value={`${kcal} kcal`} icon={<Flame className="h-3 w-3" />} />
        <MiniStat label="Glucides" value={`${carbs}g`} />
        <MiniStat label="Lipides" value={`${fat}g`} />
      </div>

      {/* Meal templates */}
      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Repas type du programme
        </p>
        <div className="space-y-2">
          {MEAL_TEMPLATES.map((m) => (
            <button
              key={m.name}
              onClick={() => addQuick(m)}
              className="card-premium p-3 w-full flex items-center gap-3 text-left"
            >
              <div className="h-9 w-9 grid place-items-center rounded-full btn-hero shrink-0">
                <Plus className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.kcal} kcal · P {m.protein}g · G {m.carbs}g · L {m.fat}g
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Custom meal */}
      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Repas personnalisé
        </p>
        <div className="card-premium p-4 space-y-2">
          <Input
            placeholder="Nom (ex: Poulet riz)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-input"
          />
          <div className="grid grid-cols-4 gap-2">
            <Input
              placeholder="kcal"
              type="number"
              inputMode="numeric"
              value={form.kcal}
              onChange={(e) => setForm({ ...form, kcal: e.target.value })}
              className="bg-input"
            />
            <Input
              placeholder="Prot"
              type="number"
              inputMode="numeric"
              value={form.protein}
              onChange={(e) => setForm({ ...form, protein: e.target.value })}
              className="bg-input"
            />
            <Input
              placeholder="Gluc"
              type="number"
              inputMode="numeric"
              value={form.carbs}
              onChange={(e) => setForm({ ...form, carbs: e.target.value })}
              className="bg-input"
            />
            <Input
              placeholder="Lip"
              type="number"
              inputMode="numeric"
              value={form.fat}
              onChange={(e) => setForm({ ...form, fat: e.target.value })}
              className="bg-input"
            />
          </div>
          <Button onClick={submit} className="w-full btn-hero h-11">
            Ajouter
          </Button>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Aujourd'hui</p>
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">Aucun repas enregistré aujourd'hui.</p>
        ) : (
          <div className="space-y-2">
            {meals.map((m) => (
              <div key={m.id} className="card-premium p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.kcal} kcal • P {m.protein}g • G {m.carbs}g • L {m.fat}g
                  </p>
                </div>
                <button
                  onClick={() => actions.removeMeal(m.id)}
                  className="text-muted-foreground hover:text-destructive p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card-premium p-3">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-base font-black mt-0.5">{value}</p>
    </div>
  );
}
