import { createFileRoute } from "@tanstack/react-router";
import { PageShell, TopBar } from "@/components/BottomNav";
import { PROGRAM } from "@/lib/program";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/programme")({
  head: () => ({ meta: [{ title: "Programme semaine — Calli Recomp" }] }),
  component: ProgrammePage,
});

function ProgrammePage() {
  const state = useAppState();
  const skipRunning = state.profile.daysPerWeek === 5;

  return (
    <PageShell>
      <TopBar
        title="Programme"
        subtitle={`${state.profile.daysPerWeek} jours/semaine • 12 semaines`}
      />

      <div className="px-5 space-y-3">
        {PROGRAM.map((d) => {
          const skipped = skipRunning && d.key === "fri";
          return (
            <div key={d.key} className={`card-premium p-4 ${skipped ? "opacity-40" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{d.emoji}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{d.day}</p>
                  <h3 className="font-bold text-base mt-0.5">
                    {d.title}
                    {skipped && <span className="ml-2 text-xs text-warning">(retiré en 5j)</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{d.summary}</p>
                  <p className="text-xs text-muted-foreground mt-2">⏱️ {d.duration} min</p>

                  <div className="mt-3 space-y-2">
                    {d.blocks.map((b) => (
                      <div key={b.title}>
                        <p className="text-[11px] uppercase tracking-widest text-primary/80 font-bold">
                          {b.title}
                        </p>
                        <ul className="mt-1 text-sm space-y-0.5">
                          {b.items.map((it) => (
                            <li key={it.id} className="text-muted-foreground">
                              • {it.name} —{" "}
                              <span className="text-foreground">
                                {it.sets}×{it.target}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {d.alternatives && (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      Alt : {d.alternatives.join(" • ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 mt-6">
        <div className="card-premium p-4">
          <h3 className="font-bold">Plan 12 semaines</h3>
          <p className="text-sm text-muted-foreground mt-2">
            +1–2 reps ou +temps chaque semaine si la séance est réussie. Test des skills toutes les
            4 semaines (S4, S8, S12) pour valider la progression.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
              <div
                key={w}
                className={`aspect-square grid place-items-center rounded-lg text-xs font-bold ${
                  w % 4 === 0 ? "btn-hero" : "bg-muted text-muted-foreground"
                }`}
              >
                S{w}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Les semaines dorées sont des semaines de test.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
