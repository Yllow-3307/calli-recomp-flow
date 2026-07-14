import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions, fileToCompressedBase64, type BodyMetric } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Camera, Trash2, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mesures")({
  head: () => ({ meta: [{ title: "Mesures — Calli Recomp" }] }),
  component: MesuresPage,
});

type PhotoSlot = "face" | "profile" | "back";

function MesuresPage() {
  const state = useAppState();
  const actions = useAppActions();
  const [form, setForm] = useState({ weight: "", waist: "", sleep: "" });
  const [energy, setEnergy] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<{ face?: string; profile?: string; back?: string }>({});

  const lastMetric = state.metrics[0];
  const daysSinceLast = lastMetric
    ? Math.floor((Date.now() - new Date(lastMetric.date).getTime()) / 864e5)
    : null;
  const dueForMeasure = daysSinceLast === null || daysSinceLast >= 14;

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
      photos: Object.keys(photos).length ? photos : undefined,
    });
    setForm({ weight: "", waist: "", sleep: "" });
    setNote("");
    setPhotos({});
    toast.success("Mesure enregistrée");
  };

  const weights = useMemo(
    () => state.metrics.filter((m) => m.weight).slice(0, 12).reverse(),
    [state.metrics],
  );
  const wMax = Math.max(...weights.map((m) => m.weight!), 1);
  const wMin = Math.min(...weights.map((m) => m.weight!), wMax);

  return (
    <PageShell>
      <TopBar title="Mesures & photos" subtitle="Toutes les 2 semaines" />

      {dueForMeasure && (
        <div className="px-5">
          <div className="card-premium p-3 flex items-start gap-3 ring-1 ring-primary/40">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs">
              {daysSinceLast === null
                ? "Première prise de mesures : lance-toi maintenant."
                : `Il y a ${daysSinceLast} jours depuis ta dernière mesure. Fais un point aujourd'hui.`}
            </p>
          </div>
        </div>
      )}

      <div className="px-5 mt-3">
        <div className="card-premium p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <LabeledInput label="Poids (kg)" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} />
            <LabeledInput label="Taille (cm)" value={form.waist} onChange={(v) => setForm({ ...form, waist: v })} />
            <LabeledInput label="Sommeil (h)" value={form.sleep} onChange={(v) => setForm({ ...form, sleep: v })} />
          </div>

          <SliderRow label="Énergie" value={energy} onChange={setEnergy} />
          <SliderRow label="Fatigue" value={fatigue} onChange={setFatigue} />

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Photos (face · profil · dos)</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["face", "profile", "back"] as PhotoSlot[]).map((slot) => (
                <PhotoSlotInput
                  key={slot}
                  slot={slot}
                  value={photos[slot]}
                  onChange={(dataUrl) => setPhotos((p) => ({ ...p, [slot]: dataUrl }))}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Photos stockées uniquement sur ton appareil.
            </p>
          </div>

          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (ex: même éclairage matin)" className="bg-input" />
          <Button className="w-full btn-hero h-11" onClick={submit}>Enregistrer</Button>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Camera className="h-4 w-4" /> Astuce : même heure, même éclairage, même tenue.
            </p>
          </div>
        </div>
      </div>

      {weights.length >= 2 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Évolution poids</p>
          <div className="card-premium p-4">
            <div className="flex items-end gap-1 h-24">
              {weights.map((m) => {
                const h = ((m.weight! - wMin) / Math.max(0.1, wMax - wMin)) * 100;
                return (
                  <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(6, h)}%` }} title={`${m.weight} kg`} />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{weights[0].weight}kg</span>
              <span>{weights[weights.length - 1].weight}kg</span>
            </div>
          </div>
        </section>
      )}

      <section className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Timeline</p>
        {state.metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">Aucune mesure encore.</p>
        ) : (
          <div className="space-y-3">
            {state.metrics.slice(0, 30).map((m) => (
              <MetricCard key={m.id} m={m} onRemove={() => actions.removeMetric(m.id)} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function MetricCard({ m, onRemove }: { m: BodyMetric; onRemove: () => void }) {
  return (
    <div className="card-premium p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {m.weight && <span><b>{m.weight}</b> kg</span>}
        {m.waist && <span>taille <b>{m.waist}</b> cm</span>}
        {m.sleep && <span>sommeil <b>{m.sleep}</b>h</span>}
        {m.energy && <span>⚡ {m.energy}/5</span>}
        {m.fatigue && <span>😴 {m.fatigue}/5</span>}
      </div>
      {m.photos && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(["face", "profile", "back"] as PhotoSlot[]).map((s) =>
            m.photos?.[s] ? (
              <img key={s} src={m.photos[s]} alt={s} className="aspect-[3/4] w-full object-cover rounded-lg" />
            ) : (
              <div key={s} className="aspect-[3/4] w-full rounded-lg bg-muted/40 grid place-items-center text-[10px] text-muted-foreground">
                {s}
              </div>
            ),
          )}
        </div>
      )}
      {m.photoNote && <p className="text-xs text-muted-foreground mt-1 italic">{m.photoNote}</p>}
    </div>
  );
}

function PhotoSlotInput({ slot, value, onChange }: { slot: PhotoSlot; value?: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = slot === "face" ? "Face" : slot === "profile" ? "Profil" : "Dos";

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToCompressedBase64(file);
      onChange(b64);
    } catch {
      toast.error("Impossible de charger cette photo");
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="relative aspect-[3/4] w-full rounded-xl bg-muted/40 border border-border overflow-hidden grid place-items-center"
    >
      {value ? (
        <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="text-center text-muted-foreground">
          <Camera className="h-5 w-5 mx-auto mb-1" />
          <p className="text-[10px] uppercase tracking-widest">{label}</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handle} className="hidden" />
    </button>
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

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{value}/5</span>
      </div>
      <Slider value={[value]} min={1} max={5} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
