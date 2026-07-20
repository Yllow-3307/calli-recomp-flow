import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { getTodayProgram, EXERCISE_SWAPS, type Exercise } from "@/lib/program";
import { planDays } from "@/lib/plan";
import { SessionTypeBadge } from "@/routes/index";
import {
  useAppState,
  useAppActions,
  suggestProgressionForExercise,
  lastPerformanceHint,
  personalBests,
  findNewRecords,
  type WorkoutLog,
  type SetLog,
  type ExerciseLog,
  type ProgressionSuggestion,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Check,
  Pause,
  Play as PlayIcon,
  RotateCcw,
  Timer,
  Video,
  Trophy,
  Flame,
  Activity,
  Award,
  ArrowLeftRight,
  Tags,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SESSION_TAGS, encodeSessionTags } from "@/lib/session-tags";

export const Route = createFileRoute("/seance")({
  head: () => ({ meta: [{ title: "Séance du jour — Calli Recomp" }] }),
  component: SeancePage,
});

type SetsState = Record<string, SetLog[]>;

function SeancePage() {
  const state = useAppState();
  const actions = useAppActions();
  const navigate = useNavigate();
  const day = getTodayProgram(state.profile.daysPerWeek === 5, planDays(state.profile));
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
  // V11.0 : tags & humeur multi-sélection
  const [pickedTags, setPickedTags] = useState<string[]>([]);
  const [showTagPopup, setShowTagPopup] = useState(false);

  // Remplacements d'exercices (persistés dans le profil) : "dayKey::exId" → nom
  const slotKey = (ex: Exercise) => `${day.key}::${ex.id}`;
  const [swaps, setSwaps] = useState<Record<string, string>>(
    () => state.profile.exerciseSwaps ?? {},
  );
  const applySwap = (ex: Exercise, alt: string | null) => {
    const next = { ...swaps };
    if (alt) next[slotKey(ex)] = alt;
    else delete next[slotKey(ex)];
    setSwaps(next);
    actions.setProfile({ exerciseSwaps: next });
  };
  const nameOf = (ex: Exercise) => swaps[slotKey(ex)] ?? ex.name;

  // Dernière perf + suggestion par exercice (recalculées à jour de l'historique)
  const exMeta = useMemo(
    () =>
      Object.fromEntries(
        allExercises.map((ex) => [
          ex.id,
          {
            hint: lastPerformanceHint(ex.id, ex.kind, state.workouts),
            sug: suggestProgressionForExercise(ex.id, ex.targetMax, ex.kind, state.workouts),
          },
        ]),
      ) as Record<string, { hint: string | null; sug: ProgressionSuggestion | null }>,
    [allExercises, state.workouts],
  );

  const totalSets = allExercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = Object.values(sets)
    .flat()
    .filter((s) => s.done).length;
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  // Raccourcis clavier desktop : Espace = valider la série suivante, Échap = fermer le minuteur.
  // (La logique de la séance ne change pas — ce ne sont que des alias de clics existants.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Escape" && restEx) {
        setRestEx(null);
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        for (const ex of allExercises) {
          const arr = sets[ex.id] ?? [];
          const idx = arr.findIndex((s) => !s.done);
          if (idx >= 0) {
            completeSet(ex, idx);
            return;
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allExercises, sets, restEx]);

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

  const doFinish = (forceTags?: string[]) => {
    const finalTags = forceTags ?? pickedTags;
    const finalNotes = finalTags.length ? encodeSessionTags(finalTags, globalNotes) : globalNotes;
    const exercises: ExerciseLog[] = allExercises.map((e) => ({
      exId: e.id,
      name: nameOf(e),
      targetMin: e.targetMin,
      targetMax: e.targetMax,
      kind: e.kind,
      sets: sets[e.id],
      notes: exNotes[e.id],
    }));
    const totalVolume = exercises.reduce(
      (a, e) =>
        a + e.sets.filter((s) => s.done).reduce((b, s) => b + (s.reps || 0) * (s.weight || 1), 0),
      0,
    );
    const successCount = exercises.filter((e) => {
      const done = e.sets.filter((s) => s.done);
      if (done.length < e.sets.length) return false;
      if (e.targetMin === undefined) return true;
      return done.every(
        (s) => (e.kind === "time" ? (s.time ?? 0) : (s.reps ?? 0)) >= (e.targetMin ?? 0),
      );
    }).length;
    const rpes = exercises.flatMap((e) => e.sets.map((s) => s.rpe).filter((r): r is number => !!r));
    const avgRpe = rpes.length
      ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length)
      : undefined;

    const log: WorkoutLog = {
      id: `w-${Date.now()}`,
      date: new Date().toISOString(),
      dayKey: day.key,
      dayTitle: day.title,
      duration: Math.round((Date.now() - startTime) / 60000),
      rpe: avgRpe,
      filmed,
      notes: finalNotes,
      exercises,
      totalVolume,
      successCount,
    };
    // Records personnels : comparés à l'historique AVANT l'ajout de cette séance
    const prevBests = personalBests(state.workouts);
    const newRecords = findNewRecords(prevBests, log);
    actions.addWorkout(log);
    if (newRecords.length)
      toast.success("🏆 Nouveau record !", {
        description: newRecords
          .map(
            (r) =>
              `${r.name} : ${r.value}${r.kind === "time" ? " s" : " reps"}${r.weight ? ` · ${r.weight} kg` : ""}`,
          )
          .join(" — "),
        duration: 6000,
      });
    setSummary(log);
  };
  const finish = () => setShowTagPopup(true);

  if (summary)
    return (
      <SummaryScreen
        log={summary}
        totalExercises={allExercises.length}
        onClose={() => navigate({ to: "/" })}
      />
    );

  return (
    <PageShell>
      {/* Top Bar avec Type de Séance */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
            {day.day} • ~{day.duration} min
          </span>
          <h1 className="text-2xl font-black mt-0.5 truncate">{day.title}</h1>
        </div>
        <SessionTypeBadge type={day.type} />
      </div>

      <div className="px-5">
        <div className="card-premium p-4 sticky top-2 z-10 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" /> Progression séance
            </span>
            <span className="font-extrabold text-primary">{progress}%</span>
          </div>
          <div className="mt-2.5 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            <span>
              {doneSets} / {totalSets} Séries complétées
            </span>
            <span>⏱️ Temps écoulé</span>
          </div>
        </div>
        <p className="hidden lg:block text-[10px] text-muted-foreground mt-2 text-right">
          Astuce PC : <b>Espace</b> = valider la série suivante · <b>Échap</b> = fermer le minuteur
        </p>
      </div>

      {day.warmup.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold px-1">
            Échauffement
          </p>
          <div className="card-premium p-4 space-y-2 border border-white/[0.04]">
            {day.warmup.map((w, idx) => (
              <p key={w} className="text-sm flex items-center gap-2.5 text-slate-300">
                <span className="text-primary font-bold">0{idx + 1}</span>
                <span>{w}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      {day.blocks.map((block) => (
        <section key={block.title} className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold px-1">
            {block.title}
          </p>
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
            {block.items.map((ex) =>
              block.title === "Consignes" ? (
                <div
                  key={ex.id}
                  className="card-premium p-3 text-sm text-slate-300 border border-white/[0.04] flex items-start gap-2 lg:col-span-2"
                >
                  <span className="text-primary mt-0.5">▸</span>
                  <span>{ex.name}</span>
                </div>
              ) : (
                <ExerciseCard
                  key={ex.id}
                  ex={ex}
                  displayName={nameOf(ex)}
                  hint={exMeta[ex.id]?.hint ?? null}
                  sug={exMeta[ex.id]?.sug ?? null}
                  swapAlts={EXERCISE_SWAPS[ex.name] ?? []}
                  currentSwap={swaps[slotKey(ex)]}
                  onSwap={(alt) => applySwap(ex, alt)}
                  sets={sets[ex.id]}
                  onSetChange={(idx, patch) => updateSet(ex.id, idx, patch)}
                  onComplete={(idx) => completeSet(ex, idx)}
                  onRest={() => setRestEx(ex)}
                  note={exNotes[ex.id] ?? ""}
                  onNote={(v) => setExNotes({ ...exNotes, [ex.id]: v })}
                />
              ),
            )}
          </div>
        </section>
      ))}

      {day.alternatives && day.alternatives.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-bold px-1">
            Alternatives
          </p>
          <div className="card-premium p-4 space-y-2 text-sm text-slate-300 border border-white/[0.04]">
            {day.alternatives.map((a) => (
              <p key={a} className="flex items-center gap-2">
                <span className="text-accent font-bold">↺</span>
                <span>{a}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-5 space-y-3">
        <div className="card-premium p-4 border border-white/[0.04]">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Notes de séance
          </label>
          <Textarea
            value={globalNotes}
            onChange={(e) => setGlobalNotes(e.target.value)}
            placeholder="Sensations, forme, contexte..."
            className="mt-2 bg-white/[0.02] border-white/5 focus:border-primary/50 text-sm rounded-xl resize-none min-h-[80px]"
          />
        </div>
        <label className="card-premium p-4 flex items-center gap-3 cursor-pointer border border-white/[0.04] active:scale-[0.99] transition-transform">
          <Checkbox
            checked={filmed}
            onCheckedChange={(v) => setFilmed(!!v)}
            className="border-white/30 data-[state=checked]:bg-primary"
          />
          <Video className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-slate-300 select-none">
            Je me suis filmé sur les mouvements clés
          </span>
        </label>
      </section>

      {/* Tags & humeur : popup avant validation */}
      {showTagPopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl grid place-items-center px-6">
          <div className="card-premium p-6 max-w-sm w-full space-y-4 relative">
            <div className="absolute -top-2 -right-2">
              <button
                type="button"
                onClick={() => setShowTagPopup(false)}
                className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg">Comment s'est passée ta séance ?</h3>
              <p className="text-xs text-muted-foreground mt-1">Sélectionne les tags qui correspondent (optionnel)</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SESSION_TAGS.map((tag) => {
                const on = pickedTags.includes(tag.emoji);
                return (
                  <button
                    key={tag.emoji}
                    type="button"
                    onClick={() =>
                      setPickedTags((prev) =>
                        on ? prev.filter((t) => t !== tag.emoji) : [...prev, tag.emoji],
                      )
                    }
                    className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      on
                        ? "bg-primary/20 border-primary/50 text-foreground shadow-[0_0_15px_rgba(255,107,74,0.2)]"
                        : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tag.emoji} {tag.label}
                  </button>
                );
              })}
            </div>
            {pickedTags.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Sélectionnés : {pickedTags.join(" ")}
              </p>
            )}
            <Button
              onClick={() => doFinish(pickedTags)}
              className="w-full h-11 btn-hero text-sm font-bold"
            >
              {pickedTags.length > 0 ? `✅ Valider (${pickedTags.length} tag${pickedTags.length > 1 ? "s" : ""})` : "⏭️ Valider sans tag"}
            </Button>
          </div>
        </div>
      )}

      <div className="px-5 mt-6 mb-8">
        <Button
          onClick={finish}
          className="w-full h-14 rounded-2xl btn-hero text-base font-extrabold shadow-[0_8px_30px_rgba(139,92,246,0.35)] active:scale-95 transition-all"
        >
          Terminer la séance
        </Button>
      </div>

      {restEx && (
        <RestTimer seconds={restEx.rest} label={restEx.name} onClose={() => setRestEx(null)} />
      )}
    </PageShell>
  );
}

function ExerciseCard({
  ex,
  displayName,
  hint,
  sug,
  swapAlts,
  currentSwap,
  onSwap,
  sets,
  onSetChange,
  onComplete,
  onRest,
  note,
  onNote,
}: {
  ex: Exercise;
  displayName: string;
  hint: string | null;
  sug: ProgressionSuggestion | null;
  swapAlts: string[];
  currentSwap?: string;
  onSwap: (alt: string | null) => void;
  sets: SetLog[];
  onSetChange: (idx: number, patch: Partial<SetLog>) => void;
  onComplete: (idx: number) => void;
  onRest: () => void;
  note: string;
  onNote: (v: string) => void;
}) {
  const [openNote, setOpenNote] = useState(false);
  return (
    <div className="card-premium p-4 border border-white/[0.05] relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-base text-white">{displayName}</h3>
          {currentSwap && (
            <p className="text-[10px] text-muted-foreground italic mt-0.5">remplace : {ex.name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-bold text-slate-300">
              {ex.sets} séries
            </span>
            <span>×</span>
            <span className="font-semibold text-primary">{ex.target}</span>
          </p>
          {hint && <p className="text-[10px] text-cyan-300/80 mt-1.5">↺ Dernière : {hint}</p>}
          {sug && (
            <p
              className={`text-[10px] font-bold mt-1 ${
                sug.reason === "up"
                  ? "text-success"
                  : sug.reason === "down"
                    ? "text-amber-400"
                    : "text-muted-foreground"
              }`}
            >
              {sug.reason === "up" ? "↗" : sug.reason === "down" ? "↘" : "→"} {sug.delta}
              <span className="font-normal text-muted-foreground"> · {sug.hint}</span>
            </p>
          )}
          {ex.note && (
            <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed bg-white/[0.02] p-2 rounded-lg border border-white/[0.02]">
              {ex.note}
            </p>
          )}
        </div>
        {ex.rest > 0 && (
          <button
            onClick={onRest}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-primary active:scale-95 transition-transform"
          >
            <Timer className="h-3.5 w-3.5" /> {ex.rest}s
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {sets.map((s, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 transition-all duration-300 ${
              s.done
                ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.06)]"
                : "border-white/5 bg-white/[0.01]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[9px] uppercase font-black tracking-widest w-10 ${s.done ? "text-emerald-400" : "text-muted-foreground"}`}
              >
                Set {i + 1}
              </span>
              {ex.kind === "distance" ? (
                <span className="text-xs font-mono text-cyan-300 px-2 py-1 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  🏃 {ex.target}
                </span>
              ) : ex.kind === "time" ? (
                <NumberField label="s" value={s.time} onChange={(v) => onSetChange(i, { time: v })} />
              ) : (
                <>
                  <NumberField label="reps" value={s.reps} onChange={(v) => onSetChange(i, { reps: v })} />
                  <NumberField label="kg" value={s.weight} onChange={(v) => onSetChange(i, { weight: v })} optional />
                </>
              )}
              <RpeMini value={s.rpe ?? 7} onChange={(v) => onSetChange(i, { rpe: v })} />

              <button
                onClick={() => onComplete(i)}
                className={`ml-auto h-9 w-9 grid place-items-center rounded-lg border transition-all duration-300 active:scale-90 ${
                  s.done
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                }`}
                aria-label="Valider la série"
              >
                <Check className={`h-4 w-4 ${s.done ? "stroke-[3px]" : ""}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {swapAlts.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={currentSwap ?? ""}
            onChange={(e) => onSwap(e.target.value || null)}
            className="flex-1 min-w-0 bg-white/[0.02] border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-primary/40"
          >
            <option value="" className="bg-slate-900">
              {currentSwap ? "↩ Revenir à l'exercice d'origine" : "Remplacer l'exercice…"}
            </option>
            {swapAlts.map((alt) => (
              <option key={alt} value={alt} className="bg-slate-900">
                {alt}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() => setOpenNote((v) => !v)}
        className="mt-3 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        <span>
          {openNote
            ? "Masquer la note"
            : note
              ? "✎ Modifier la note"
              : "+ Ajouter une note sur l'exercice"}
        </span>
      </button>
      {openNote && (
        <Textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Ressenti, fatigue, charge..."
          className="mt-2 bg-white/[0.01] border-white/5 focus:border-primary/50 text-xs rounded-xl resize-none text-slate-300"
        />
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-lg px-1.5 py-0.5">
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
        placeholder={optional ? "—" : ""}
        className="h-7 w-12 bg-transparent text-center border-none p-0 focus-visible:ring-0 text-xs font-bold text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-[10px] font-extrabold text-muted-foreground lowercase">{label}</span>
    </div>
  );
}

function RpeMini({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-lg px-1.5 py-0.5">
      <span className="text-[9px] font-black text-muted-foreground">RPE</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-7 bg-transparent border-none text-xs font-bold text-slate-200 focus-visible:ring-0 focus:outline-none pr-1"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n} className="bg-slate-900 text-white">
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

function RestTimer({
  seconds,
  label,
  onClose,
}: {
  seconds: number;
  label: string;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused]);

  useEffect(() => {
    if (left === 0) {
      try {
        navigator.vibrate?.([200, 80, 200]);
      } catch {
        /* noop */
      }
    }
  }, [left]);

  const pct = ((seconds - left) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl grid place-items-center px-6 transition-all duration-300">
      {/* Halo lumineux façon Apple Fitness */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <div className="text-center relative z-10 w-full max-w-xs">
        <p className="text-[10px] uppercase font-black tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 w-fit mx-auto">
          Temps de repos
        </p>
        <p className="mt-6 text-xs font-bold text-slate-300 leading-snug line-clamp-2 px-4">
          {label}
        </p>

        {/* Chronomètre Circulaire / Ligne de Progression Premium */}
        <div className="relative my-8 py-4">
          <p
            className={`text-8xl font-black tracking-tighter tabular-nums ${left === 0 ? "text-gradient animate-pulse" : "text-white"}`}
          >
            {String(Math.max(0, left)).padStart(2, "0")}
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            secondes restantes
          </p>
        </div>

        {/* Barre de progression épurée */}
        <div className="mx-auto h-2 w-48 rounded-full bg-white/5 border border-white/5 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
            style={{ width: `${100 - pct}%` }}
          />
        </div>

        {/* Boutons de contrôle Apple Fitness style */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={() => setLeft(seconds)}
            className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            title="Réinitialiser"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            onClick={() => setPaused((p) => !p)}
            className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            {paused ? (
              <PlayIcon className="h-6 w-6 fill-current ml-0.5" />
            ) : (
              <Pause className="h-6 w-6" />
            )}
          </button>

          <button
            onClick={onClose}
            className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            title="Passer"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryScreen({
  log,
  totalExercises,
  onClose,
}: {
  log: WorkoutLog;
  totalExercises: number;
  onClose: () => void;
}) {
  const doneSets = log.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const totalSets = log.exercises.reduce((a, e) => a + e.sets.length, 0);
  useEffect(() => {
    toast.success("Séance terminée 🔥", { description: `${doneSets}/${totalSets} séries` });
  }, [doneSets, totalSets]);

  return (
    <PageShell>
      <div className="px-5 pt-10 pb-4 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

        <div className="mx-auto h-16 w-16 grid place-items-center rounded-2xl bg-gradient-to-tr from-primary to-accent shadow-[0_8px_30px_rgba(139,92,246,0.3)] mb-4 animate-float">
          <Trophy className="h-8 w-8 text-white stroke-[2.5px]" />
        </div>
        <h1 className="text-2xl font-black text-gradient">Séance bouclée !</h1>
        <p className="text-muted-foreground text-sm font-semibold mt-1">{log.dayTitle}</p>
      </div>

      <div className="px-5 grid grid-cols-2 gap-3">
        <StatCard
          label="Durée"
          value={`${log.duration} min`}
          icon={<Timer className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label="RPE moyen"
          value={`${log.rpe ?? "—"}/10`}
          icon={<Activity className="h-4 w-4 text-accent" />}
        />
        <StatCard
          label="Séries"
          value={`${doneSets}/${totalSets}`}
          icon={<Flame className="h-4 w-4 text-orange-500" />}
        />
        <StatCard
          label="Exercices réussis"
          value={`${log.successCount ?? 0}/${totalExercises}`}
          accent
          icon={<Award className="h-4 w-4 text-yellow-500" />}
        />
      </div>

      {log.totalVolume && log.totalVolume > 0 && (
        <div className="px-5 mt-3">
          <div className="card-premium p-4 flex items-center gap-3 border border-white/[0.04]">
            <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Volume total
              </p>
              <p className="text-xl font-black mt-0.5 text-white">
                {log.totalVolume.toLocaleString("fr-FR")} kg
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2.5 font-bold px-1">
          Détail par exercice
        </p>
        <div className="space-y-2.5">
          {log.exercises.map((e) => {
            const done = e.sets.filter((s) => s.done);
            const values = done
              .map((s) => (e.kind === "time" ? s.time : s.reps))
              .filter((v): v is number => !!v);
            return (
              <div
                key={e.exId}
                className="card-premium p-4 border border-white/[0.04] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-white">{e.name}</p>
                  <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-bold text-slate-300">
                    {done.length} / {e.sets.length} séries
                  </span>
                </div>
                {values.length > 0 && (
                  <p className="text-xs font-mono text-primary mt-2">
                    ⚡ {values.join(" · ")} {e.kind === "time" ? "s" : "reps"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-8 mb-6">
        <Button
          onClick={onClose}
          className="w-full h-14 rounded-2xl btn-hero text-base font-extrabold shadow-[0_8px_30px_rgba(139,92,246,0.3)]"
        >
          Retour à l'accueil
        </Button>
      </div>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`card-premium p-4 border ${accent ? "border-primary/20 bg-white/[0.03]" : "border-white/[0.05]"}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={`text-2xl font-black mt-2 tracking-tight ${accent ? "text-gradient" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
