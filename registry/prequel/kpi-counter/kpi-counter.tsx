"use client";

import { useEffect, useRef, useState } from "react";
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

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type KpiCounterItem = {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Signed change vs the previous period, e.g. 12.4 for +12.4%. */
  delta: number;
  /** Unit shown after the delta value, e.g. "%" or " pts". Defaults to "%". */
  deltaSuffix?: string;
  /** Decimals shown on the delta value. Defaults to 1. */
  deltaDecimals?: number;
  /** Short context after the badge, e.g. "vs last month". */
  deltaLabel?: string;
  /** When true a negative delta is good (e.g. churn going down). */
  goodWhenDown?: boolean;
  /** Sparkline values, drawn left to right. */
  sparkline: number[];
  /** Chart colour token 1–5. Defaults to 1. */
  tone?: number;
};

export type KpiCounterProps = {
  className?: string;
  items?: KpiCounterItem[];
  formatValue?: (value: number, item: KpiCounterItem) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now at module load)  */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: KpiCounterItem[] = [
  {
    id: "mrr",
    label: "Monthly recurring revenue",
    value: 84260,
    prefix: "$",
    decimals: 0,
    delta: 12.4,
    deltaLabel: "vs last month",
    sparkline: [61, 63, 62, 65, 67, 71, 70, 74, 77, 80, 82, 84],
    tone: 1,
  },
  {
    id: "users",
    label: "Active users",
    value: 12480,
    decimals: 0,
    delta: 8.2,
    deltaLabel: "vs last month",
    sparkline: [8.2, 8.5, 8.4, 8.9, 9.1, 9.6, 9.8, 10.3, 10.9, 11.5, 12.1, 12.48],
    tone: 2,
  },
  {
    id: "churn",
    label: "Revenue churn",
    value: 1.9,
    suffix: "%",
    decimals: 1,
    delta: -0.4,
    deltaSuffix: " pts",
    deltaDecimals: 1,
    deltaLabel: "lower is better",
    goodWhenDown: true,
    sparkline: [2.9, 2.8, 2.9, 2.6, 2.5, 2.4, 2.5, 2.2, 2.1, 2.0, 1.95, 1.9],
    tone: 3,
  },
  {
    id: "arpu",
    label: "Avg. revenue per account",
    value: 68.4,
    prefix: "$",
    decimals: 2,
    delta: 4.2,
    deltaLabel: "vs last month",
    sparkline: [59.4, 60.1, 60.0, 61.3, 62.1, 63.0, 63.8, 64.5, 65.2, 66.1, 67.3, 68.4],
    tone: 4,
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function defaultFormat(value: number, item: KpiCounterItem) {
  const decimals = item.decimals ?? 0;
  const number = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${item.prefix ?? ""}${number}${item.suffix ?? ""}`;
}

function formatDelta(item: KpiCounterItem) {
  const decimals = item.deltaDecimals ?? 1;
  const sign = item.delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(item.delta).toFixed(decimals)}${item.deltaSuffix ?? "%"}`;
}

type Pt = { x: number; y: number };

function sparklinePoints(
  values: number[],
  w: number,
  h: number,
  pad: number
): Pt[] {
  const n = values.length;
  if (n === 1) return [{ x: pad, y: h - pad }];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => ({
    x: pad + ((w - pad * 2) * i) / (n - 1),
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
}

function sparkPath(values: number[], w: number, h: number, pad: number) {
  const pts = sparklinePoints(values, w, h, pad);
  return pts
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const q = pts[i - 1];
      const cx = (q.x + p.x) / 2;
      return `C${cx},${q.y} ${cx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* count-up with a spring                                              */
/* ------------------------------------------------------------------ */

function useCountUp(
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
      type: "spring",
      stiffness: 100,
      damping: 16,
      delay: opts.delay,
      onUpdate: (v) => setValue(v),
      onComplete: () => setValue(target),
    });

    return () => controls.stop();
  }, [opts.start, target, opts.reduce, opts.delay]);

  return value;
}

/* ------------------------------------------------------------------ */
/* sparkline                                                          */
/* ------------------------------------------------------------------ */

const SPARK_W = 72;
const SPARK_H = 32;
const SPARK_PAD = 7;

type SparklineProps = {
  values: number[];
  color: string;
  draw: boolean;
  hovered: boolean;
  reduce: boolean;
  delay: number;
  label: string;
  className?: string;
};

function Sparkline({
  values,
  color,
  draw,
  hovered,
  reduce,
  delay,
  label,
  className,
}: SparklineProps) {
  const d = sparkPath(values, SPARK_W, SPARK_H, SPARK_PAD);
  const last = sparklinePoints(values, SPARK_W, SPARK_H, SPARK_PAD)[
    values.length - 1
  ];

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className={cn("h-8 w-[72px] shrink-0", className)}
      role="img"
      aria-label={label}
    >
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: draw ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE, delay }}
      />

      {/* last point: a lens that lights up on hover */}
      <motion.g
        initial={false}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <circle
          cx={last.x}
          cy={last.y}
          r={5}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.4}
        />
        <circle
          cx={last.x}
          cy={last.y}
          r={2.25}
          fill="var(--card)"
          stroke={color}
          strokeWidth={1.5}
        />
      </motion.g>

      {/* the glint dot rides the rim of the lens */}
      <motion.g
        initial={false}
        animate={{ opacity: hovered ? 1 : 0, rotate: hovered ? 45 : -120 }}
        transition={{
          opacity: { duration: 0.2 },
          rotate: { type: "spring", stiffness: 140, damping: 16 },
        }}
        style={{ transformOrigin: `${last.x}px ${last.y}px` }}
      >
        <circle cx={last.x} cy={last.y - 5} r={1.5} fill={color} />
      </motion.g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* card                                                               */
/* ------------------------------------------------------------------ */

type KpiCardProps = {
  item: KpiCounterItem;
  index: number;
  show: boolean;
  reduce: boolean;
  format: (value: number, item: KpiCounterItem) => string;
};

function KpiCard({ item, index, show, reduce, format }: KpiCardProps) {
  const [hovered, setHovered] = useState(false);
  const value = useCountUp(item.value, {
    start: show,
    reduce,
    delay: index * 0.06,
  });

  const tone = item.tone ?? 1;
  const color = `var(--chart-${tone})`;

  const positive = item.delta > 0;
  const neutral = item.delta === 0;
  const good = item.goodWhenDown ? item.delta < 0 : item.delta > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      animate={{ opacity: show ? 1 : 0, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.55,
        delay: reduce ? 0 : index * 0.06,
        ease: EASE,
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:border-muted-foreground/30"
    >
      <span className="truncate text-[13px] font-medium text-muted-foreground">
        {item.label}
      </span>

      <div className="flex items-end justify-between gap-3">
        <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
          {format(value, item)}
        </span>
        <Sparkline
          values={item.sparkline}
          color={color}
          draw={show}
          hovered={hovered}
          reduce={reduce}
          delay={0.1 + index * 0.08}
          label={`${item.label} trend, ${item.sparkline.length} points`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
          {formatDelta(item)}
        </span>
        {item.deltaLabel ? (
          <span className="truncate text-[12.5px] text-muted-foreground">
            {item.deltaLabel}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                              */
/* ------------------------------------------------------------------ */

export function KpiCounter({
  className,
  items = DEFAULT_ITEMS,
  formatValue,
}: KpiCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;
  const format = formatValue ?? defaultFormat;

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={ref}
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
          className
        )}
      >
        {items.map((item, index) => (
          <KpiCard
            key={item.id}
            item={item}
            index={index}
            show={show}
            reduce={reduce}
            format={format}
          />
        ))}
      </div>
    </MotionConfig>
  );
}

export default KpiCounter;
