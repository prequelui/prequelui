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

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type UptimeStatus = "operational" | "degraded" | "down";

export type UptimeService = {
  id: string;
  name: string;
  /** Short sub-caption, e.g. the hostname. */
  url?: string;
  /** One status per day, oldest first. */
  days: UptimeStatus[];
};

export type UptimeStatusProps = {
  className?: string;
  title?: string;
  description?: string;
  services?: UptimeService[];
  /** Number of days shown per service. Defaults to 90. */
  dayCount?: number;
  /** Formats an uptime percentage (0–100). Defaults to two decimals. */
  formatUptime?: (percent: number) => string;
};

/* ------------------------------------------------------------------ */
/* constants + status metadata                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_DAY_COUNT = 90;

const BAR_HEIGHT = 34;
const BAR_TOP = 8;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* Most recent day, fixed in UTC so server and client render identically. */
const ANCHOR_MS = Date.UTC(2026, 10, 9);
const DAY_MS = 86_400_000;

const STATUS_META: Record<
  UptimeStatus,
  { label: string; tooltipLabel: string; color: string }
> = {
  operational: {
    label: "Operational",
    tooltipLabel: "Operational",
    color: "var(--success)",
  },
  degraded: {
    label: "Degraded",
    tooltipLabel: "Degraded performance",
    color: "var(--chart-2)",
  },
  down: {
    label: "Down",
    tooltipLabel: "Major outage",
    color: "var(--destructive)",
  },
};

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

/* Build a deterministic list of `total` statuses with exactly `down` outages
   and `degraded` degraded days, scattered by a seeded shuffle. Events are
   placed only within the first `total - 6` slots so the trailing days stay
   operational — the page reads "All systems operational" right now. */
function generateDays(
  seed: number,
  down: number,
  degraded: number,
  total: number
): UptimeStatus[] {
  const rand = mulberry32(seed);
  const days: UptimeStatus[] = new Array<UptimeStatus>(total).fill(
    "operational"
  );
  const span = Math.max(0, total - 6);

  const order: number[] = [];
  for (let i = 0; i < span; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }

  for (let i = 0; i < Math.min(down, span); i++) days[order[i]] = "down";
  for (let i = down; i < Math.min(down + degraded, span); i++) {
    days[order[i]] = "degraded";
  }
  return days;
}

