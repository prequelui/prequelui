"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type AreaChartPoint = {
  date: string;
  value: number;
};

export type AreaChartRange = {
  key: string;
  label: string;
  /** Headline number shown in the header (counts up on change). */
  total: number;
  /** Percent change vs the previous period. */
  delta: number;
  /** Human-readable period label, e.g. "Oct 10 – Nov 9 · vs previous 30 days". */
  rangeText: string;
  points: AreaChartPoint[];
};

export type AreaChartProps = {
  className?: string;
  title?: string;
  ranges?: AreaChartRange[];
  defaultRange?: string;
  valuePrefix?: string;
  formatValue?: (value: number) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now at module load)  */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function dayLabel(offset: number) {
  const d = new Date(2026, 9, 10 + offset);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function monthLabel(index: number) {
  const d = new Date(2025, 11 + index, 1);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function buildPoints(
  count: number,
  start: number,
  end: number,
  noise: number,
  seed: number,
  labelFor: (i: number) => string
): AreaChartPoint[] {
  const rand = lcg(seed);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const value =
      start + (end - start) * Math.pow(t, 1.15) + (rand() - 0.5) * noise * start;
    return { date: labelFor(i), value: Math.round(value) };
  });
}

const DEFAULT_RANGES: AreaChartRange[] = [
  {
    key: "7d",
    label: "7D",
    total: 51240,
    delta: 8.1,
    rangeText: "Nov 3 – Nov 9 · vs previous 7 days",
    points: buildPoints(7, 6200, 8100, 0.08, 1, (i) => dayLabel(24 + i)),
  },
  {
    key: "30d",
    label: "30D",
    total: 213480,
    delta: 14.9,
    rangeText: "Oct 10 – Nov 9 · vs previous 30 days",
    points: buildPoints(30, 5400, 8800, 0.1, 2, dayLabel),
  },
  {
    key: "12m",
    label: "12M",
    total: 764200,
    delta: 64.3,
    rangeText: "Dec 2025 – Nov 2026 · vs previous 12 months",
    points: buildPoints(12, 41000, 85000, 0.03, 3, monthLabel),
  },
];

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function niceMax(value: number) {
  const padded = value * 1.08;
  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
  const normalized = padded / magnitude;
  const steps = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
  const factor = steps.find((k) => k >= normalized) ?? 10;
  return factor * magnitude;
}

function smoothPath(points: Array<[number, number]>) {
  return points
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [x0, y0] = points[i - 1];
      const cx = (x0 + x) / 2;
      return `C${cx},${y0} ${cx},${y} ${x},${y}`;
    })
    .join(" ");
}

function resample(values: number[], count: number) {
  if (count <= 1) return [values[0]];
  return Array.from({ length: count }, (_, i) => {
    const t = (i * (values.length - 1)) / (count - 1);
    const k = Math.floor(t);
    const f = t - k;
    const next = values[k + 1] ?? values[k];
    return values[k] + (next - values[k]) * f;
  });
}

function formatDelta(n: number) {
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
}

