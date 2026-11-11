"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* one shared clock so the arc, the needle, and the number land together */
const FILL_DURATION = 1.1;
const BASE_DELAY = 0.15;

/* ------------------------------------------------------------------ */
/* geometry — a 240° arc, gap at the bottom, kept fully inside the box */
/* ------------------------------------------------------------------ */

const W = 240;
const H = 190;
const CX = 120;
const CY = 122;
const R = 76;
const STROKE = 11;
const START = 150; // degrees, bottom-left, measured clockwise (screen coords)
const SWEEP = 240; // 150° → 390° (30°), leaving a 120° gap at the bottom

const MINOR_STEP = 10;
const MAJOR_STEP = 60;
const TICK_IN = R + STROKE / 2 + 2;
const TICK_MINOR = TICK_IN + 5;
const TICK_MAJOR = TICK_IN + 9;
const LABEL_R = TICK_MAJOR + 13;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type RadialGaugeProps = {
  className?: string;
  /** Score, clamped to [0, max]. */
  value?: number;
  /** Denominator of the score. Defaults to 100. */
  max?: number;
  /** Caption shown under the number, e.g. "Health score". */
  label?: string;
  /** Signed change, e.g. 4.2 for "+4.2". 0 renders a neutral badge. */
  delta?: number;
  /** Unit after the delta, e.g. " pts" or "%". Defaults to " pts". */
  deltaSuffix?: string;
  /** Decimals on the delta value. Defaults to 1. */
  deltaDecimals?: number;
  /** Context after the delta badge, e.g. "vs last month". */
  deltaLabel?: string;
  /** When true a negative delta is good (e.g. churn going down). */
  goodWhenDown?: boolean;
  /** Chart colour token 1–5. Defaults to 1. */
  tone?: number;
  formatValue?: (value: number) => string;
  formatDelta?: (delta: number) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_VALUE = 82;
const DEFAULT_MAX = 100;
const DEFAULT_LABEL = "Health score";
const DEFAULT_DELTA = 4.2;
const DEFAULT_DELTA_LABEL = "vs last month";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
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

/* ticks around the dial: a short tick every 10°, a long one every 60° */
const MINOR_TICKS = Array.from({ length: SWEEP / MINOR_STEP + 1 }, (_, i) => START + i * MINOR_STEP)
  .filter((a) => (a - START) % MAJOR_STEP !== 0);
const MAJOR_TICKS = Array.from({ length: SWEEP / MAJOR_STEP + 1 }, (_, i) => START + i * MAJOR_STEP);
const LABELS = [
  { text: "0", angle: START },
  { text: "50", angle: START + SWEEP / 2 },
  { text: "100", angle: START + SWEEP },
];

/* ------------------------------------------------------------------ */
/* a single progress value (0 → fraction) driving needle + number      */
/* ------------------------------------------------------------------ */

function useProgress(
  target: number,
  opts: { start: boolean; reduce: boolean; delay: number }
) {
  const [value, setValue] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    if (!opts.start) return;
    if (opts.reduce) {
      setValue(target);
      return;
    }
    if (started.current) return;
    started.current = true;

    const controls = animate(0, target, {
      duration: FILL_DURATION,
      ease: EASE,
      delay: opts.delay,
      onUpdate: (v) => setValue(v),
      onComplete: () => setValue(target),
    });

    return () => controls.stop();
  }, [opts.start, target, opts.reduce, opts.delay]);

  return value;
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function RadialGauge({
  className,
  value = DEFAULT_VALUE,
  max = DEFAULT_MAX,
  label = DEFAULT_LABEL,
  delta = DEFAULT_DELTA,
  deltaSuffix = " pts",
  deltaDecimals = 1,
  deltaLabel = DEFAULT_DELTA_LABEL,
  goodWhenDown = false,
  tone = 1,
  formatValue,
  formatDelta,
}: RadialGaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;
  const [hovered, setHovered] = useState(false);

  const maxN = Math.max(1, max);
  const raw = clamp(value, 0, maxN);
  const fraction = raw / maxN;

  const color = `var(--chart-${clamp(tone, 1, 5)})`;

  const trackArc = useMemo(() => arcPath(CX, CY, R, START, START + SWEEP), []);
  const valueArc = useMemo(
    () => arcPath(CX, CY, R, START, START + fraction * SWEEP),
    [fraction]
  );

  const progress = useProgress(fraction, { start: show, reduce, delay: BASE_DELAY });
  const needleAngle = START + progress * SWEEP;
  const tip = polar(CX, CY, R, needleAngle);

  const format = formatValue ?? ((v: number) => Math.round(v).toLocaleString("en-US"));
  const formatDeltaValue =
    formatDelta ??
    ((d: number) => {
      const sign = d > 0 ? "+" : d < 0 ? "−" : "";
      return `${sign}${Math.abs(d).toFixed(deltaDecimals)}${deltaSuffix}`;
    });

  const positive = delta > 0;
  const neutral = delta === 0;
  const good = goodWhenDown ? delta < 0 : delta > 0;

  const ariaLabel = `${label} gauge. ${format(raw)} out of ${maxN}. ${
    neutral ? "No change" : `${formatDeltaValue(delta)}${deltaLabel ? ` ${deltaLabel}` : ""}`
  }.`;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: EASE }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={cn(
          "rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-colors hover:border-muted-foreground/30",
          className
        )}
      >
        <div className="flex flex-col items-center px-6 py-7 sm:py-8">
          <div className="w-full max-w-[300px]">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={ariaLabel}
              className="block h-auto w-full"
            >
              {/* the quiet track behind the fill */}
              <path
                d={trackArc}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={STROKE}
                strokeLinecap="round"
              />

              {/* the value arc draws itself with a pathLength animation */}
              {fraction > 0 ? (
                <motion.path
                  d={valueArc}
                  fill="none"
                  stroke={color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: show ? 1 : 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: FILL_DURATION, delay: BASE_DELAY, ease: EASE }
                  }
                />
              ) : null}

              {/* ticks fade in once the arc is under way */}
              <motion.g
                initial={{ opacity: reduce ? 1 : 0 }}
                animate={{ opacity: show ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.45, delay: BASE_DELAY + 0.15, ease: EASE }
                }
              >
                {MINOR_TICKS.map((angle) => {
                  const a = polar(CX, CY, TICK_IN, angle);
                  const b = polar(CX, CY, TICK_MINOR, angle);
                  return (
                    <line
                      key={`minor-${angle}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="var(--border)"
                      strokeWidth={1}
                      strokeLinecap="round"
                    />
                  );
                })}
                {MAJOR_TICKS.map((angle) => {
                  const a = polar(CX, CY, TICK_IN, angle);
                  const b = polar(CX, CY, TICK_MAJOR, angle);
                  return (
                    <line
                      key={`major-${angle}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="var(--muted-foreground)"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  );
                })}
              </motion.g>

              {/* numeric anchors at the ends and top */}
              <motion.g
                initial={{ opacity: reduce ? 1 : 0 }}
                animate={{ opacity: show ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.45, delay: BASE_DELAY + 0.3, ease: EASE }
                }
              >
                {LABELS.map((l) => {
                  const p = polar(CX, CY, LABEL_R, l.angle);
                  return (
                    <text
                      key={l.text}
                      x={p.x}
                      y={p.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="var(--muted-foreground)"
                      style={{ fontSize: 11 }}
                      className="select-none"
                    >
                      {l.text}
                    </text>
                  );
                })}
              </motion.g>

              {/* the lens glint dot on the arc at the value */}
              <g>
                {/* the lens at the tip: ring + core + a glint on its rim */}
                <circle
                  cx={tip.x}
                  cy={tip.y}
                  r={6.5}
                  fill="var(--card)"
                  stroke={color}
                  strokeWidth={1.5}
                />
                <circle cx={tip.x} cy={tip.y} r={2.75} fill={color} />
                <motion.circle
                  cx={tip.x - 2}
                  cy={tip.y - 2}
                  r={1.3}
                  fill="var(--foreground)"
                  initial={false}
                  animate={{ opacity: hovered ? 1 : 0.65 }}
                  transition={{ duration: 0.2 }}
                />
              </g>

              {/* the count-up score, centred in the dial */}
              <text
                x={CX}
                y={CY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="currentColor"
                style={{
                  fontSize: 44,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
                className="select-none"
              >
                {format(progress * maxN)}
              </text>
              <text
                x={CX}
                y={CY + 32}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--muted-foreground)"
                style={{ fontSize: 13 }}
                className="select-none"
              >
                of {maxN}
              </text>
            </svg>
          </div>

          {/* label + delta under the number */}
          <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
            <span className="text-[14px] font-medium text-card-foreground">
              {label}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                  neutral
                    ? "bg-muted text-muted-foreground"
                    : good
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                )}
              >
                {neutral ? null : positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {formatDeltaValue(delta)}
              </span>
              {deltaLabel ? (
                <span className="text-[12.5px] text-muted-foreground">
                  {deltaLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default RadialGauge;
