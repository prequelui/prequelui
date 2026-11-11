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

export type ActivityHeatmapProps = {
  className?: string;
  title?: string;
  description?: string;
  /** 26 weeks × 7 days (Mon–Sun) of daily counts. Defaults to a deterministic demo. */
  values?: number[][];
  /** What the counts represent, e.g. "contributions". */
  unitLabel?: string;
  formatCount?: (count: number) => string;
};

/* ------------------------------------------------------------------ */
/* geometry constants                                                  */
/* ------------------------------------------------------------------ */

const WEEKS = 26;
const DAYS = 7;
const GAP = 3;
const MIN_CELL = 3;
const GUTTER_LEFT = 30;
const GUTTER_TOP = 16;
const GUTTER_RIGHT = 4;
const GUTTER_BOTTOM = 4;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* Monday of the most recent week, in UTC, so dates are identical on the
   server and the client (no locale/timezone surprises during hydration). */
const ANCHOR_MS = Date.UTC(2026, 10, 2);

/* opacity ramp for the four non-empty intensity levels (level 0 is muted) */
const LEVEL_OPACITY = [0.28, 0.5, 0.72, 1];

/* ------------------------------------------------------------------ */
/* deterministic demo data (seeded PRNG — no Math.random / Date.now)    */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* bend a raw random toward a realistic rhythm: a broad seasonal wave,
   slightly lighter weekends, a quiet summer lull, and a final sprint.
   Tuned so ~70% of days land in a non-empty level (see levelFromR). */
function modulate(r: number, week: number, day: number) {
  const wave = 0.5 + 0.5 * Math.sin((week / WEEKS) * Math.PI * 2 - 0.9);
  let v = r * 0.6 + wave * 0.4;
  if (day >= 5) v *= 0.7;
  if (week >= 7 && week <= 9) v *= 0.55;
  if (week >= 21) v = Math.min(1, v * 1.2 + 0.08);
  return v;
}

/* roughly 30% empty, 26% / 20% / 14% / 10% for levels 1–4 */
function levelFromR(r: number): number {
  if (r < 0.3) return 0;
  if (r < 0.56) return 1;
  if (r < 0.76) return 2;
  if (r < 0.9) return 3;
  return 4;
}

/* a count within the level's range, so the tooltip reads like real data */
const COUNT_RANGE: [number, number][] = [
  [0, 0],
  [1, 3],
  [4, 7],
  [8, 12],
  [13, 26],
];

function countFor(level: number, jitter: number): number {
  const [lo, hi] = COUNT_RANGE[level];
  return Math.min(hi, lo + Math.floor(jitter * (hi - lo + 1)));
}

function generateDefaultCounts(): number[][] {
  const rand = mulberry32(0x9e3779b9);
  return Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: DAYS }, (_, d) => {
      const level = levelFromR(modulate(rand(), w, d));
      return countFor(level, rand());
    })
  );
}

const DEFAULT_VALUES = generateDefaultCounts();

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function levelFromCount(count: number): number {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 12) return 3;
  return 4;
}

function cellFill(level: number): { fill: string; opacity: number } {
  if (level === 0) return { fill: "var(--muted)", opacity: 1 };
  return { fill: "var(--chart-1)", opacity: LEVEL_OPACITY[level - 1] };
}

function dateForCell(week: number, day: number): Date {
  const offset = (week - (WEEKS - 1)) * DAYS + day;
  return new Date(ANCHOR_MS + offset * 86_400_000);
}

