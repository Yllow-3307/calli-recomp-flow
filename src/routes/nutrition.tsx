import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import {
  useAppState,
  useAppActions,
  proteinToday,
  kcalToday,
  todayKey,
  type FavoriteMeal,
} from "@/lib/store";
import { MEAL_TEMPLATES } from "@/lib/program";
import { nutritionTargets } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Beef, Flame, Droplet, Plus, Star, X, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WaterBottle } from "@/components/WaterBottle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Calli Recomp" }] }),
  component: NutritionPage,
});

function NutritionPage() {
  const state = useAppState();
  const actions = useAppActions();
  const [form, setForm] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });

  // Cibles personnalisées selon l'objectif et la morphologie (plan généré)
  const nut = nutritionTargets(state.profile);
  const pMin = Math.round((nut.proteinMin / state.profile.weight) * 10) / 10;
  const pMax = Math.round((nut.proteinMax / state.profile.weight) * 10) / 10;
  const proteinTargetMin = nut.proteinMin;
  const proteinTargetMax = nut.proteinMax;
  const proteinTarget = Math.round((nut.proteinMin + nut.proteinMax) / 2);
  const waterTarget = nut.waterL;

  const protein = proteinToday(state.meals);
  const kcal = kcalToday(state.meals);
  const water = state.water[todayKey()] || 0;

  const meals = state.meals.filter((m) => m.date.slice(0, 10) === todayKey());
  const carbs = meals.reduce((a, m) => a + m.carbs, 0);
  const fat = meals.reduce((a, m) => a + m.fat, 0);

  // V11.0 : quick-add avec portion réglable
  const [portion, setPortion] = useState<Record<string, number>>({});
  const addQuick = (tpl: (typeof MEAL_TEMPLATES)[number], factor?: number) => {
    const f = factor ?? portion[tpl.name] ?? 1;
    const meal = {
      name: f !== 1 ? `${tpl.name} ×${f}` : tpl.name,
      kcal: Math.round(tpl.kcal * f),
      protein: Math.round(tpl.protein * f * 10) / 10,
      carbs: Math.round(tpl.carbs * f * 10) / 10,
      fat: Math.round(tpl.fat * f * 10) / 10,
    };
    actions.addMeal({ id: `m-${Date.now()}`, date: new Date().toISOString(), ...meal });
    toast.success(`${meal.name} ajouté`);
  };

  // ── Repas favoris ──
  const favs = state.profile.favoriteMeals ?? [];
  const isFav = (m: { name: string; kcal: number }) =>
    favs.some((f) => f.name === m.name && f.kcal === m.kcal);
  const toggleFav = (m: {
    name: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    const already = isFav(m);
    const next = already
      ? favs.filter((f) => !(f.name === m.name && f.kcal === m.kcal))
      : [
          ...favs,
          {
            id: `fav-${Date.now()}`,
            name: m.name,
            kcal: m.kcal,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
          },
        ];
    actions.setProfile({ favoriteMeals: next });
    toast.success(already ? "Retiré des favoris" : "Ajouté aux favoris ⭐");
  };
  const removeFav = (id: string) =>
    actions.setProfile({ favoriteMeals: favs.filter((f) => f.id !== id) });
  const addFavAsMeal = (f: FavoriteMeal) => {
    actions.addMeal({
      id: `m-${Date.now()}`,
      date: new Date().toISOString(),
      name: f.name,
      kcal: f.kcal,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
    });
    toast.success(`${f.name} ajouté`);
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
        subtitle={`P ${proteinTargetMin}–${proteinTargetMax}g · G ~${nut.carbsTarget}g · L ~${nut.fatTarget}g · ~${nut.kcalTarget} kcal · ${waterTarget}L`}
      />

      {/* Grille desktop : [stats/minis/aujourd'hui] à gauche · [favoris/templates/perso] à droite */}
      <div className="masonry-lg">
        <div className="px-5 grid grid-cols-2 gap-3 min-w-0">
          <div className="card-premium p-4 border border-lime-400/25 bg-gradient-to-b from-lime-400/[0.12] to-transparent">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Beef className="h-4 w-4 text-lime-400" /> Protéines
            </div>
            <p className="mt-2 text-2xl font-black">
              {protein}
              <span className="text-sm text-muted-foreground font-medium"> / {proteinTarget}g</span>
            </p>
            <Progress
              value={Math.min(100, (protein / proteinTarget) * 100)}
              className="mt-2 h-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Cible {proteinTargetMin}–{proteinTargetMax}g ({pMin}–{pMax}g/kg)
            </p>
          </div>
          <div className="card-premium p-4 border border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.12] to-transparent">
            <div className="flex items-center gap-3">
              <WaterBottle liters={water} target={waterTarget} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Droplet className="h-4 w-4 text-cyan-400" /> Eau
                </div>
                <p className="mt-1 text-2xl font-black text-cyan-100">
                  {water.toFixed(1)}
                  <span className="text-sm text-muted-foreground font-medium">
                    {" "}
                    / {waterTarget}L
                  </span>
                </p>
              </div>
            </div>
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

        <div className="px-5 mt-3 grid grid-cols-3 gap-3 min-w-0">
          <MiniStat
            label="Calories"
            value={`${kcal} kcal`}
            target={`/ ${nut.kcalTarget}`}
            icon={<Flame className="h-3 w-3" />}
          />
          <MiniStat label="Glucides" value={`${carbs}g`} target={`/ ~${nut.carbsTarget}g`} />
          <MiniStat label="Lipides" value={`${fat}g`} target={`/ ~${nut.fatTarget}g`} />
        </div>

        {/* Repas favoris */}
        {favs.length > 0 && (
          <section className="px-5 mt-5 lg:mt-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              ⭐ Tes favoris
            </p>
            <div className="space-y-2">
              {favs.map((f) => (
                <FavCard key={f.id} fav={f} onAdd={() => addFavAsMeal(f)} onRemove={() => removeFav(f.id)} onUpdate={(updated) => {
                  const next = favs.map((x) => x.id === f.id ? updated : x);
                  actions.setProfile({ favoriteMeals: next });
                  toast.success("Favori modifié ✅");
                }} />
              ))}
            </div>
          </section>
        )}

        {/* Meal templates */}
        <section className="px-5 mt-5 lg:mt-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Repas type du programme
          </p>
          <div className="space-y-2">
            {MEAL_TEMPLATES.map((m) => {
              const p = portion[m.name] ?? 1;
              const calced = {
                kcal: Math.round(m.kcal * p),
                protein: Math.round(m.protein * p * 10) / 10,
                carbs: Math.round(m.carbs * p * 10) / 10,
                fat: Math.round(m.fat * p * 10) / 10,
              };
              return (
                <div key={m.name} className="card-premium p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => addQuick(m, p)}
                      className="h-9 w-9 grid place-items-center rounded-full btn-hero shrink-0 active:scale-90 transition-transform"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p !== 1 ? `${m.name} ×${p}` : m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {calced.kcal} kcal · P {calced.protein}g · G {calced.carbs}g · L {calced.fat}g
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[0.5, 1, 1.5, 2].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPortion((prev) => ({ ...prev, [m.name]: prev[m.name] === f ? 1 : f }))}
                        className={`flex-1 h-7 rounded-lg text-[10px] font-bold border transition-all ${
                          p === f
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        ×{f}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Custom meal */}
        <section className="px-5 mt-5 lg:mt-0">
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

        <section className="px-5 mt-5 lg:mt-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Aujourd'hui
          </p>
          {meals.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">
              Aucun repas enregistré aujourd'hui.
            </p>
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
                    onClick={() => toggleFav(m)}
                    className={`p-2 transition-colors ${isFav(m) ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}`}
                    aria-label={isFav(m) ? "Retirer des favoris" : "Mettre en favoris"}
                  >
                    <Star className={`h-4 w-4 ${isFav(m) ? "fill-current" : ""}`} />
                  </button>
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
      </div>
    </PageShell>
  );
}

/** Carte favori avec bouton +, X et crayon d'édition (survol/tap). */
function FavCard({ fav, onAdd, onRemove, onUpdate }: { fav: FavoriteMeal; onAdd: () => void; onRemove: () => void; onUpdate: (f: FavoriteMeal) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(fav.name);
  const [editKcal, setEditKcal] = useState(fav.kcal);
  const [editProtein, setEditProtein] = useState(fav.protein);
  const [editCarbs, setEditCarbs] = useState(fav.carbs);
  const [editFat, setEditFat] = useState(fav.fat);

  return (
    <div className="card-premium p-3 flex items-center gap-3 group">
      <button onClick={onAdd} className="h-9 w-9 grid place-items-center rounded-full btn-hero shrink-0 active:scale-95 transition-transform" aria-label={`Ajouter ${fav.name}`}>
        <Plus className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{fav.name}</p>
        <p className="text-xs text-muted-foreground">{fav.kcal} kcal · P {fav.protein}g · G {fav.carbs}g · L {fav.fat}g</p>
      </div>
      <div className="flex items-center shrink-0">
        <button onClick={() => { setEditName(fav.name); setEditKcal(fav.kcal); setEditProtein(fav.protein); setEditCarbs(fav.carbs); setEditFat(fav.fat); setEditOpen(true); }}
          className="opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-primary p-2 transition-all" aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-2" aria-label="Retirer">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm bg-slate-950 border-white/10">
          <DialogHeader><DialogTitle className="font-black text-sm">Modifier le favori</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nom" className="bg-input h-9 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Kcal</label>
                <Input type="number" value={editKcal} onChange={(e) => setEditKcal(Number(e.target.value))} className="bg-input h-9 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Protéines (g)</label>
                <Input type="number" value={editProtein} onChange={(e) => setEditProtein(Number(e.target.value))} className="bg-input h-9 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Glucides (g)</label>
                <Input type="number" value={editCarbs} onChange={(e) => setEditCarbs(Number(e.target.value))} className="bg-input h-9 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Lipides (g)</label>
                <Input type="number" value={editFat} onChange={(e) => setEditFat(Number(e.target.value))} className="bg-input h-9 text-xs" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" className="flex-1 h-9 text-xs" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button size="sm" className="flex-1 h-9 btn-hero text-xs" onClick={() => { onUpdate({ id: fav.id, name: editName, kcal: editKcal, protein: editProtein, carbs: editCarbs, fat: editFat }); setEditOpen(false); }}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({
  label,
  value,
  target,
  icon,
}: {
  label: string;
  value: string;
  target?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card-premium p-3">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-base font-black mt-0.5">
        {value}
        {target && (
          <span className="text-[10px] text-muted-foreground font-semibold"> {target}</span>
        )}
      </p>
    </div>
  );
}
