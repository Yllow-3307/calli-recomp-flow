import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mesures")({
  head: () => ({ meta: [{ title: "Mesures — Calli Recomp" }] }),
  component: MesuresPage,
});

function MesuresPage() {
  const state = useAppState();
  const actions = useAppActions();
  const [form, setForm] = useState({ weight: "", waist: "", sleep: "" });
  const [energy, setEnergy] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [note, setNote] = useState("");

  const submit = () => {
    actions.addMetric({
      id: `bm-${Date.now()}`,
      date: new Date().toISOString(),
      weight: parseFloat(form.weight) || undefined,
      waist: parseFloat(form.waist) || undefined,
      sleep: parseFloat(form.sleep) || undefined,
      energy,
      fatigue,
      photoNote: note || undefined,
    });
    setForm({ weight: "", waist: "", sleep: "" });
    setNote("");
    toast.success("Mesure enregistrée");
  };

  return (
    <PageShell>
      <TopBar title="Mesures & photos" subtitle="Toutes les 2 semaines" />

      <div className="px-5">
        <div className="card-premium p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <LabeledInput label="Poids (kg)" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} />
            <LabeledInput label="Taille (cm)" value={form.waist} onChange={(v) => setForm({ ...form, waist: v })} />
            <LabeledInput label="Sommeil (h)" value={form.sleep} onChange={(v) => setForm({ ...form, sleep: v })} />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Énergie</span>
              <span className="font-bold">{energy}/5</span>
            </div>
            <Slider value={[energy]} min={1} max={5} step={1} onValueChange={(v) => setEnergy(v[0])} />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Fatigue</span>
              <span className="font-bold">{fatigue}/5</span>
            </div>
            <Slider value={[fatigue]} min={1} max={5} step={1} onValueChange={(v) => setFatigue(v[0])} />
          </div>

          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note photo (ex: face + profil)" className="bg-input" />
          <Button className="w-full btn-hero h-11" onClick={submit}>Enregistrer</Button>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Camera className="h-4 w-4" /> Photos : prends face + profil + dos, même éclairage.
            </p>
          </div>
        </div>
      </div>

      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Historique</p>
        {state.metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">Aucune mesure encore.</p>
        ) : (
          <div className="space-y-2">
            {state.metrics.slice(0, 20).map((m) => (
              <div key={m.id} className="card-premium p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {m.weight && <span><b>{m.weight}</b> kg</span>}
                  {m.waist && <span>taille <b>{m.waist}</b> cm</span>}
                  {m.sleep && <span>sommeil <b>{m.sleep}</b>h</span>}
                  {m.energy && <span>⚡ {m.energy}/5</span>}
                  {m.fatigue && <span>😴 {m.fatigue}/5</span>}
                </div>
                {m.photoNote && <p className="text-xs text-muted-foreground mt-1 italic">{m.photoNote}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <Input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="bg-input mt-1" />
    </div>
  );
}
