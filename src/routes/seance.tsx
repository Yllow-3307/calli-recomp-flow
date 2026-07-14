import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { getTodayProgram, type Exercise } from "@/lib/program";
import { useAppState, useAppActions, type WorkoutLog, type SetLog, type ExerciseLog } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Check, Pause, Play as PlayIcon, RotateCcw, Timer, Video, Trophy, Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seance")({
  head: () => ({ meta: [{ title: "Séance du jour — Calli Recomp" }] }),
  component: SeancePage,
});

type SetsState = Record<string, SetLog[]>;

function SeancePage() {
  const state = useAppState();
  const actions = useAppActions();
  const navigate = useNavigate();
  const day = getTodayProgram(state.profile.daysPerWeek === 5);
  const allExercises: Exercise[] = useMemo(
    () => day.blocks.filter((b) => b.title !== "Consignes").flatMap((b) => b.items),
    [day],
  );
  const startTime = useMemo(() => Date.now(), []);

  const [sets, setSets] = useState<SetsState>(() =>
    Object.fromEntries(
      allExercises.map((e) => [
        e.id,
        Array.from({ length: e.sets }, () => ({
          reps: e.kind === "reps" ? e.targetMax : undefined,
          time: e.kind === "time" ? e.targetMax : undefined,
          rpe: 7,
          done: false,
        })),
      ]),
    ),
  );
  const [exNotes, setExNotes] = useState<Record<string, string>>({});
  const [filmed, setFilmed] = useState(false);
  const [globalNotes, setGlobalNotes] = useState("");
  const [restEx, setRestEx] = useState<Exercise | null>(null);
  const [summary, setSummary] = useState<WorkoutLog | null>(null);

  const totalSets = allExercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = Object.values(sets).flat().filter((s) => s.done).length;
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  const updateSet = (exId: string, idx: number, patch: Partial<SetLog>) => {
    setSets((prev) => {
      const arr = [...prev[exId]];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [exId]: arr };
    });
  };

  const completeSet = (ex: Exercise, idx: number) => {
    setSets((prev) => {
      const arr = [...prev[ex.id]];
      const wasDone = arr[idx].done;
      arr[idx] = { ...arr[idx], done: !wasDone };
      return { ...prev, [ex.id]: arr };
    });
    if (!sets[ex.id][idx].done && ex.rest > 0) setRestEx(ex);
  };

  const finish = () => {
    const exercises: ExerciseLog[] = allExercises.map((e) => ({
      exId: e.id,
      name: e.name,
      targetMin: e.targetMin,
      targetMax: e.targetMax,
      kind: e.kind,
      sets: sets[e.id],
      notes: exNotes[e.id],
    }));
    const totalVolume = exercises.reduce(
      (a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + (s.reps || 0) * (s.weight || 1), 0),
      0,
    );
    const successCount = exercises.filter((e) => {
      const done = e.sets.filter((s) => s.done);
      if (done.length < e.sets.length) return false;
      if (e.targetMin === undefined) return true;
      return done.every((s) => (e.kind === "time" ? (s.time ?? 0) : (s.reps ?? 0)) >= (e.targetMin ?? 0));
    }).length;
    const rpes = exercises.flatMap((e) => e.sets.map((s) => s.rpe).filter((r): r is number => !!r));
    const avgRpe = rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length) : undefined;

    const log: WorkoutLog = {
      id: `w-${Date.now()}`,
      date: new Date().toISOString(),
      dayKey: day.key,
      dayTitle: day.title,
      duration: Math.round((Date.now() - startTime) / 60000),
      rpe: avgRpe,
      filmed,
      notes: globalNotes,
      exercises,
      totalVolume,
      successCount,
    };
    actions.addWorkout(log);
    setSummary(log);
  };

  if (summary) return <SummaryScreen log={summary} totalExercises={allExercises.length} onClose={() => navigate({ to: "/" })} />;

  return (
    <PageShell>
      <TopBar title={day.title} subtitle={`${day.day} • ~${day.duration} min`} />

      <div className="px-5">
        <div className="card-premium p-4 sticky top-2 z-10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression séance</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full btn-hero transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{doneSets}/{totalSets} séries</p>
        </div>
      </div>

      {day.warmup.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Échauffement</p>
          <div className="card-premium p-4 space-y-1.5">
            {day.warmup.map((w) => (<p key={w} className="text-sm">🔥 {w}</p>))}
          </div>
        </section>
      )}

      {day.blocks.map((block) => (
        <section key={block.title} className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{block.title}</p>
          <div className="space-y-3">
            {block.items.map((ex) => (
              block.title === "Consignes" ? (
                <div key={ex.id} className="card-premium p-3 text-sm text-muted-foreground">▸ {ex.name}</div>
              ) : (
                <ExerciseCard
                  key={ex.id}
                  ex={ex}
                  sets={sets[ex.id]}
                  onSetChange={(idx, patch) => updateSet(ex.id, idx, patch)}
                  onComplete={(idx) => completeSet(ex, idx)}
                  onRest={() => setRestEx(ex)}
                  note={exNotes[ex.id] ?? ""}
                  onNote={(v) => setExNotes({ ...exNotes, [ex.id]: v })}
                />
              )
            ))}
          </div>
        </section>
      ))}

      {day.alternatives && day.alternatives.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Alternatives</p>
          <div className="card-premium p-4 space-y-1.5 text-sm text-muted-foreground">
            {day.alternatives.map((a) => (<p key={a}>↺ {a}</p>))}
          </div>
        </section>
      )}

      <section className="px-5 mt-5 space-y-3">
        <div className="card-premium p-4">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes de séance</label>
          <Textarea
            value={globalNotes}
            onChange={(e) => setGlobalNotes(e.target.value)}
            placeholder="Sensations, forme, contexte..."
            className="mt-2 bg-transparent border-border resize-none"
          />
        </div>
        <label className="card-premium p-4 flex items-center gap-3 cursor-pointer">
          <Checkbox checked={filmed} onCheckedChange={(v) => setFilmed(!!v)} />
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Je me suis filmé sur les mouvements clés</span>
        </label>
      </section>

      <div className="px-5 mt-6">
        <Button onClick={finish} className="w-full h-14 rounded-2xl btn-hero text-base">
          Terminer la séance
        </Button>
      </div>

      {restEx && <RestTimer seconds={restEx.rest} label={restEx.name} onClose={() => setRestEx(null)} />}
    </PageShell>
  );
}