function trimZero(n: number) {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

function formatCompact(value: number, prefix: string) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${prefix}${trimZero(abs / 1_000_000)}M`;
  if (abs >= 1000) return `${prefix}${trimZero(abs / 1000)}k`;
  return `${prefix}${abs}`;
}

type Geometry = {
  W: number;
  H: number;
  L: number;
  R: number;
  T: number;
  B: number;
  n: number;
  points: Array<{ x: number; y: number }>;
  line: string;
  area: string;
  yTicks: Array<{ value: number; y: number }>;
  xTicks: Array<{ index: number; x: number; label: string }>;
};

function buildGeometry(
  width: number,
  height: number,
  values: number[],
  max: number,
  dates: string[]
): Geometry {
  const W = width;
  const H = height;
  const L = 52;
  const R = 8;
  const T = 12;
  const B = 30;
  const n = values.length;
  const x = (i: number) => L + ((W - L - R) * i) / (n - 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);

  const points = values.map((v, i) => ({ x: x(i), y: y(v) }));
  const line = smoothPath(points.map((p) => [p.x, p.y] as [number, number]));
  const area = `${line} L${x(n - 1)},${H - B} L${L},${H - B} Z`;

  const yTicks = [0, 1, 2, 3, 4].map((k) => ({
    value: (max * k) / 4,
    y: T + (H - T - B) * (1 - k / 4),
  }));

  const step = Math.max(
    1,
    Math.ceil(n / Math.max(2, Math.floor((W - L) / 64)))
  );
  const xTicks: Array<{ index: number; x: number; label: string }> = [];
  for (let i = 0; i < n; i += step) {
    xTicks.push({ index: i, x: x(i), label: dates[i] });
  }

  return { W, H, L, R, T, B, n, points, line, area, yTicks, xTicks };
}

/* ------------------------------------------------------------------ */
/* count-up                                                           */
/* ------------------------------------------------------------------ */

function useAnimatedNumber(
  target: number,
  opts: { inView: boolean; reduce: boolean }
) {
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
    setValue(from);
    animRef.current = animate(from, target, {
      duration: 0.9,
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
    return () => {
      animRef.current?.stop();
    };
  }, [target, opts.inView, opts.reduce]);

  return value;
}

/* ------------------------------------------------------------------ */
/* component                                                          */
/* ------------------------------------------------------------------ */

export function AreaChart({
  className,
  title = "Revenue",
  ranges = DEFAULT_RANGES,
  defaultRange = "30d",
  valuePrefix = "$",
  formatValue,
}: AreaChartProps) {
  const uid = useId().replace(/:/g, "");
  const cardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  /* Used only inside effects and event handlers (never in render output), so it
     can't cause a server/client hydration mismatch. */
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const [rangeKey, setRangeKey] = useState(defaultRange);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [morphValues, setMorphValues] = useState<number[] | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const morphAnim = useRef<ReturnType<typeof animate> | null>(null);
  const drewRef = useRef(false);

  const activeRange = ranges.find((r) => r.key === rangeKey) ?? ranges[0];
  const gradientId = `area-chart-fill-${uid}`;
  const pillId = `area-chart-pill-${uid}`;

  const format =
    formatValue ??
    ((n: number) => valuePrefix + Math.round(n).toLocaleString("en-US"));

  const total = useAnimatedNumber(activeRange.total, { inView, reduce });
  const delta = useAnimatedNumber(activeRange.delta, { inView, reduce });

  /* measure the chart container so the SVG matches its pixel size */
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        prev && prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height }
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const targetMax = useMemo(
    () => niceMax(Math.max(...activeRange.points.map((p) => p.value))),
    [activeRange]
  );

  const geometry = useMemo<Geometry | null>(() => {
    if (!size) return null;
    const values = morphValues ?? activeRange.points.map((p) => p.value);
    return buildGeometry(
      size.width,
      size.height,
      values,
      targetMax,
      activeRange.points.map((p) => p.date)
    );
  }, [size, morphValues, activeRange, targetMax]);

  const switchRange = (key: string) => {
    if (key === rangeKey) return;
    const prevRange = activeRange;
    const prevMax = niceMax(Math.max(...prevRange.points.map((p) => p.value)));
    const next = ranges.find((r) => r.key === key);
    if (!next) return;

    const nextValues = next.points.map((p) => p.value);
    const nextMax = niceMax(Math.max(...nextValues));
    const scale = nextMax / prevMax;
    const fromValues = resample(
      prevRange.points.map((p) => p.value),
      nextValues.length
    );

    setRangeKey(key);
    setHover(null);

    if (reduce) {
      setMorphValues(null);
      return;
    }

    morphAnim.current?.stop();
    morphAnim.current = animate(0, 1, {
      duration: 0.7,
      ease: EASE,
      onUpdate: (t) => {
        setMorphValues(
          nextValues.map(
            (v, i) => fromValues[i] * scale + (v - fromValues[i] * scale) * t
          )
        );
      },
      onComplete: () => setMorphValues(null),
    });
  };

  /* the line draws itself once on entrance */
  useEffect(() => {
    if (!show || reduce || !geometry || drewRef.current) return;
    const el = lineRef.current;
    if (!el) return;
    drewRef.current = true;

    const length = el.getTotalLength();
    el.style.strokeDasharray = String(length);
    el.style.strokeDashoffset = String(length);

    const controls = animate(length, 0, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => {
        el.style.strokeDashoffset = String(v);
      },
      onComplete: () => {
        el.style.strokeDasharray = "none";
        el.style.strokeDashoffset = "0";
      },
    });

    return () => {
      controls.stop();
      el.style.strokeDasharray = "none";
      el.style.strokeDashoffset = "0";
    };
  }, [show, reduce, geometry]);

  const activePoint =
    geometry && hover != null ? geometry.points[hover] : undefined;
  const tooltipDate = activeRange.points[hover ?? 0]?.date;
  const tooltipValue = activeRange.points[hover ?? 0]?.value ?? 0;

  const tipLeft =
    activePoint && geometry
      ? Math.max(
          4,
          Math.min(
            geometry.W - 158,
            activePoint.x > geometry.W * 0.5
              ? activePoint.x - 158
              : activePoint.x + 14
          )
        )
      : 0;
  const tipTop = activePoint ? Math.max(4, activePoint.y - 64) : 0;

  const ariaLabel = `Daily revenue area chart. ${ranges
    .map(
      (r) =>
        `${r.label}: ${r.rangeText}, total ${format(r.total)}, ${formatDelta(
          r.delta
        )}`
    )
    .join(". ")}.`;

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {activeRange.rangeText}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Range"
              className="inline-flex items-center rounded-lg bg-muted p-1"
            >
              {ranges.map((r) => {
                const active = r.key === rangeKey;
                return (
                  <button
                    key={r.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchRange(r.key)}
                    className={cn(
                      "relative rounded-md px-3 py-1 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={pillId}
                        transition={{ type: "tween", duration: 0.35, ease: EASE }}
                        className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border"
                      />
                    )}
                    <span className="relative z-10">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[13px] font-medium text-muted-foreground">
              Total
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {format(total)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[13px] font-medium tabular-nums",
                  delta >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {delta >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {formatDelta(delta)}
              </span>
            </div>
          </div>

          <div className="mt-4 text-[13px] font-medium text-muted-foreground">
            Daily revenue
          </div>

          <div ref={chartRef} className="relative mt-1 h-72 w-full sm:h-80">
            {geometry && (
              <svg
                viewBox={`0 0 ${geometry.W} ${geometry.H}`}
                role="img"
                aria-label={ariaLabel}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (!geometry) return;
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const dir = e.key === "ArrowRight" ? 1 : -1;
                    setHover((h) =>
                      h == null
                        ? dir === 1
                          ? 0
                          : geometry.n - 1
                        : clamp(h + dir, 0, geometry.n - 1)
                    );
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    setHover(0);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    setHover(geometry.n - 1);
                  }
                }}
                onFocus={() => {
                  if (geometry) {
                    setHover((h) => h ?? Math.floor(geometry.n / 2));
                  }
                }}
                onBlur={() => setHover(null)}
                className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                {geometry.yTicks.map((tick, i) => (
                  <line
                    key={`gl-${i}`}
                    x1={geometry.L}
                    x2={geometry.W - geometry.R}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                ))}

                <motion.g
                  key={`${rangeKey}-y`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {geometry.yTicks.map((tick, i) => (
                    <text
                      key={`y-${i}`}
                      x={geometry.L - 10}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {formatCompact(tick.value, valuePrefix)}
                    </text>
                  ))}
                </motion.g>

                <motion.g
                  key={`${rangeKey}-x`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {geometry.xTicks.map((tick) => (
                    <text
                      key={`x-${tick.index}`}
                      x={tick.x}
                      y={geometry.H - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {tick.label}
                    </text>
                  ))}
                </motion.g>

                <motion.path
                  d={geometry.area}
                  fill={`url(#${gradientId})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: show ? 1 : 0 }}
                  transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
                />

                <path
                  ref={lineRef}
                  d={geometry.line}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: show ? 1 : 0 }}
                  transition={{ delay: 1.05, duration: 0.4, ease: EASE }}
                >
                  <circle
                    cx={geometry.points[geometry.n - 1].x}
                    cy={geometry.points[geometry.n - 1].y}
                    r={5}
                    fill="var(--card)"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                  />
                  <circle
                    cx={geometry.points[geometry.n - 1].x}
                    cy={geometry.points[geometry.n - 1].y}
                    r={1.75}
                    fill="var(--chart-1)"
                  />
                  <circle
                    cx={geometry.points[geometry.n - 1].x - 1.1}
                    cy={geometry.points[geometry.n - 1].y - 1.1}
                    r={0.8}
                    fill="var(--card)"
                  />
                </motion.g>

                <motion.g
                  initial={false}
                  animate={{ opacity: activePoint ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {activePoint && (
                    <>
                      <line
                        x1={activePoint.x}
                        x2={activePoint.x}
                        y1={geometry.T}
                        y2={geometry.H - geometry.B}
                        stroke="var(--muted-foreground)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r={9}
                        fill="none"
                        stroke="var(--chart-1)"
                        strokeWidth={1}
                        opacity={0.25}
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r={4.5}
                        fill="var(--card)"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r={1.5}
                        fill="var(--chart-1)"
                      />
                    </>
                  )}
                </motion.g>

                <rect
                  x={geometry.L}
                  y={0}
                  width={geometry.W - geometry.L - geometry.R}
                  height={geometry.H}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onPointerMove={(e) => {
                    const el = chartRef.current;
                    if (!el || !geometry) return;
                    const px = e.clientX - el.getBoundingClientRect().left;
                    const step =
                      (geometry.W - geometry.L - geometry.R) /
                      (geometry.n - 1);
                    const index = Math.round((px - geometry.L) / step);
                    setHover(clamp(index, 0, geometry.n - 1));
                  }}
                  onPointerLeave={() => setHover(null)}
                />
              </svg>
            )}

            <AnimatePresence>
              {activePoint && hover != null && (
                <motion.div
                  key="tooltip"
                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="pointer-events-none absolute z-10 min-w-[132px] rounded-lg border border-border bg-card px-3 py-2 shadow-lg"
                  style={{ left: tipLeft, top: tipTop }}
                >
                  <div className="text-[12px] text-muted-foreground">
                    {tooltipDate}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: "var(--chart-1)" }}
                    />
                    <span className="text-[13px] font-medium tabular-nums">
                      {format(tooltipValue)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default AreaChart;
