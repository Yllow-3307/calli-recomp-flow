import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { PROGRESS_TESTS, PROGRAM, type ProgressTestType } from "@/lib/program";
import {
  useAppState,
  useAppActions,
  suggestProgressionForExercise,
  currentProgramWeek,
  isTestWeek,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  TrendingUp,
  Target,
  ArrowUp,
  Minus,
  Award,
  ShieldAlert,
  Sparkles,
  Plus,
  History,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/progression")({
  head: () => ({ meta: [{ title: "Progression — Calli Recomp" }] }),
  component: ProgressionPage,
});

function ProgressionPage() {
  const state = useAppState();
  const actions = useAppActions();
  const [testId, setTestId] = useState(PROGRESS_TESTS[0].id);
  const [value, setValue] = useState("");
  const [techniqueChecked, setTechniqueChecked] = useState(false);

  const week = currentProgramWeek(state.profile);
  const testWeek = isTestWeek(state.profile);

  // Filter out any seed test data by making sure we are only counting user real tests.
  // Actually state.tests is now already filtered because we removed seeds fromDEFAULT_STATE.
  const hasUserTests = state.tests.length > 0;

  // Progression suggestions across the program
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: {
      exId: string;
      name: string;
      hint: string;
      delta: string;
      reason: "up" | "hold";
    }[] = [];
    for (const d of PROGRAM) {
      for (const b of d.blocks) {
        for (const ex of b.items) {
          if (seen.has(ex.id)) continue;
          seen.add(ex.id);
          const s = suggestProgressionForExercise(ex.id, ex.targetMax, ex.kind, state.workouts);
          if (s) out.push(s);
        }
      }
    }
    return out.sort((a) => (a.reason === "up" ? -1 : 1)).slice(0, 8);
  }, [state.workouts]);

  const submit = () => {
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0) {
      toast.error("Veuillez saisir une valeur numérique valide supérieure à 0.");
      return;
    }

    if (!techniqueChecked) {
      toast.error("Veuillez valider que la technique est propre et parfaite !");
      return;
    }

    actions.addTest({ id: `t-${Date.now()}`, date: new Date().toISOString(), testId, value: v });
    setValue("");
    setTechniqueChecked(false);
    toast.success("Test enregistré 🎯");
  };

  const scrollToForm = () => {
    const formEl = document.getElementById("test-form-container");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <PageShell>
      <TopBar title="Progression" subtitle={`Semaine ${week}/12 · programme 3 mois`} />

      {testWeek && (
        <div className="px-5">
          <div
            className="card-premium p-4 ring-1 ring-primary/40"
            style={{ backgroundImage: "var(--gradient-card)" }}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-full btn-hero shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold">Semaine de test S{week}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enregistre tes max : pompes, tractions, handstand, dragon flag, L-sit, 5km.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no test records exist */}
      {!hasUserTests && (
        <div className="px-5 mt-4">
          <div className="card-premium p-6 text-center space-y-4 border border-dashed border-primary/20">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <History className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">
                Aucun test enregistré pour le moment
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Commence à mesurer ta progression physique et tes records sur tes skills favoris.
              </p>
            </div>
            <Button
              onClick={scrollToForm}
              className="btn-hero px-5 py-2 text-xs flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" /> Ajouter mon premier test
            </Button>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Progression suggérée
          </p>
          <div className="card-premium p-3 space-y-2">
            {suggestions.map((s) => (
              <div key={s.exId} className="flex items-center gap-3 py-1.5">
                <div
                  className={`h-8 w-8 grid place-items-center rounded-full ${s.reason === "up" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                >
                  {s.reason === "up" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.hint}</p>
                </div>
                <span
                  className={`text-xs font-bold ${s.reason === "up" ? "text-success" : "text-muted-foreground"}`}
                >
                  {s.delta}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 px-1">
            Règle : toutes séries en haut de fourchette + RPE ≤ 8 → +1–2 reps ou +5s. Sinon →
            maintenir.
          </p>
        </section>
      )}

      <div className="px-5 mt-5 space-y-4">
        {PROGRESS_TESTS.map((t) => {
          const logs = state.tests
            .filter((x) => x.testId === t.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const latest = logs[0]?.value;
          const previous = logs[1]?.value;
          const delta = latest !== undefined && previous !== undefined ? latest - previous : null;

          // Best record computation (minimum for run5k, maximum for others)
          const isMinRecord = t.id === "run5k";
          const bestRecord =
            logs.length > 0
              ? isMinRecord
                ? Math.min(...logs.map((l) => l.value))
                : Math.max(...logs.map((l) => l.value))
              : null;

          return (
            <div
              key={t.id}
              className={`card-premium p-4 relative overflow-hidden ${t.isSkill ? "border-l-2 border-primary" : ""}`}
            >
              {t.isSkill && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  <Award className="h-3 w-3" /> Skill
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold flex items-center gap-1.5 text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Unité : {t.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-gradient">
                    {latest ?? "—"}
                    {latest !== undefined && (
                      <span className="text-xs text-muted-foreground font-medium"> {t.unit}</span>
                    )}
                  </p>
                  {delta !== null && (
                    <p
                      className={`text-xs font-bold ${
                        isMinRecord
                          ? delta < 0
                            ? "text-success"
                            : delta > 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          : delta > 0
                            ? "text-success"
                            : delta < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }`}
                    >
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      {delta > 0 ? "+" : ""}
                      {delta} vs précédent
                    </p>
                  )}
                </div>
              </div>

              {/* Best record presentation */}
              {bestRecord !== null && (
                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-yellow-500" /> Record personnel
                  </span>
                  <span className="font-extrabold text-foreground">
                    {bestRecord} {t.unit}
                  </span>
                </div>
              )}

              {/* Chart of recent results */}
              {logs.length > 0 && (
                <div className="mt-3 flex items-end gap-1 h-12">
                  {logs
                    .slice(0, 6)
                    .reverse()
                    .map((l) => {
                      const max = Math.max(...logs.map((x) => x.value));
                      const h = max > 0 ? (l.value / max) * 100 : 10;
                      return (
                        <div key={l.id} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors"
                            style={{ height: `${Math.max(10, h)}%` }}
                            title={`${l.value} ${t.unit}`}
                          />
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Detailed chronological list */}
              {logs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Historique des tests
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {logs.map((log, index) => {
                      const prevLog = logs[index + 1];
                      const diff = prevLog !== undefined ? log.value - prevLog.value : null;
                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between text-[11px] py-1 border-b border-border/20 last:border-none"
                        >
                          <span className="text-muted-foreground">
                            {new Date(log.date).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {log.value} {t.unit}
                            </span>
                            {diff !== null && diff !== 0 && (
                              <span
                                className={`font-medium ${
                                  isMinRecord
                                    ? diff < 0
                                      ? "text-success"
                                      : "text-destructive"
                                    : diff > 0
                                      ? "text-success"
                                      : "text-destructive"
                                }`}
                              >
                                ({diff > 0 ? "+" : ""}
                                {diff})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div id="test-form-container" className="px-5 mt-6 mb-8">
        <div className="card-premium p-4">
          <h3 className="font-bold mb-1">Enregistrer un test</h3>
          <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-warning shrink-0" /> Technique parfaite avant
            progression !
          </p>
          <select
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-input border border-border text-sm mb-3"
          >
            {PROGRESS_TESTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.unit}) {t.isSkill ? "★" : ""}
              </option>
            ))}
          </select>

          <div className="flex gap-2 mb-4">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Valeur"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 h-11 bg-input"
            />
          </div>

          <div className="flex items-start gap-2.5 mb-4 p-2 bg-muted/30 rounded-lg">
            <Checkbox
              id="technique"
              checked={techniqueChecked}
              onCheckedChange={(checked) => setTechniqueChecked(!!checked)}
              className="mt-0.5"
            />
            <label
              htmlFor="technique"
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              Je valide que l'exécution de ce test a été réalisée avec une{" "}
              <strong>technique parfaite</strong> et sans tricherie.
            </label>
          </div>

          <Button onClick={submit} className="w-full h-11 btn-hero font-bold">
            Ajouter le test
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
