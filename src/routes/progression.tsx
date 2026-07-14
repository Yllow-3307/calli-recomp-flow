import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { PROGRESS_TESTS, PROGRAM } from "@/lib/program";
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
import { TrendingUp, Target, ArrowUp, Minus } from "lucide-react";

export const Route = createFileRoute("/progression")({
  head: () => ({ meta: [{ title: "Progression — Calli Recomp" }] }),
  component: ProgressionPage,
});

function ProgressionPage() {
  const state = useAppState();
  const actions = useAppActions();
  const [testId, setTestId] = useState(PROGRESS_TESTS[0].id);
  const [value, setValue] = useState("");

  const week = currentProgramWeek(state.profile);
  const testWeek = isTestWeek(state.profile);

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
    if (!v || v <= 0) return;
    actions.addTest({ id: `t-${Date.now()}`, date: new Date().toISOString(), testId, value: v });
    setValue("");
    toast.success("Test enregistré 🎯");
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

      {suggestions.length > 0 && (
        <section className="px-5 mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Progression suggérée
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

      <div className="px-5 mt-5 space-y-3">
        {PROGRESS_TESTS.map((t) => {
          const logs = state.tests
            .filter((x) => x.testId === t.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latest = logs[0]?.value;
          const previous = logs[1]?.value;
          const delta = latest !== undefined && previous !== undefined ? latest - previous : null;
          return (
            <div key={t.id} className="card-premium p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Unité : {t.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-gradient">
                    {latest ?? "—"}
                    {latest !== undefined && (
                      <span className="text-sm text-muted-foreground font-medium"> {t.unit}</span>
                    )}
                  </p>
                  {delta !== null && (
                    <p
                      className={`text-xs font-bold ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      {delta > 0 ? "+" : ""}
                      {delta} vs précédent
                    </p>
                  )}
                </div>
              </div>
              {logs.length > 0 && (
                <div className="mt-3 flex items-end gap-1 h-12">
                  {logs
                    .slice(0, 6)
                    .reverse()
                    .map((l) => {
                      const max = Math.max(...logs.map((x) => x.value));
                      const h = (l.value / max) * 100;
                      return (
                        <div key={l.id} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-primary/80"
                            style={{ height: `${Math.max(10, h)}%` }}
                            title={`${l.value} ${t.unit}`}
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 mt-6">
        <div className="card-premium p-4">
          <h3 className="font-bold mb-3">Enregistrer un test</h3>
          <select
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
          >
            {PROGRESS_TESTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.unit})
              </option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Valeur"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 h-11 bg-input"
            />
            <Button onClick={submit} className="h-11 btn-hero px-6">
              Ajouter
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
