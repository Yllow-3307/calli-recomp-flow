interface WaterBottleProps {
  liters: number;
  target: number;
  className?: string;
}

/**
 * Bouteille d'eau qui se remplit au fil des +25cl/+50cl.
 * SVG pur (aucune dépendance), vague animée tant que l'objectif n'est pas atteint.
 */
export function WaterBottle({ liters, target, className }: WaterBottleProps) {
  const pct = Math.max(0, Math.min(1, target > 0 ? liters / target : 0));
  const full = pct >= 1;

  // Géométrie SVG (viewBox 120×170) : la cuve va de y=34 à y=158
  const bodyTop = 34;
  const bodyBottom = 158;
  const bodyHeight = bodyBottom - bodyTop;
  const waterTop = bodyBottom - bodyHeight * pct;

  const bodyPath =
    "M22 44 Q22 30 38 30 L82 30 Q98 30 98 44 L98 138 Q98 158 78 158 L42 158 Q22 158 22 138 Z";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className ?? ""}`}
      role="img"
      aria-label={`Hydratation : ${liters.toFixed(1)} litre(s) sur ${target} litres`}
    >
      <svg
        width="70"
        height="100"
        viewBox="0 0 120 170"
        className={`overflow-visible transition-[filter] duration-500 ${
          full ? "drop-shadow-[0_0_14px_rgba(76,201,240,0.55)]" : ""
        }`}
      >
        <defs>
          <linearGradient id="wb-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#4cc9f0" />
          </linearGradient>
          <clipPath id="wb-clip">
            <path d={bodyPath} />
          </clipPath>
        </defs>

        {/* Eau, clippée dans le corps de la bouteille */}
        {pct > 0 && (
          <g clipPath="url(#wb-clip)">
            <rect
              x="18"
              y={waterTop}
              width="84"
              height={bodyBottom - waterTop + 4}
              fill="url(#wb-water)"
            />
            {/* Vagues animées (arrêtées une fois la bouteille pleine) */}
            {!full && (
              <>
                <g className="wb-wave">
                  <path
                    d={`M0 ${waterTop} q 15 -6 30 0 t 30 0 t 30 0 t 30 0 V${Math.min(
                      bodyBottom,
                      waterTop + 10,
                    )} H0 Z`}
                    fill="rgba(255,255,255,0.35)"
                  />
                </g>
                <g className="wb-wave wb-wave-slow">
                  <path
                    d={`M-40 ${waterTop} q 15 -9 30 0 t 30 0 t 30 0 t 30 0 t 30 0 V${Math.min(
                      bodyBottom,
                      waterTop + 12,
                    )} H-40 Z`}
                    fill="rgba(103,232,249,0.45)"
                  />
                </g>
              </>
            )}
          </g>
        )}

        {/* Contour de la bouteille */}
        <path
          d={bodyPath}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth="2.5"
        />
        {/* Goulot et bouchon (le bouchon devient cyan quand l'objectif est atteint) */}
        <rect
          x="45"
          y="18"
          width="30"
          height="14"
          rx="4"
          fill="rgba(255,255,255,0.10)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
        />
        <rect
          x="42"
          y="8"
          width="36"
          height="11"
          rx="4"
          className="transition-colors duration-500"
          fill={full ? "#4cc9f0" : "rgba(255,255,255,0.14)"}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
        />
        {/* Reflet */}
        <path
          d="M32 52 Q34 42 44 37"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* Pourcentage centré */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-5">
        <span className="text-base font-black tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}
