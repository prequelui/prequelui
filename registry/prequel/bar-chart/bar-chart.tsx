"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type BarChartSeries = {
  key: string;
  label: string;
  /** Chart colour token 1–5. Defaults to the series index + 1. */
  tone?: number;
  /** One value per month, aligned with `months`. */
  values: number[];
};

export type BarChartProps = {
  className?: string;
  title?: string;
  description?: string;
  months?: string[];
  series?: BarChartSeries[];
  valuePrefix?: string;
  formatValue?: (value: number) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_MONTHS: string[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DEFAULT_SERIES: BarChartSeries[] = [
  {
    key: "this-year",
    label: "This year",
    tone: 1,
    values: [42000, 51000, 48000, 60000, 66000, 72000, 69000, 78000, 84000, 79000, 88000, 96000],
  },
  {
    key: "last-year",
    label: "Last year",
    tone: 3,
    values: [34000, 40000, 44000, 46000, 50000, 54000, 58000, 60000, 63000, 67000, 70000, 74000],
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
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
  plotW: number;
  plotH: number;
  baseline: number;
  slot: number;
  barW: number;
  yTicks: Array<{ value: number; y: number }>;
  xTicks: Array<{ index: number; x: number; label: string }>;
  xForBar: (monthIndex: number, seriesIndex: number) => number;
  yFor: (value: number) => number;
};

function buildGeometry(
  width: number,
  height: number,
  n: number,
  s: number,
  max: number,
  months: string[]
): Geometry {
  const W = width;
  const H = height;
  const L = 48;
  const R = 8;
  const T = 14;
  const B = 28;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const baseline = T + plotH;
  const slot = plotW / n;
  const gap = 3;
  const barW = clamp(slot * 0.3, 2, 22);
  const groupW = s * barW + (s - 1) * gap;

  const xForBar = (monthIndex: number, seriesIndex: number) => {
    const center = L + slot * (monthIndex + 0.5);
    return center - groupW / 2 + seriesIndex * (barW + gap);
  };

  const yFor = (value: number) => T + plotH * (1 - value / max);

  const yTicks = [0, 1, 2, 3, 4].map((k) => ({
    value: (max * k) / 4,
    y: T + plotH * (1 - k / 4),
  }));

  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 44))));
  const xTicks: Array<{ index: number; x: number; label: string }> = [];
  for (let i = 0; i < n; i += step) {
    xTicks.push({ index: i, x: L + slot * (i + 0.5), label: months[i] });
  }

  return {
    W, H, L, R, T, B, n, plotW, plotH, baseline, slot, barW,
    yTicks, xTicks, xForBar, yFor,
  };
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export function BarChart({
  className,
  title = "Revenue",
  description = "This year vs last year, by month.",
  months = DEFAULT_MONTHS,
  series = DEFAULT_SERIES,
  valuePrefix = "$",
  formatValue,
}: BarChartProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(series.map((s) => [s.key, true]))
  );

  const format =
    formatValue ??
    ((n: number) => valuePrefix + Math.round(n).toLocaleString("en-US"));

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

  /* once the staggered entrance has played, toggles animate without the delay */
  useEffect(() => {
    if (!show || reduce) {
      setEntered(true);
      return;
    }
    const t = window.setTimeout(() => setEntered(true), 1300);
    return () => window.clearTimeout(t);
  }, [show, reduce]);

  const rawMax = useMemo(
    () => Math.max(0, ...series.flatMap((s) => s.values)),
    [series]
  );
  const max = rawMax > 0 ? niceMax(rawMax) : 1;

  const geometry = useMemo<Geometry | null>(() => {
    if (!size) return null;
    return buildGeometry(
      size.width,
      size.height,
      months.length,
      series.length,
      max,
      months
    );
  }, [size, months, series.length, max]);

  const resolved = series.map((s, i) => ({
    ...s,
    color: `var(--chart-${clamp(s.tone ?? i + 1, 1, 5)})`,
  }));

  const toggleSeries = (key: string) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const anyVisible = series.some((s) => next[s.key]);
      return anyVisible ? next : prev;
    });
  };

  /* data + geometry for the hovered month (used by band, lens and tooltip) */
  const hov = hovered;
  const hoverMonth = hov != null ? months[hov] : "";
  const hoverRows =
    hov != null
      ? resolved
          .filter((s) => visible[s.key] ?? true)
          .map((s) => ({
            key: s.key,
            label: s.label,
            color: s.color,
            value: s.values[hov],
          }))
      : [];

  let lens: { cx: number; cy: number; color: string } | null = null;
  if (geometry && hov != null) {
    const idx = resolved.findIndex((s) => visible[s.key] ?? true);
    if (idx !== -1) {
      const s = resolved[idx];
      lens = {
        cx: geometry.xForBar(hov, idx) + geometry.barW / 2,
        cy: geometry.yFor(s.values[hov] ?? 0),
        color: s.color,
      };
    }
  }

  let tipLeft = 4;
  let tipTop = 8;
  if (geometry && hov != null) {
    const center = geometry.L + geometry.slot * (hov + 0.5);
    tipLeft = clamp(center - 80, 4, geometry.W - 164);

    const tops = hoverRows.map((r) => geometry.yFor(r.value));
    const minTop = tops.length ? Math.min(...tops) : geometry.T;
    tipTop = clamp(minTop - 72, 4, geometry.H - 72);
  }

  const ariaLabel = `${title}. Monthly bar chart comparing ${resolved
    .map((s) => s.label)
    .join(" and ")}. ${resolved
    .map(
      (s) =>
        `${s.label}: ${s.values
          .map((v, i) => `${months[i]} ${format(v)}`)
          .join(", ")}`
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
              {description ? (
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>

            <div
              role="group"
              aria-label="Toggle series"
              className="flex flex-wrap items-center gap-1.5"
            >
              {resolved.map((s) => {
                const active = visible[s.key] ?? true;
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSeries(s.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full transition-opacity"
                      style={{
                        background: active ? s.color : "var(--muted-foreground)",
                        opacity: active ? 1 : 0.35,
                      }}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={chartRef} className="relative mt-4 h-72 w-full sm:h-80">
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
                    setHovered((h) =>
                      h == null
                        ? dir === 1
                          ? 0
                          : geometry.n - 1
                        : clamp(h + dir, 0, geometry.n - 1)
                    );
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    setHovered(0);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    setHovered(geometry.n - 1);
                  }
                }}
                onFocus={() => {
                  if (geometry) {
                    setHovered((h) => h ?? Math.floor(geometry.n / 2));
                  }
                }}
                onBlur={() => setHovered(null)}
                className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: show ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: show ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
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

                {resolved.map((ser, si) => {
                  const isVisible = visible[ser.key] ?? true;
                  return (
                    <g key={ser.key}>
                      {ser.values.map((v, mi) => {
                        const h = (v / max) * geometry.plotH;
                        const yTop = geometry.baseline - h;
                        const delay = reduce
                          ? 0
                          : entered
                            ? 0
                            : mi * 0.04 + si * 0.07;
                        const duration = reduce ? 0 : entered ? 0.4 : 0.72;
                        return (
                          <motion.rect
                            key={mi}
                            x={geometry.xForBar(mi, si)}
                            width={geometry.barW}
                            rx={Math.min(2, geometry.barW / 2)}
                            fill={ser.color}
                            initial={false}
                            animate={{
                              height: show && isVisible ? h : 0,
                              y: show && isVisible ? yTop : geometry.baseline,
                              opacity: show && isVisible ? 1 : 0,
                            }}
                            transition={{ duration, delay, ease: EASE }}
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {hov != null && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.06 }}
                    transition={{ duration: 0.2 }}
                    x={geometry.L + geometry.slot * hov}
                    y={geometry.T}
                    width={geometry.slot}
                    height={geometry.plotH}
                    fill="var(--muted-foreground)"
                  />
                )}

                {lens && hov != null && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <circle
                      cx={lens.cx}
                      cy={lens.cy}
                      r={5}
                      fill="none"
                      stroke={lens.color}
                      strokeWidth={1}
                      opacity={0.4}
                    />
                    <circle
                      cx={lens.cx}
                      cy={lens.cy}
                      r={2.25}
                      fill="var(--card)"
                      stroke={lens.color}
                      strokeWidth={1.5}
                    />
                    <motion.g
                      initial={{ rotate: -120 }}
                      animate={{ rotate: 40 }}
                      transition={{
                        type: "spring",
                        stiffness: 140,
                        damping: 16,
                        delay: 0.05,
                      }}
                      style={{
                        transformOrigin: `${lens.cx}px ${lens.cy}px`,
                      }}
                    >
                      <circle
                        cx={lens.cx}
                        cy={lens.cy - 5}
                        r={1.5}
                        fill={lens.color}
                      />
                    </motion.g>
                  </motion.g>
                )}

                <rect
                  x={geometry.L}
                  y={0}
                  width={geometry.plotW}
                  height={geometry.H}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onPointerMove={(e) => {
                    const el = chartRef.current;
                    if (!el || !geometry) return;
                    const px = e.clientX - el.getBoundingClientRect().left;
                    const index = Math.floor(
                      ((px - geometry.L) / geometry.plotW) * geometry.n
                    );
                    setHovered(clamp(index, 0, geometry.n - 1));
                  }}
                  onPointerLeave={() => setHovered(null)}
                />
              </svg>
            )}

            <AnimatePresence>
              {hov != null && (
                <motion.div
                  key="tooltip"
                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="pointer-events-none absolute z-10 min-w-[150px] rounded-lg border border-border bg-card px-3 py-2 shadow-lg"
                  style={{ left: tipLeft, top: tipTop }}
                >
                  <div className="text-[12px] text-muted-foreground">
                    {hoverMonth}
                  </div>
                  {hoverRows.map((r) => (
                    <div key={r.key} className="mt-1.5 flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: r.color }}
                      />
                      <span className="text-[12.5px] text-muted-foreground">
                        {r.label}
                      </span>
                      <span className="ml-auto text-[13px] font-medium tabular-nums">
                        {format(r.value)}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default BarChart;
