import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions, proteinToday, kcalToday, todayKey } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Beef, Flame, Droplet } from "lucide-react";
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

  const protein = proteinToday(state.meals);
  const kcal = kcalToday(state.meals);
  const proteinTarget = Math.round(state.profile.weight * 2);
  const water = state.water[todayKey()] || 0;

  const meals = state.meals.filter((m) => m.date.slice(0, 10) === todayKey());
  const carbs = meals.reduce((a, m) => a + m.carbs, 0);
  const fat = meals.reduce((a, m) => a + m.fat, 0);

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
      <TopBar title="Nutrition" subtitle={`Cible protéines : ${proteinTarget}g (2g/kg)`} />

      <div className="px-5 grid grid-cols-2 gap-3">
        <BigStat icon={<Beef className="h-4 w-4" />} label="Protéines" value={`${protein}g`} target={`${proteinTarget}g`} pct={(protein / proteinTarget) * 100} />
        <BigStat icon={<Flame className="h-4 w-4" />} label="Calories" value={`${kcal}`} target="kcal" pct={0} />
      </div>

      <div className="px-5 mt-3 grid grid-cols-3 gap-3">
        <MiniStat label="Glucides" value={`${carbs}g`} />
        <MiniStat label="Lipides" value={`${fat}g`} />
        <MiniStat label="Eau" value={`${water.toFixed(1)}L`} icon={<Droplet className="h-3 w-3" />} />
      </div>

      <div className="px-5 mt-3 flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => actions.addWater(0.25)}>+25cl</Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => actions.addWater(0.5)}>+50cl</Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => actions.addWater(1)}>+1L</Button>
      </div>

      {/* Add meal */}
      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Ajouter un repas</p>
        <div className="card-premium p-4 space-y-2">
          <Input placeholder="Nom (ex: Poulet riz)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-input" />
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="kcal" type="number" inputMode="numeric" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} className="bg-input" />
            <Input placeholder="Prot" type="number" inputMode="numeric" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} className="bg-input" />
            <Input placeholder="Gluc" type="number" inputMode="numeric" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} className="bg-input" />
            <Input placeholder="Lip" type="number" inputMode="numeric" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} className="bg-input" />
          </div>
          <Button onClick={submit} className="w-full btn-hero h-11">Ajouter</Button>
        </div>
      </section>

      {/* Today's meals */}
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
                <button onClick={() => actions.removeMeal(m.id)} className="text-muted-foreground hover:text-destructive p-2">
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

function BigStat({ icon, label, value, target, pct }: { icon: React.ReactNode; label: string; value: string; target: string; pct: number }) {
  return (
    <div className="card-premium p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <p className="mt-2 text-2xl font-black">{value}<span className="text-sm text-muted-foreground font-medium"> / {target}</span></p>
      {pct > 0 && <Progress value={Math.min(100, pct)} className="mt-2 h-1.5" />}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card-premium p-3">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="text-base font-black mt-0.5">{value}</p>
    </div>
  );
}
