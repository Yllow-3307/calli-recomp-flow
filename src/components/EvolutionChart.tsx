// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Graphique d'Ã©volution d'un test (ligne SVG faite maison â†’ zÃ©ro dÃ©pendance).
// UtilisÃ© par Â« Voir l'Ã©volution Â» dans ProgrÃ¨s et dans Skills.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useMemo } from "react";
import { useAppState } from "@/lib/store";
import { PROGRESS_TESTS } from "@/lib/program";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Trophy } from "lucide-react";

const frDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

export function EvolutionChartDialog({
  testId,
  onClose,
}: {
  /** id du test (PROGRESS_TESTS), ou null = fermÃ© */
  testId: string | null;
  onClose: () => void;
}) {
  const state = useAppState();
  const def = PROGRESS_TESTS.find((t) => t.id === testId);

  const points = useMemo(
    () =>
      state.tests
        .filter((t) => t.testId === testId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [state.tests, testId],
  );

  // Pour les tests chronomÃ©trÃ©s (5 km), le meilleur = le plus PETIT.
  const lowerBetter = def?.unit === "min";
  const best = points.length
    ? points.reduce(
        (acc, p) => (lowerBetter ? Math.min(acc, p.value) : Math.max(acc, p.value)),
        points[0].value,
      )
    : null;

  return (
    <Dialog open={testId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-950 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black">
            <TrendingUp className="h-4 w-4 text-primary" />
            Ã‰volution â€” {def?.name ?? "Test"}
            {def && (
              <span className="text-xs font-semibold text-muted-foreground">({def.unit})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucun test enregistrÃ© pour l'instant. Fais ta premiÃ¨re mesure (semaines S4, S8, S12) ðŸ’ª
          </p>
        ) : (
          <>
            <LineChart points={points} lowerBetter={lowerBetter} best={best as number} />
            <div className="flex items-center justify-between text-xs text-muted-foreground -mt-1">
              <span>
                {points.length} mesure{points.length > 1 ? "s" : ""} Â· {frDay(points[0].date)} â†’{" "}
                {frDay(points[points.length - 1].date)}
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Trophy className="h-3.5 w-3.5" /> Record : {best}
                {def?.unit && ` ${def.unit}`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 mt-1.5">
              {lowerBetter
                ? "â±ï¸ Pour un temps, plus la courbe descend, mieux c'est."
                : "ðŸ“ˆ Plus la courbe monte, plus tu progresses."}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LineChart({
  points,
  lowerBetter,
  best,
}: {
  points: { id: string; date: string; value: number }[];
  lowerBetter: boolean;
  best: number;
}) {
  const W = 320;
  const H = 170;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 30;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.15;
    min = Math.max(0, min - pad);
    max += pad;
  }

  const x = (i: number) =>
    points.length === 1
      ? padL + (W - padL - padR) / 2
      : padL + (i * (W - padL - padR)) / (points.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe d'Ã©volution">
      {/* grille horizontale */}
      {[0, 1, 2].map((i) => {
        const yy = padT + (i * (H - padT - padB)) / 2;
        const val = max - (i * (max - min)) / 2;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgba(255,255,255,0.07)" />
            <text
              x={padL - 6}
              y={yy + 3}
              textAnchor="end"
              fontSize="9"
              fill="rgba(148,163,184,0.8)"
            >
              {Number.isInteger(val) ? val : val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* ligne d'Ã©volution */}
      <path
        d={path}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* points */}
      {points.map((p, i) => {
        const isBest = p.value === best;
        return (
          <g key={p.id}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={isBest ? 5 : 3.5}
              fill={isBest ? "#f59e0b" : "var(--color-primary)"}
              stroke="#020617"
              strokeWidth="1.5"
            />
            {(isBest || i === 0 || i === points.length - 1) && (
              <text
                x={x(i)}
                y={y(p.value) - 8}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill={isBest ? "#f59e0b" : "#e2e8f0"}
              >
                {p.value}
              </text>
            )}
          </g>
        );
      })}

      {/* dates dÃ©but / fin */}
      <text x={x(0)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">
        {frDay(points[0].date)}
      </text>
      {points.length > 1 && (
        <text
          x={x(points.length - 1)}
          y={H - 8}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(148,163,184,0.9)"
        >
          {frDay(last.date)}
        </text>
      )}
      <title>{lowerBetter ? "Le plus bas est le meilleur" : "Le plus haut est le meilleur"}</title>
    </svg>
  );
}