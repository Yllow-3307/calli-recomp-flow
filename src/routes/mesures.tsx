import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { useAppState, useAppActions, fileToCompressedBase64, type BodyMetric } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Camera,
  Trash2,
  Lock,
  AlertCircle,
  Loader2,
  Images,
  FolderOpen,
  TrendingUp,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { SecureImage } from "@/components/SecureImage";
import { supabase } from "@/integrations/supabase/client";
import { base64ToFile } from "@/lib/photo-utils";
import { WeightChart } from "@/components/WeightChart";

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
  // Poids détecté différent du profil → proposition de recalcul des cibles
  const [pendingWeight, setPendingWeight] = useState<number | null>(null);

  const lastMetric = state.metrics[0];
  const daysSinceLast = lastMetric
    ? Math.floor((Date.now() - new Date(lastMetric.date).getTime()) / 864e5)
    : null;
  const dueForMeasure = daysSinceLast === null || daysSinceLast >= 14;

  const submit = () => {
    const w = parseFloat(form.weight);
    actions.addMetric({
      id: `bm-${Date.now()}`,
      date: new Date().toISOString(),
      weight: w || undefined,
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
    // Poids différent du profil → proposer le recalcul des cibles
    if (w > 0 && Math.abs(w - state.profile.weight) >= 0.1) setPendingWeight(w);
  };

  const weights = useMemo(
    () =>
      state.metrics
        .filter((m) => m.weight)
        .slice(0, 12)
        .reverse(),
    [state.metrics],
  );
  const wMax = Math.max(...weights.map((m) => m.weight!), 1);
  const wMin = Math.min(...weights.map((m) => m.weight!), wMax);

  return (
    <PageShell>
      <TopBar title="Mesures & photos" subtitle="Toutes les 2 semaines" />

      {pendingWeight !== null && (
        <div className="px-5 mt-3">
          <div className="card-premium p-4 border border-primary/30 bg-gradient-to-b from-primary/[0.10] to-transparent">
            <p className="text-sm font-bold">
              ⚖️ Nouveau poids : {pendingWeight} kg{" "}
              <span className="text-muted-foreground font-semibold">
                (profil : {state.profile.weight} kg)
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Recalculer tes cibles ? (kcal · protéines · glucides · lipides · eau)
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="btn-hero h-8 text-xs font-bold"
                onClick={() => {
                  actions.setProfile({ weight: pendingWeight });
                  setPendingWeight(null);
                  toast.success("Cibles recalculées automatiquement ✅");
                }}
              >
                Mettre à jour
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs bg-white/5 border border-white/10"
                onClick={() => setPendingWeight(null)}
              >
                Plus tard
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Grille desktop : formulaire à gauche, courbe + timeline à droite */}
      <div className="masonry-lg">
        <div className="px-5 mt-3">
          <div className="card-premium p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <LabeledInput
                label="Poids (kg)"
                value={form.weight}
                onChange={(v) => setForm({ ...form, weight: v })}
              />
              <LabeledInput
                label="Taille (cm)"
                value={form.waist}
                onChange={(v) => setForm({ ...form, waist: v })}
              />
              <LabeledInput
                label="Sommeil (h)"
                value={form.sleep}
                onChange={(v) => setForm({ ...form, sleep: v })}
              />
              <p className="col-span-3 text-[10px] text-muted-foreground leading-relaxed -mt-0.5">
                😴 <strong>Sommeil</strong> : durée de ta nuit dernière en heures (ex. 7,5 = 7 h
                30). Pas de sommeil « moyen » — c'est bien la nuit qui précède la mesure.
              </p>
            </div>

            <SliderRow label="Énergie" value={energy} onChange={setEnergy} />
            <SliderRow label="Fatigue" value={fatigue} onChange={setFatigue} />

            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Photos (face · profil · dos)
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["face", "profile", "back"] as PhotoSlot[]).map((slot) => (
                  <PhotoSlotInput
                    key={slot}
                    slot={slot}
                    value={photos[slot]}
                    onChange={(path) => setPhotos((p) => ({ ...p, [slot]: path }))}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Photos privées, stockées dans ton espace sécurisé.
              </p>
            </div>

            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (ex: même éclairage matin)"
              className="bg-input"
            />
            <Button className="w-full btn-hero h-11" onClick={submit}>
              Enregistrer
            </Button>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" /> Astuce : même heure, même éclairage, même tenue.
              </p>
            </div>
          </div>
        </div>

        {weights.length >= 2 && (
          <section className="px-5 mt-5 lg:mt-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Évolution poids
            </p>
            <div className="card-premium p-4">
              <div className="flex items-end gap-1 h-24">
                {weights.map((m) => {
                  const h = ((m.weight! - wMin) / Math.max(0.1, wMax - wMin)) * 100;
                  return (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${Math.max(6, h)}%` }}
                        title={`${m.weight} kg`}
                      />
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

        {/* Graphique poids */}
        <section className="px-5 mt-5 lg:mt-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Évolution du poids
          </p>
          <div className="card-premium p-4 border border-white/[0.04]">
            <WeightChart metrics={state.metrics} />
          </div>
        </section>

        <section className="px-5 mt-5 lg:mt-0">
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
      </div>
    </PageShell>
  );
}

function MetricCard({ m, onRemove }: { m: BodyMetric; onRemove: () => void }) {
  return (
    <div className="card-premium p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {new Date(m.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {m.weight && (
          <span>
            <b>{m.weight}</b> kg
          </span>
        )}
        {m.waist && (
          <span>
            taille <b>{m.waist}</b> cm
          </span>
        )}
        {m.sleep && (
          <span>
            sommeil <b>{m.sleep}</b>h
          </span>
        )}
        {m.energy && <span>⚡ {m.energy}/5</span>}
        {m.fatigue && <span>😴 {m.fatigue}/5</span>}
      </div>
      {m.photos && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(["face", "profile", "back"] as PhotoSlot[]).map((s) =>
            m.photos?.[s] ? (
              <SecureImage
                key={s}
                path={m.photos[s]}
                fallbackLabel={s}
                className="aspect-[3/4] w-full object-cover rounded-lg"
              />
            ) : (
              <div
                key={s}
                className="aspect-[3/4] w-full rounded-lg bg-muted/40 grid place-items-center text-[10px] text-muted-foreground"
              >
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

function PhotoSlotInput({
  slot,
  value,
  onChange,
}: {
  slot: PhotoSlot;
  value?: string;
  onChange: (v: string) => void;
}) {
  const libRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const label = slot === "face" ? "Face" : slot === "profile" ? "Profil" : "Dos";

  const uploadFile = async (file: File) => {
    if (!file) return;
    if (!navigator.onLine) {
      toast.error("Connexion requise.");
      return;
    }
    setUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Connecte-toi.");
        return;
      }
      const b64 = await fileToCompressedBase64(file);
      const fileObj = base64ToFile(b64, `${Date.now()}-${slot}.jpg`);
      if (!fileObj) throw new Error("Conversion error");
      const { data, error } = await supabase.storage
        .from("progress-photos")
        .upload(`${session.user.id}/${Date.now()}-${slot}.jpg`, fileObj);
      if (error) throw error;
      if (data?.path) {
        onChange(data.path);
        toast.success("Photo chargée !");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Échec de l'envoi.");
    } finally {
      setUploading(false);
      if (libRef.current) libRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative aspect-[3/4] w-full rounded-xl bg-muted/40 border border-border overflow-hidden">
        {uploading ? (
          <div className="absolute inset-0 grid place-items-center text-center text-muted-foreground bg-muted/80 z-10">
            <Loader2 className="h-5 w-5 mx-auto mb-1 animate-spin text-primary" />
            <p className="text-[10px] uppercase tracking-widest">Envoi...</p>
          </div>
        ) : value ? (
          <SecureImage
            path={value}
            fallbackLabel={label}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold z-0">
            {label}
          </span>
        )}
        <button
          type="button"
          onClick={() => libRef.current?.click()}
          className="absolute bottom-0 inset-x-0 py-2 text-[9px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors flex items-center justify-center gap-1 z-10"
        >
          <Images className="h-3 w-3" /> Choisir une photo
        </button>
      </div>
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
        }}
        className="hidden"
      />
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-input mt-1"
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
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