const DEFAULT_SERVICES: UptimeService[] = [
  {
    id: "api",
    name: "API",
    url: "api.acme.com",
    days: generateDays(0x1234abcd, 1, 3, DEFAULT_DAY_COUNT),
  },
  {
    id: "dashboard",
    name: "Dashboard",
    url: "app.acme.com",
    days: generateDays(0x9e3779b9, 0, 2, DEFAULT_DAY_COUNT),
  },
  {
    id: "payments",
    name: "Payments",
    url: "pay.acme.com",
    days: generateDays(0xdeadbeef, 1, 2, DEFAULT_DAY_COUNT),
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function dateForIndex(index: number, total: number): Date {
  const offset = index - (total - 1);
  return new Date(ANCHOR_MS + offset * DAY_MS);
}

function formatDate(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/* Uptime = share of days that were not a full outage (degraded still counts
   as reachable). This is the convention status pages use. */
function uptimePercent(days: UptimeStatus[]): number {
  if (days.length === 0) return 100;
  const down = days.filter((d) => d === "down").length;
  return ((days.length - down) / days.length) * 100;
}

function defaultFormatUptime(percent: number) {
  return `${percent.toFixed(2)}%`;
}

function countBy(days: UptimeStatus[], status: UptimeStatus): number {
  return days.filter((d) => d === status).length;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

type BarsGeometry = {
  width: number;
  height: number;
  barW: number;
  xFor: (index: number) => number;
};

function buildBars(width: number, n: number): BarsGeometry {
  const step = width / n;
  const gap = clamp(step * 0.32, 0.5, 1.5);
  const barW = Math.max(0.5, step - gap);
  return {
    width,
    height: BAR_HEIGHT,
    barW,
    xFor: (index) => index * step,
  };
}

/* ------------------------------------------------------------------ */
/* count-up for the overall uptime number                              */
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
    return () => animRef.current?.stop();
  }, [target, opts.inView, opts.reduce]);

  return value;
}

/* ------------------------------------------------------------------ */
/* one service row: name, daily bars, uptime %                          */
/* ------------------------------------------------------------------ */

type ServiceRowProps = {
  service: UptimeService;
  total: number;
  index: number;
  show: boolean;
  reduce: boolean;
  formatUptime: (percent: number) => string;
};

function ServiceRow({
  service,
  total,
  index,
  show,
  reduce,
  formatUptime,
}: ServiceRowProps) {
  const barsRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  /* measure the strip so the SVG matches its pixel width */
  useEffect(() => {
    const el = barsRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setWidth((prev) => (prev === w ? prev : w));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const days = useMemo(() => {
    const d = service.days.slice(-total);
    while (d.length < total) d.unshift("operational");
    return d;
  }, [service.days, total]);

  const uptime = useMemo(() => uptimePercent(days), [days]);

  const geometry = useMemo(
    () => (width > 0 ? buildBars(width, total) : null),
    [width, total]
  );

  const down = countBy(days, "down");
  const degraded = countBy(days, "degraded");

  const activeDate = active != null ? dateForIndex(active, total) : null;
  const activeStatus = active != null ? days[active] : null;

  let tipLeft = 4;
  if (geometry && active != null) {
    const cx = geometry.xFor(active) + geometry.barW / 2;
    tipLeft = clamp(cx - 64, 4, geometry.width - 136);
  }

  const ariaLabel = `${service.name}: ${formatUptime(uptime)} uptime over the last ${total} days${
    down ? `, ${plural(down, "outage")}` : ""
  }${degraded ? `, ${plural(degraded, "degraded day")}` : ""}.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: show ? 1 : 0, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : 0.1 + index * 0.07,
        ease: EASE,
      }}
      className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1.5 sm:grid-cols-[150px_minmax(0,1fr)_78px] sm:items-center sm:gap-6"
    >
      {/* name */}
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-foreground">
          {service.name}
        </div>
        {service.url ? (
          <div className="truncate text-[11.5px] text-muted-foreground">
            {service.url}
          </div>
        ) : null}
      </div>

      {/* uptime (right on mobile, last column on desktop) */}
      <div className="text-right text-[13px] font-semibold tabular-nums text-foreground sm:order-3">
        {formatUptime(uptime)}
      </div>

      {/* daily bars */}
      <div
        ref={barsRef}
        className="relative col-span-2 h-[34px] min-w-0 sm:order-2 sm:col-span-1"
      >
        {geometry && (
          <svg
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onFocus={() => setActive((a) => a ?? total - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const dir = e.key === "ArrowRight" ? 1 : -1;
                setActive((a) =>
                  a == null
                    ? dir === 1
                      ? 0
                      : total - 1
                    : clamp(a + dir, 0, total - 1)
                );
              } else if (e.key === "Home") {
                e.preventDefault();
                setActive(0);
              } else if (e.key === "End") {
                e.preventDefault();
                setActive(total - 1);
              }
            }}
            className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* bars rise in as a left-to-right wave */}
            {days.map((status, i) => {
              const x = geometry.xFor(i);
              const delay = reduce ? 0 : 0.05 + i * 0.006;
              return (
                <motion.rect
                  key={i}
                  x={x}
                  y={BAR_TOP}
                  width={geometry.barW}
                  height={geometry.height - BAR_TOP}
                  rx={Math.min(1, geometry.barW / 2)}
                  fill={STATUS_META[status].color}
                  initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
                  animate={show ? { scaleY: 1 } : { scaleY: 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.45, delay, ease: EASE }
                  }
                  style={{
                    transformOrigin: `${x + geometry.barW / 2}px ${geometry.height}px`,
                  }}
                />
              );
            })}

            {/* active bar: a brightened overlay + the lens glint dot */}
            {active != null && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                <rect
                  x={geometry.xFor(active)}
                  y={BAR_TOP}
                  width={geometry.barW}
                  height={geometry.height - BAR_TOP}
                  rx={Math.min(1, geometry.barW / 2)}
                  fill="var(--foreground)"
                  opacity={0.22}
                />
                <circle
                  cx={geometry.xFor(active) + geometry.barW / 2}
                  cy={BAR_TOP - 4}
                  r={4.5}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={0.25}
                  strokeWidth={1}
                />
                <circle
                  cx={geometry.xFor(active) + geometry.barW / 2}
                  cy={BAR_TOP - 4}
                  r={2}
                  fill="var(--foreground)"
                />
              </motion.g>
            )}

            {/* pointer hit area */}
            <rect
              x={0}
              y={0}
              width={geometry.width}
              height={geometry.height}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onPointerMove={(e) => {
                const el = barsRef.current;
                if (!el) return;
                const px = e.clientX - el.getBoundingClientRect().left;
                const idx = Math.floor((px / geometry.width) * total);
                setActive(clamp(idx, 0, total - 1));
              }}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        )}

        <AnimatePresence>
          {active != null && activeDate && activeStatus && (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="pointer-events-none absolute z-10 min-w-[136px] rounded-lg border border-border bg-card px-3 py-2 shadow-lg"
              style={{ left: tipLeft, top: BAR_HEIGHT + 6 }}
            >
              <div className="text-[11.5px] text-muted-foreground">
                {formatDate(activeDate)}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_META[activeStatus].color }}
                />
                <span className="text-[12.5px] font-medium text-foreground">
                  {STATUS_META[activeStatus].tooltipLabel}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function UptimeStatus({
  className,
  title = "System status",
  description = "Uptime over the last 90 days, per service.",
  services = DEFAULT_SERVICES,
  dayCount = DEFAULT_DAY_COUNT,
  formatUptime = defaultFormatUptime,
}: UptimeStatusProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const total = Math.max(1, dayCount);

  /* normalise every service to exactly `total` days (pad front, slice end) */
  const normalized = useMemo(
    () =>
      services.map((s) => {
        const d = s.days.slice(-total);
        while (d.length < total) d.unshift("operational");
        return { ...s, days: d };
      }),
    [services, total]
  );

  const overall = useMemo(() => {
    if (normalized.length === 0) return 100;
    const sum = normalized.reduce((acc, s) => acc + uptimePercent(s.days), 0);
    return sum / normalized.length;
  }, [normalized]);

  const displayUptime = useAnimatedNumber(overall, { inView, reduce });

  /* current status: read the most recent day of every service */
  const current = useMemo(() => {
    const latest = normalized.map((s) => s.days[s.days.length - 1]);
    if (latest.includes("down"))
      return { status: "down" as UptimeStatus, text: "Major outage" };
    if (latest.includes("degraded"))
      return {
        status: "degraded" as UptimeStatus,
        text: "Some systems degraded",
      };
    return { status: "operational" as UptimeStatus, text: "All systems operational" };
  }, [normalized]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <div className="p-5 sm:p-6">
          {/* header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {description}
              </p>
            </div>

            {/* overall uptime */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
              <div className="text-right">
                <div className="text-[22px] font-semibold leading-none tracking-tight tabular-nums">
                  {formatUptime(displayUptime)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Overall uptime · {total}d
                </div>
              </div>
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: STATUS_META[current.status].color }}
              />
            </div>
          </div>

          {/* current status line */}
          <div className="mt-4 flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: STATUS_META[current.status].color }}
            />
            <span className="font-medium text-foreground">{current.text}</span>
            <span aria-hidden="true">·</span>
            <span>last {total} days</span>
          </div>

          {/* services */}
          <div className="mt-5 space-y-4">
            {normalized.map((service, index) => (
              <ServiceRow
                key={service.id}
                service={service}
                total={total}
                index={index}
                show={show}
                reduce={reduce}
                formatUptime={formatUptime}
              />
            ))}
          </div>

          {/* legend */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div
              role="img"
              aria-label="Legend: operational, degraded and down statuses"
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
            >
              {(Object.keys(STATUS_META) as UptimeStatus[]).map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: STATUS_META[status].color }}
                  />
                  {STATUS_META[status].label}
                </span>
              ))}
            </div>
            <span className="text-[11.5px] tabular-nums text-muted-foreground">
              {formatDate(dateForIndex(0, total))} –{" "}
              {formatDate(dateForIndex(total - 1, total))}
            </span>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default UptimeStatus;