function ExerciseCard({
  ex,
  sets,
  onSetChange,
  onComplete,
  onRest,
  note,
  onNote,
}: {
  ex: Exercise;
  sets: SetLog[];
  onSetChange: (idx: number, patch: Partial<SetLog>) => void;
  onComplete: (idx: number) => void;
  onRest: () => void;
  note: string;
  onNote: (v: string) => void;
}) {
  const [openNote, setOpenNote] = useState(false);
  return (
    <div className="card-premium p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{ex.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{ex.sets} × {ex.target}</p>
          {ex.note && <p className="text-xs text-muted-foreground mt-1 italic">{ex.note}</p>}
        </div>
        {ex.rest > 0 && (
          <button onClick={onRest} className="shrink-0 text-xs flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
            <Timer className="h-3 w-3" /> {ex.rest}s
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {sets.map((s, i) => (
          <div key={i} className={`rounded-xl border p-2.5 transition ${s.done ? "border-primary/50 bg-primary/5" : "border-border"}`}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-10">Set {i + 1}</span>
              {ex.kind === "time" ? (
                <NumberField label="s" value={s.time} onChange={(v) => onSetChange(i, { time: v })} />
              ) : (
                <NumberField label="reps" value={s.reps} onChange={(v) => onSetChange(i, { reps: v })} />
              )}
              <NumberField label="kg" value={s.weight} onChange={(v) => onSetChange(i, { weight: v })} optional />
              <RpeMini value={s.rpe ?? 7} onChange={(v) => onSetChange(i, { rpe: v })} />
              <button
                onClick={() => onComplete(i)}
                className={`ml-auto h-9 w-9 grid place-items-center rounded-lg border transition ${
                  s.done ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                }`}
                aria-label="Valider la série"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setOpenNote((v) => !v)}
        className="mt-2 text-[11px] text-muted-foreground underline underline-offset-2"
      >
        {openNote ? "Masquer note" : note ? "✎ Modifier note" : "+ Ajouter une note"}
      </button>
      {openNote && (
        <Textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Note sur cet exercice..."
          className="mt-2 bg-transparent border-border resize-none text-sm"
        />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, optional }: { label: string; value?: number; onChange: (v: number | undefined) => void; optional?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
        placeholder={optional ? "—" : ""}
        className="h-9 w-14 bg-input text-center px-1 text-sm"
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function RpeMini({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground">RPE</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-9 rounded-md bg-input border border-border text-sm px-1"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}

function RestTimer({ seconds, label, onClose }: { seconds: number; label: string; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused]);

  useEffect(() => {
    if (left === 0) {
      try { navigator.vibrate?.([200, 80, 200]); } catch { /* noop */ }
    }
  }, [left]);

  const pct = ((seconds - left) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl grid place-items-center px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Repos · {label}</p>
        <p className={`mt-4 text-8xl font-black tabular-nums ${left === 0 ? "text-gradient" : ""}`}>
          {String(Math.max(0, left)).padStart(2, "0")}
        </p>
        <p className="mt-2 text-muted-foreground">seconde{left > 1 ? "s" : ""}</p>
        <div className="mx-auto mt-4 h-1.5 w-48 rounded-full bg-muted overflow-hidden">
          <div className="h-full btn-hero transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="secondary" size="lg" onClick={() => setLeft(seconds)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="lg" className="btn-hero px-8" onClick={() => setPaused((p) => !p)}>
            {paused ? <PlayIcon className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button variant="secondary" size="lg" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}

function SummaryScreen({ log, totalExercises, onClose }: { log: WorkoutLog; totalExercises: number; onClose: () => void }) {
  const doneSets = log.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const totalSets = log.exercises.reduce((a, e) => a + e.sets.length, 0);
  useEffect(() => {
    toast.success("Séance terminée 🔥", { description: `${doneSets}/${totalSets} séries` });
  }, [doneSets, totalSets]);

  return (
    <PageShell>
      <div className="px-5 pt-8 pb-4 text-center">
        <div className="mx-auto h-16 w-16 grid place-items-center rounded-full btn-hero mb-3">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black">Séance bouclée</h1>
        <p className="text-muted-foreground text-sm">{log.dayTitle}</p>
      </div>

      <div className="px-5 grid grid-cols-2 gap-3">
        <StatCard label="Durée" value={`${log.duration} min`} />
        <StatCard label="RPE moyen" value={`${log.rpe ?? "—"}/10`} />
        <StatCard label="Séries" value={`${doneSets}/${totalSets}`} />
        <StatCard label="Exercices réussis" value={`${log.successCount ?? 0}/${totalExercises}`} accent />
      </div>

      {log.totalVolume && log.totalVolume > 0 && (
        <div className="px-5 mt-3">
          <div className="card-premium p-4 flex items-center gap-3">
            <Flame className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Volume total</p>
              <p className="text-xl font-black">{log.totalVolume.toLocaleString("fr-FR")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mt-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Détail par exercice</p>
        <div className="space-y-2">
          {log.exercises.map((e) => {
            const done = e.sets.filter((s) => s.done);
            const values = done.map((s) => e.kind === "time" ? s.time : s.reps).filter((v): v is number => !!v);
            return (
              <div key={e.exId} className="card-premium p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{e.name}</p>
                  <span className="text-xs text-muted-foreground">{done.length}/{e.sets.length}</span>
                </div>
                {values.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {values.join(" · ")} {e.kind === "time" ? "s" : "reps"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-6">
        <Button onClick={onClose} className="w-full h-14 rounded-2xl btn-hero text-base">Retour à l'accueil</Button>
      </div>
    </PageShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card-premium p-4 ${accent ? "ring-1 ring-primary/40" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-black mt-1 ${accent ? "text-gradient" : ""}`}>{value}</p>
    </div>
  );
}
