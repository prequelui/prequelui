"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const COMPACT_NUMBER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export type DonutChartSegment = {
  id: string;
  label: string;
  value: number;
  /** Small caption under the plan name, e.g. "212 accounts". */
  detail?: string;
  /** Chart colour token 1–5. Defaults to the segment index + 1. */
  tone?: number;
};

export type DonutChartProps = {
  className?: string;
  title?: string;
  description?: string;
  segments?: DonutChartSegment[];
  valuePrefix?: string;
  /** Label shown in the centre when no segment is active. */
  totalLabel?: string;
  formatValue?: (value: number) => string;
  /** Formats the big centre value; defaults to compact notation (e.g. "$100k"). */
  formatCenterValue?: (value: number) => string;
  formatShare?: (share: number) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_SEGMENTS: DonutChartSegment[] = [
  { id: "scale", label: "Scale", value: 45000, detail: "212 accounts", tone: 1 },
  { id: "growth", label: "Growth", value: 30000, detail: "498 accounts", tone: 2 },
  { id: "starter", label: "Starter", value: 18000, detail: "574 accounts", tone: 3 },
  { id: "addons", label: "Add-ons", value: 7000, detail: "88 accounts", tone: 4 },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function trimZero(n: number) {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

/* geometry for one segment: angles measured clockwise from the top (12 o'clock) */
type SegmentGeom = {
  id: string;
  label: string;
  detail?: string;
  color: string;
  value: number;
  share: number;
  d: string;
  midDeg: number;
  dx: number;
  dy: number;
};

const SIZE = 200;
const CX = 100;
const CY = 100;
const R = 68;
const STROKE = 26;
const GAP_PX = 3;
const PULL = 6;

function computeSegments(
  segments: DonutChartSegment[],
  total: number
): SegmentGeom[] {
  const gapDeg = (GAP_PX / R) * (180 / Math.PI);
  let angle = -90;

  return segments.map((seg, i) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const sweep = Math.max(0, fraction * 360 - gapDeg);
    const startDeg = angle;
    const endDeg = startDeg + sweep;
    const midDeg = startDeg + sweep / 2;
    const dir = polar(0, 0, 1, midDeg);
    angle += fraction * 360;

    return {
      id: seg.id,
      label: seg.label,
      detail: seg.detail,
      color: `var(--chart-${clamp(seg.tone ?? i + 1, 1, 5)})`,
      value: seg.value,
      share: fraction * 100,
      d: arcPath(CX, CY, R, startDeg, endDeg),
      midDeg,
      dx: dir.x * PULL,
      dy: dir.y * PULL,
    };
  });
}

/* ------------------------------------------------------------------ */
/* count-up                                                            */
/* ------------------------------------------------------------------ */

function useAnimatedNumber(target: number, opts: { inView: boolean; reduce: boolean }) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const firstRef = useRef(true);

  useEffect(() => {
    if (!opts.inView) return;
    if (opts.reduce) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    const from = firstRef.current ? 0 : valueRef.current;
    firstRef.current = false;
    animRef.current?.stop();
    animRef.current = animate(from, target, {
      duration: 0.8,
      ease: EASE,
      onUpdate: (v) => {
        valueRef.current = v;
        setValue(v);
      },
      onComplete: () => {
        valueRef.current = target;
        setValue(target);
      },
    });
    return () => animRef.current?.stop();
  }, [target, opts.inView, opts.reduce]);

  return value;
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export function DonutChart({
  className,
  title = "Revenue by plan",
  description = "Share of MRR by plan.",
  segments = DEFAULT_SEGMENTS,
  valuePrefix = "$",
  totalLabel = "Total MRR",
  formatValue,
  formatCenterValue,
  formatShare,
}: DonutChartProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const [active, setActive] = useState<string | null>(null);

  const format =
    formatValue ??
    ((n: number) => valuePrefix + Math.round(n).toLocaleString("en-US"));
  const formatPct =
    formatShare ?? ((share: number) => `${trimZero(share)}%`);
  const formatCenter =
    formatCenterValue ?? ((n: number) => valuePrefix + COMPACT_NUMBER.format(n));

  const total = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments]
  );

  const geoms = useMemo(
    () => computeSegments(segments, total),
    [segments, total]
  );

  const activeGeom = active
    ? geoms.find((g) => g.id === active) ?? null
    : null;

  const displayValue = useAnimatedNumber(
    activeGeom ? activeGeom.value : total,
    { inView, reduce }
  );

  const centerLabel = activeGeom ? activeGeom.label : totalLabel;
  const centerSub = activeGeom
    ? `${formatPct(activeGeom.share)} of total`
    : `${segments.length} plans`;

  /* where the glint dot rests: the ring's very first angle (top) */
  const glint = polar(CX, CY, R, -90);

  const ariaLabel = `${title}. Donut chart of ${segments
    .map((s) => `${s.label} ${formatPct(total > 0 ? (s.value / total) * 100 : 0)}`)
    .join(", ")}. Total ${format(total)}.`;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={cn(
          "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <div className="p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <div className="relative h-48 w-48 shrink-0 sm:h-52 sm:w-52">
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="img"
                aria-label={ariaLabel}
                tabIndex={0}
                onKeyDown={(e) => {
                  const n = geoms.length;
                  if (!n) return;
                  const idx = active
                    ? geoms.findIndex((g) => g.id === active)
                    : -1;
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive(geoms[(idx + 1) % n].id);
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive(geoms[(idx - 1 + n) % n].id);
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    setActive(geoms[0].id);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    setActive(geoms[n - 1].id);
                  } else if (e.key === "Escape") {
                    setActive(null);
                  }
                }}
                onFocus={() => {
                  if (active == null && geoms.length) setActive(geoms[0].id);
                }}
                onBlur={() => setActive(null)}
                className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* the track behind the segments */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth={STROKE}
                />

                {geoms.map((seg, i) => {
                  const isActive = active === seg.id;
                  const dimmed = active != null && !isActive;
                  const delay = 0.15 + i * 0.1;
                  return (
                    <motion.g
                      key={seg.id}
                      initial={false}
                      animate={{
                        translateX: isActive ? seg.dx : 0,
                        translateY: isActive ? seg.dy : 0,
                        opacity: dimmed ? 0.35 : 1,
                      }}
                      transition={{
                        translateX: { type: "spring", stiffness: 340, damping: 26 },
                        translateY: { type: "spring", stiffness: 340, damping: 26 },
                        opacity: { duration: 0.25 },
                      }}
                    >
                      <motion.path
                        d={seg.d}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={STROKE}
                        initial={{ pathLength: reduce ? 1 : 0 }}
                        animate={{ pathLength: show ? 1 : 0 }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { duration: 0.7, delay, ease: EASE }
                        }
                      />
                      {/* generous, invisible hit area */}
                      <path
                        d={seg.d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={STROKE + 12}
                        style={{ pointerEvents: "stroke" }}
                        onPointerEnter={() => setActive(seg.id)}
                        onPointerLeave={() =>
                          setActive((a) => (a === seg.id ? null : a))
                        }
                        onClick={() => setActive(seg.id)}
                      />
                    </motion.g>
                  );
                })}

                {/* the lens: one small glint dot on the ring at the start angle */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.6 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          delay: 0.15 + (geoms.length - 1) * 0.1 + 0.5,
                          duration: 0.45,
                          ease: EASE,
                        }
                  }
                  style={{ transformOrigin: `${glint.x}px ${glint.y}px` }}
                >
                  <circle
                    cx={glint.x}
                    cy={glint.y}
                    r={4.5}
                    fill="none"
                    stroke="var(--foreground)"
                    strokeOpacity={0.22}
                    strokeWidth={1}
                  />
                  <circle cx={glint.x} cy={glint.y} r={2} fill="var(--foreground)" />
                </motion.g>
              </svg>

              {/* centre readout */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                <div className="whitespace-nowrap text-[24px] font-semibold leading-none tracking-tight tabular-nums">
                  {formatCenter(displayValue)}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active ?? "total"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="mt-1.5 flex flex-col items-center"
                  >
                    <span className="text-[11.5px] font-medium text-muted-foreground">
                      {centerLabel}
                    </span>
                    <span className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {centerSub}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* legend */}
            <ul className="w-full flex-1 space-y-0.5" role="list">
              {geoms.map((seg) => {
                const isActive = active === seg.id;
                return (
                  <li key={seg.id}>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      onPointerEnter={() => setActive(seg.id)}
                      onPointerLeave={() =>
                        setActive((a) => (a === seg.id ? null : a))
                      }
                      onFocus={() => setActive(seg.id)}
                      onBlur={() => setActive((a) => (a === seg.id ? null : a))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive ? "bg-muted/70" : "hover:bg-muted/40"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: seg.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {seg.label}
                        </span>
                        {seg.detail ? (
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            {seg.detail}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[13px] font-semibold tabular-nums">
                          {format(seg.value)}
                        </span>
                        <span className="block text-[11.5px] tabular-nums text-muted-foreground">
                          {formatPct(seg.share)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default DonutChart;
