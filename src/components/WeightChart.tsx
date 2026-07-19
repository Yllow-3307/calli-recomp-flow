// ─────────────────────────────────────────────────────────────────────────────
// Graphique d'évolution du poids (SVG pur, zéro dépendance)
// Utilisé dans Mesures et dans le bloc Accueil « Mes mesures ».
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import type { BodyMetric } from "@/lib/store";

const frDayShort = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

interface WeightPoint {
  date: string;
  weight: number;
}

export function WeightChart({ metrics }: { metrics: BodyMetric[] }) {
  const points = useMemo(() => {
    const valid = metrics
      .filter((m): m is BodyMetric & { weight: number } => typeof m.weight === "number")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return valid.map((m) => ({ date: m.date, weight: m.weight }));
  }, [metrics]);

  if (points.length < 2) {
    return (
      <div className="text-center py-6 text-muted-foreground text-xs">
        {points.length === 1
          ? "Un seul poids enregistré — ajoute-en d'autres pour voir la courbe."
          : "Enregistre au moins 2 pesées pour voir ta courbe d'évolution."}
      </div>
    );
  }

  return <WeightSvg points={points} />;
}

function WeightSvg({ points }: { points: WeightPoint[] }) {
  const W = 320;
  const H = 160;
  const padL = 38;
  const padR = 14;
  const padT = 18;
  const padB = 28;

  const values = points.map((p) => p.weight);
  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    min -= 2;
    max += 2;
  } else {
    const padding = (max - min) * 0.2;
    min = Math.max(30, min - padding);
    max += padding;
  }

  // Calcul de la tendance (régression linéaire)
  const n = points.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = points.reduce((a, p) => a + p.weight, 0);
  const sumXY = points.reduce((a, p, i) => a + i * p.weight, 0);
  const sumX2 = points.reduce((a, _, i) => a + i * i, 0);
  const slope =
    n * sumXY - sumX * sumY !== 0 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  const intercept = sumY / n - (slope * sumX) / n;

  const x = (i: number) => padL + (i * (W - padL - padR)) / (n - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.weight)}`).join(" ");
  const trendStart = y(slope * 0 + intercept);
  const trendEnd = y(slope * (n - 1) + intercept);

  const last = points[points.length - 1];
  const first = points[0];
  const diff = Math.round((last.weight - first.weight) * 10) / 10;
  const isUp = diff > 0;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe du poids">
        {/* Grille horizontale */}
        {[0, 1, 2, 3].map((i) => {
          const yy = padT + (i * (H - padT - padB)) / 3;
          const val = max - (i * (max - min)) / 3;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgba(255,255,255,0.06)" />
              <text
                x={padL - 6}
                y={yy + 3}
                textAnchor="end"
                fontSize="9"
                fill="rgba(148,163,184,0.7)"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Ligne de tendance (pointillée) */}
        {n >= 2 && (
          <line
            x1={x(0)}
            y1={trendStart}
            x2={x(n - 1)}
            y2={trendEnd}
            stroke={isUp ? "rgba(239,68,68,0.4)" : "rgba(52,211,153,0.4)"}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}

        {/* Courbe principale */}
        <path
          d={path}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points */}
        {points.map((p, i) => {
          const isFirst = i === 0;
          const isLast = i === n - 1;
          return (
            <g key={p.date}>
              <circle
                cx={x(i)}
                cy={y(p.weight)}
                r={isFirst || isLast ? 4 : 2.5}
                fill={isLast ? "var(--color-primary)" : "#475569"}
                stroke="#020617"
                strokeWidth="1.5"
              />
              {(isFirst || isLast) && (
                <text
                  x={x(i)}
                  y={y(p.weight) - 8}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="var(--color-primary)"
                >
                  {p.weight} kg
                </text>
              )}
            </g>
          );
        })}

        {/* Dates début / fin */}
        <text x={x(0)} y={H - 8} textAnchor="middle" fontSize="8.5" fill="rgba(148,163,184,0.8)">
          {frDayShort(first.date)}
        </text>
        <text
          x={x(n - 1)}
          y={H - 8}
          textAnchor="middle"
          fontSize="8.5"
          fill="rgba(148,163,184,0.8)"
        >
          {frDayShort(last.date)}
        </text>
      </svg>

      {/* Résumé */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-muted-foreground">
          {n} pesée{n > 1 ? "s" : ""}
        </span>
        <span
          className={`font-bold ${isUp ? "text-amber-400" : diff < 0 ? "text-emerald-400" : "text-muted-foreground"}`}
        >
          {diff > 0 ? "↑" : diff < 0 ? "↓" : "−"} {Math.abs(diff)} kg sur la période
        </span>
      </div>
    </div>
  );
}
