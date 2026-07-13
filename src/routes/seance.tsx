import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { getTodayProgram, type Exercise } from "@/lib/program";
import { useAppState, useAppActions, type WorkoutLog } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Check, Pause, Play as PlayIcon, RotateCcw, Timer, Video } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seance")({
  head: () => ({ meta: [{ title: "Séance du jour — Calli Recomp" }] }),
  component: SeancePage,
});

function SeancePage() {
  const state = useAppState();
  const actions = useAppActions();
  const navigate = useNavigate();
  const day = getTodayProgram(state.profile.daysPerWeek === 5);
  const allExercises: Exercise[] = useMemo(() => day.blocks.flatMap((b) => b.items), [day]);
  const startTime = useMemo(() => Date.now(), []);

  const [sets, setSets] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(allExercises.map((e) => [e.id, Array(e.sets).fill(false)])),
  );
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState("");
  const [filmed, setFilmed] = useState(false);
  const [restEx, setRestEx] = useState<Exercise | null>(null);

  const totalSets = allExercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = Object.values(sets).flat().filter(Boolean).length;
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  const toggleSet = (exId: string, idx: number, ex: Exercise) => {
    setSets((prev) => {
      const cur = [...prev[exId]];
      cur[idx] = !cur[idx];
      // start rest if just checked
      if (cur[idx] && ex.rest > 0) setRestEx(ex);
      return { ...prev, [exId]: cur };
    });
  };

  const finish = () => {
    const log: WorkoutLog = {
      id: `w-${Date.now()}`,
      date: new Date().toISOString(),
      dayKey: day.key,
      duration: Math.round((Date.now() - startTime) / 60000),
      rpe,
      filmed,
      notes,
      exercises: allExercises.map((e) => ({
        exId: e.id,
        sets: sets[e.id].map((done) => ({ done })),
      })),
    };
    actions.addWorkout(log);
    toast.success("Séance terminée 🔥", { description: `${doneSets}/${totalSets} séries validées` });
    navigate({ to: "/" });
  };

  return (
    <PageShell>
      <TopBar title={day.title} subtitle={`${day.day} • ~${day.duration} min`} />

      {/* Progress */}
      <div className="px-5">
        <div className="card-premium p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full btn-hero transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{doneSets}/{totalSets} séries</p>
        </div>
      </div>

      {/* Warmup */}
      {day.warmup.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Échauffement</p>
          <div className="card-premium p-4 space-y-1.5">
            {day.warmup.map((w) => (
              <p key={w} className="text-sm">🔥 {w}</p>
            ))}
          </div>
        </section>
      )}

      {/* Blocks */}
      {day.blocks.map((block) => (
        <section key={block.title} className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{block.title}</p>
          <div className="space-y-3">
            {block.items.map((ex) => (
              <div key={ex.id} className="card-premium p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold">{ex.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {ex.sets} × {ex.target}
                    </p>
                    {ex.note && <p className="text-xs text-muted-foreground mt-1 italic">{ex.note}</p>}
                  </div>
                  {ex.rest > 0 && (
                    <button
                      onClick={() => setRestEx(ex)}
                      className="shrink-0 text-xs flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground"
                    >
                      <Timer className="h-3 w-3" /> {ex.rest}s
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sets[ex.id].map((done, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSet(ex.id, i, ex)}
                      className={`h-11 min-w-11 px-3 rounded-xl text-sm font-bold border transition ${
                        done
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4 inline" /> : `Set ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Alternatives */}
      {day.alternatives && day.alternatives.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Alternatives</p>
          <div className="card-premium p-4 space-y-1.5 text-sm text-muted-foreground">
            {day.alternatives.map((a) => (
              <p key={a}>↺ {a}</p>
            ))}
          </div>
        </section>
      )}

      {/* Notes & RPE */}
      <section className="px-5 mt-5 space-y-3">
        <div className="card-premium p-4">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">RPE (ressenti /10)</label>
          <div className="mt-3 flex items-center gap-3">
            <Slider value={[rpe]} min={1} max={10} step={1} onValueChange={(v) => setRpe(v[0])} className="flex-1" />
            <span className="text-2xl font-black w-8 text-center">{rpe}</span>
          </div>
        </div>
        <div className="card-premium p-4">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sensations, charge, forme..."
            className="mt-2 bg-transparent border-border resize-none"
          />
        </div>
        <label className="card-premium p-4 flex items-center gap-3 cursor-pointer">
          <Checkbox checked={filmed} onCheckedChange={(v) => setFilmed(!!v)} />
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Je me suis filmé sur les mouvements clés</span>
        </label>
      </section>

      {/* Finish */}
      <div className="px-5 mt-6">
        <Button onClick={finish} className="w-full h-14 rounded-2xl btn-hero text-base">
          Terminer la séance
        </Button>
      </div>

      {/* Rest Timer overlay */}
      {restEx && <RestTimer seconds={restEx.rest} onClose={() => setRestEx(null)} />}
    </PageShell>
  );
}

function RestTimer({ seconds, onClose }: { seconds: number; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused]);

  useEffect(() => {
    if (left === 0) {
      try {
        navigator.vibrate?.(400);
      } catch { /* noop */ }
    }
  }, [left]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl grid place-items-center px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Repos</p>
        <p className={`mt-4 text-8xl font-black tabular-nums ${left === 0 ? "text-gradient" : ""}`}>
          {String(Math.max(0, left)).padStart(2, "0")}
        </p>
        <p className="mt-2 text-muted-foreground">seconde{left > 1 ? "s" : ""}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="secondary" size="lg" onClick={() => setLeft(seconds)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="lg" className="btn-hero px-8" onClick={() => setPaused((p) => !p)}>
            {paused ? <PlayIcon className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button variant="secondary" size="lg" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