function formatDay(date: Date): string {
  const weekday = DAY_NAMES[(date.getUTCDay() + 6) % 7];
  return `${weekday}, ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

type Geometry = {
  width: number;
  height: number;
  cell: number;
  gap: number;
  radius: number;
  left: number;
  top: number;
  gridW: number;
  gridH: number;
  cellX: (week: number) => number;
  cellY: (day: number) => number;
};

function buildGeometry(width: number): Geometry {
  const available = width - GUTTER_LEFT - GUTTER_RIGHT;
  const cell = Math.max(
    (available - (WEEKS - 1) * GAP) / WEEKS,
    MIN_CELL
  );
  const gridW = WEEKS * cell + (WEEKS - 1) * GAP;
  const gridH = DAYS * cell + (DAYS - 1) * GAP;
  const height = GUTTER_TOP + gridH + GUTTER_BOTTOM;
  return {
    width,
    height,
    cell,
    gap: GAP,
    radius: clamp(cell * 0.22, 1, 3),
    left: GUTTER_LEFT,
    top: GUTTER_TOP,
    gridW,
    gridH,
    cellX: (week: number) => GUTTER_LEFT + week * (cell + GAP),
    cellY: (day: number) => GUTTER_TOP + day * (cell + GAP),
  };
}

type Day = {
  week: number;
  day: number;
  count: number;
  level: number;
  label: string;
};

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export function ActivityHeatmap({
  className,
  title = "Activity",
  description = "Daily contributions over the last 26 weeks.",
  values,
  unitLabel = "contributions",
  formatCount = (count: number) => count.toLocaleString("en-US"),
}: ActivityHeatmapProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const [size, setSize] = useState<{ width: number } | null>(null);
  const [active, setActive] = useState<{ week: number; day: number } | null>(
    null
  );

  /* measure the chart container so the SVG matches its pixel size */
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const update = () => {
      const width = el.getBoundingClientRect().width;
      setSize((prev) => (prev && prev.width === width ? prev : { width }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo<Geometry | null>(
    () => (size && size.width > 0 ? buildGeometry(size.width) : null),
    [size]
  );

  /* normalise counts into day records + derived levels */
  const days = useMemo<Day[]>(() => {
    const rows = Array.isArray(values) ? values : DEFAULT_VALUES;
    const out: Day[] = [];
    for (let w = 0; w < WEEKS; w++) {
      const row = rows[w] ?? [];
      for (let d = 0; d < DAYS; d++) {
        const raw = row[d];
        const count = Math.max(
          0,
          Math.round(typeof raw === "number" && Number.isFinite(raw) ? raw : 0)
        );
        out.push({
          week: w,
          day: d,
          count,
          level: levelFromCount(count),
          label: formatDay(dateForCell(w, d)),
        });
      }
    }
    return out;
  }, [values]);

  const total = useMemo(
    () => days.reduce((sum, day) => sum + day.count, 0),
    [days]
  );

  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let prev = -1;
    for (let w = 0; w < WEEKS; w++) {
      const month = dateForCell(w, 0).getUTCMonth();
      if (month !== prev) {
        labels.push({ week: w, label: MONTH_NAMES[month] });
        prev = month;
      }
    }
    return labels;
  }, []);

  const activeDay = active
    ? days[active.week * DAYS + active.day] ?? null
    : null;

  /* tooltip placement, clamped inside the chart container */
  let tipLeft = 4;
  let tipTop = 8;
  if (geometry && active) {
    const cx = geometry.cellX(active.week) + geometry.cell / 2;
    const cy = geometry.cellY(active.day) + geometry.cell / 2;
    tipLeft = clamp(cx - 76, 4, geometry.width - 152);
    const above = cy - geometry.cell - 48;
    tipTop = above < 4 ? cy + geometry.cell + 6 : above;
    tipTop = clamp(tipTop, 4, geometry.height - 52);
  }

  const firstDate = dateForCell(0, 0);
  const lastDate = dateForCell(WEEKS - 1, DAYS - 1);
  const ariaLabel = `${title}. Contribution heatmap of ${total} ${unitLabel} over ${WEEKS} weeks, from ${formatDay(
    firstDate
  )} to ${formatDay(lastDate)}.`;

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

          <div ref={chartRef} className="relative mt-4 w-full">
            {geometry && (
              <svg
                viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                role="img"
                aria-label={ariaLabel}
                tabIndex={0}
                onFocus={() => {
                  setActive((a) => a ?? { week: 12, day: 3 });
                }}
                onBlur={() => setActive(null)}
                onKeyDown={(e) => {
                  if (!geometry) return;
                  const key = e.key;
                  const dirs: Record<string, [number, number]> = {
                    ArrowRight: [1, 0],
                    ArrowLeft: [-1, 0],
                    ArrowDown: [0, 1],
                    ArrowUp: [0, -1],
                  };
                  if (key === "Home") {
                    e.preventDefault();
                    setActive({ week: 0, day: active?.day ?? 0 });
                    return;
                  }
                  if (key === "End") {
                    e.preventDefault();
                    setActive({ week: WEEKS - 1, day: active?.day ?? 0 });
                    return;
                  }
                  const dir = dirs[key];
                  if (!dir) return;
                  e.preventDefault();
                  setActive((a) => {
                    const base = a ?? { week: 12, day: 3 };
                    return {
                      week: clamp(base.week + dir[0], 0, WEEKS - 1),
                      day: clamp(base.day + dir[1], 0, DAYS - 1),
                    };
                  });
                }}
                className="block h-auto w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* month labels */}
                <g>
                  {monthLabels.map((m) => (
                    <text
                      key={m.week}
                      x={geometry.cellX(m.week)}
                      y={geometry.top - 5}
                      className="fill-muted-foreground text-[10px] font-medium"
                    >
                      {m.label}
                    </text>
                  ))}
                </g>

                {/* weekday labels (Mon / Wed / Fri) */}
                <g>
                  {[0, 2, 4].map((d) => (
                    <text
                      key={d}
                      x={geometry.left - 6}
                      y={geometry.cellY(d) + geometry.cell / 2 + 3.5}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {DAY_NAMES[d]}
                    </text>
                  ))}
                </g>

                {/* cells — fade in as a diagonal wave */}
                {days.map((day) => {
                  const fill = cellFill(day.level);
                  const cx = geometry.cellX(day.week) + geometry.cell / 2;
                  const cy = geometry.cellY(day.day) + geometry.cell / 2;
                  const delay = reduce ? 0 : 0.05 + (day.week + day.day) * 0.016;
                  return (
                    <motion.rect
                      key={day.week * DAYS + day.day}
                      x={geometry.cellX(day.week)}
                      y={geometry.cellY(day.day)}
                      width={geometry.cell}
                      height={geometry.cell}
                      rx={geometry.radius}
                      fill={fill.fill}
                      fillOpacity={fill.opacity}
                      initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.4 }}
                      animate={
                        show
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0, scale: 0.4 }
                      }
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { duration: 0.5, delay, ease: EASE }
                      }
                      style={{ transformOrigin: `${cx}px ${cy}px` }}
                    />
                  );
                })}

                {/* active cell: a lens ring with a glint dot */}
                {active && (
                  <motion.g
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <rect
                      x={geometry.cellX(active.week) - 1.5}
                      y={geometry.cellY(active.day) - 1.5}
                      width={geometry.cell + 3}
                      height={geometry.cell + 3}
                      rx={geometry.radius + 1.5}
                      fill="none"
                      stroke="var(--foreground)"
                      strokeOpacity={0.35}
                      strokeWidth={1}
                    />
                    <circle
                      cx={geometry.cellX(active.week) + geometry.cell + 1.5}
                      cy={geometry.cellY(active.day) - 1.5}
                      r={1.5}
                      fill="var(--foreground)"
                    />
                  </motion.g>
                )}

                {/* pointer hit area */}
                <rect
                  x={geometry.left}
                  y={geometry.top}
                  width={geometry.gridW}
                  height={geometry.gridH}
                  fill="transparent"
                  onPointerMove={(e) => {
                    const el = chartRef.current;
                    if (!el || !geometry) return;
                    const rect = el.getBoundingClientRect();
                    const col = Math.floor(
                      (e.clientX - rect.left - geometry.left) /
                        (geometry.cell + geometry.gap)
                    );
                    const row = Math.floor(
                      (e.clientY - rect.top - geometry.top) /
                        (geometry.cell + geometry.gap)
                    );
                    setActive({
                      week: clamp(col, 0, WEEKS - 1),
                      day: clamp(row, 0, DAYS - 1),
                    });
                  }}
                  onPointerLeave={() => setActive(null)}
                  style={{ cursor: "crosshair" }}
                />
              </svg>
            )}

            <AnimatePresence>
              {active && activeDay && (
                <motion.div
                  key="tooltip"
                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="pointer-events-none absolute z-10 min-w-[140px] rounded-lg border border-border bg-card px-3 py-2 shadow-lg"
                  style={{ left: tipLeft, top: tipTop }}
                >
                  <div className="text-[11.5px] text-muted-foreground">
                    {activeDay.label}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-[3px]"
                      style={{
                        backgroundColor: cellFill(activeDay.level).fill,
                        opacity: cellFill(activeDay.level).opacity,
                      }}
                    />
                    <span className="text-[12.5px] font-medium tabular-nums">
                      {activeDay.count === 0
                        ? `No ${unitLabel}`
                        : `${formatCount(activeDay.count)} ${unitLabel}`}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* summary + legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">
                {formatCount(total)}
              </span>{" "}
              {unitLabel} · last {WEEKS} weeks
            </p>
            <div
              role="img"
              aria-label={`Legend: activity intensity from less to more, in ${5} levels`}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className="mr-0.5">Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{
                    backgroundColor: cellFill(level).fill,
                    opacity: cellFill(level).opacity,
                  }}
                />
              ))}
              <span className="ml-0.5">More</span>
            </div>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default ActivityHeatmap;
