import { createFileRoute } from "@tanstack/react-router";
import { PageShell, TopBar } from "@/components/BottomNav";
import { planDays, nutritionTargets, TIER_INFO, goalDefOf } from "@/lib/plan";
import { useAppState, programCycle } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { SessionTypeBadge } from "@/routes/index";

export const Route = createFileRoute("/programme")({
  head: () => ({ meta: [{ title: "Programme semaine — Calli Recomp" }] }),
  component: ProgrammePage,
});

function ProgrammePage() {
  const state = useAppState();
  const skipRunning = state.profile.daysPerWeek === 5;
  const { cycle, cycleWeek } = programCycle(state.profile);
  const days = planDays(state.profile);
  const isCustomPlan = !!state.profile.plan;
  const nut = nutritionTargets(state.profile);
  const tierLabel = state.profile.plan ? TIER_INFO[state.profile.plan.tier].label : "Standard";

  return (
    <PageShell>
      <TopBar
        title="Programme"
        subtitle={`${isCustomPlan ? "Plan personnalisé 🔥" : "Programme standard"} • ${state.profile.daysPerWeek} j/sem • Cycle ${cycle}, semaine ${cycleWeek}/12`}
      />

      <div className="px-5 mb-3 flex justify-end print:hidden">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/5 border border-white/10 text-xs"
          onClick={() => window.print()}
        >
          🖨️ Exporter ma semaine (PDF)
        </Button>
      </div>

      <div className="px-5 space-y-3 lg:space-y-0 masonry-lg">
        {days.map((d) => {
          const skipped = skipRunning && d.key === "fri";
          return (
            <div
              key={d.key}
              className={`card-premium p-5 border border-white/[0.04] transition-all relative overflow-hidden ${
                skipped ? "opacity-30 saturate-[0.15]" : "hover:border-primary/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  {d.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                      {d.day}
                    </span>
                    <SessionTypeBadge type={d.type} />
                  </div>

                  <h3 className="font-bold text-base text-white mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span>{d.title}</span>
                    {skipped && (
                      <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-bold">
                        retiré en 5j
                      </span>
                    )}
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {d.summary}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300">
                      ⏱️ {d.duration} min
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 pt-3 border-t border-white/[0.04]">
                    {d.blocks.map((b) => (
                      <div key={b.title} className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-primary font-black">
                          {b.title}
                        </p>
                        <ul className="text-xs space-y-1">
                          {b.items.map((it) => (
                            <li
                              key={it.id}
                              className="text-slate-300 flex justify-between items-center gap-2"
                            >
                              <span className="truncate">• {it.name}</span>
                              <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded text-slate-400 shrink-0 font-mono">
                                {it.sets}×{it.target}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {d.alternatives && d.alternatives.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <p className="text-[10px] uppercase tracking-wider text-accent font-black">
                        Alternatives
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 italic">
                        {d.alternatives.join(" • ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 mt-6 mb-8">
        <div className="card-premium p-5 border border-white/[0.05]">
          <h3 className="font-bold text-base text-white">Plan 12 semaines</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Progression par paliers : +1–2 répétitions ou +temps chaque semaine en validant avec une
            technique impeccable. Une semaine dorée (test de progression) a lieu toutes les 4
            semaines pour redéfinir tes max.
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
              const isGold = w % 4 === 0;
              return (
                <div
                  key={w}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-black transition-all ${
                    isGold
                      ? "btn-hero shadow-[0_4px_15px_rgba(139,92,246,0.3)] border border-primary/20 scale-[1.03]"
                      : "bg-white/[0.02] border border-white/5 text-muted-foreground hover:text-white hover:border-white/10"
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-60">Sem</span>
                  <span className="text-sm mt-0.5">{w}</span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-primary font-bold mt-3.5 flex items-center gap-1.5 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Les semaines colorées en dégradé sont des phases de tests physiques (S4, S8, S12).
          </p>
        </div>
      </div>

      {/* Feuille imprimable (PDF) — visible uniquement à l'impression */}
      <div className="hidden print:block print:text-black print:bg-white print:-ml-20 xl:print:-ml-64 print:px-10 print:py-6">
        <h1 className="text-2xl font-black">Calli Recomp — Ma semaine</h1>
        <p className="text-sm mt-1">
          Exporté le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} ·
          Cycle {cycle} · Semaine {cycleWeek}/12 · Objectif : {goalDefOf(state.profile.goal).label}{" "}
          · Palier : {tierLabel}
        </p>
        <table className="w-full text-sm mt-4 border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1.5 pr-2">Jour</th>
              <th className="py-1.5 pr-2">Séance</th>
              <th className="py-1.5 pr-2">Durée</th>
              <th className="py-1.5">Contenu</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.key} className="border-b border-slate-300 align-top">
                <td className="py-1.5 pr-2 font-bold whitespace-nowrap">{d.day}</td>
                <td className="py-1.5 pr-2">
                  {d.emoji} {d.title}
                </td>
                <td className="py-1.5 pr-2 whitespace-nowrap">~{d.duration} min</td>
                <td className="py-1.5 text-xs">
                  {d.blocks
                    .filter((b) => b.title !== "Consignes")
                    .flatMap((b) => b.items)
                    .slice(0, 6)
                    .map((it) => `${it.sets}×${it.target} ${it.name}`)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm mt-4">
          Cibles : ~{nut.kcalTarget} kcal · Protéines {nut.proteinMin}–{nut.proteinMax} g · Glucides
          ~{nut.carbsTarget} g · Lipides ~{nut.fatTarget} g · Eau {nut.waterL} L
        </p>
      </div>
    </PageShell>
  );
}
