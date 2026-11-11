"use client";

import { useEffect, useId, useRef, useState } from "react";
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
const COUNT_DURATION = 1.1;

/* ------------------------------------------------------------------ */
/* types                                                              */
/* ------------------------------------------------------------------ */

export type StatsSectionStat = {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  /** Decimals shown on the value. Defaults to 0. */
  decimals?: number;
  /** Signed change vs the previous period, e.g. 24.6 for +24.6%. */
  trend: number;
  /** Unit after the trend value. Defaults to "%". */
  trendSuffix?: string;
  /** Decimals shown on the trend value. Defaults to 1. */
  trendDecimals?: number;
  /** Short context after the trend, e.g. "vs last year". */
  trendLabel?: string;
  /** When true a negative trend is good (e.g. churn going down). */
  goodWhenDown?: boolean;
};

export type StatsSectionProps = {
  className?: string;
  /** Optional section heading. Pass an empty string to hide it. */
  heading?: string;
  /** Optional supporting line under the heading. */
  subheading?: string;
  stats?: StatsSectionStat[];
  formatValue?: (value: number, stat: StatsSectionStat) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now at module load)  */
/* ------------------------------------------------------------------ */

const DEFAULT_HEADING = "Momentum, measured";
const DEFAULT_SUBHEADING =
  "A quiet snapshot of how teams put the platform to work, updated every quarter.";

const DEFAULT_STATS: StatsSectionStat[] = [
  {
    id: "teams",
    label: "Active teams",
    value: 18600,
    trend: 24.6,
    trendLabel: "vs last year",
  },
  {
    id: "projects",
    label: "Projects shipped",
    value: 1280000,
    suffix: "+",
    trend: 18.4,
    trendLabel: "vs last year",
  },
  {
    id: "uptime",
    label: "Platform uptime",
    value: 99.98,
    suffix: "%",
    decimals: 2,
    trend: 0.02,
    trendSuffix: " pts",
    trendDecimals: 2,
    trendLabel: "last 90 days",
  },
  {
    id: "rating",
    label: "Average rating",
    value: 4.9,
    suffix: "/5",
    decimals: 1,
    trend: 6.5,
    trendLabel: "vs last year",
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function defaultFormat(value: number, stat: StatsSectionStat) {
  const decimals = stat.decimals ?? 0;
  const number = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${stat.prefix ?? ""}${number}${stat.suffix ?? ""}`;
}

function formatTrend(stat: StatsSectionStat) {
  const decimals = stat.trendDecimals ?? 1;
  const sign = stat.trend > 0 ? "+" : stat.trend < 0 ? "−" : "";
  return `${sign}${Math.abs(stat.trend).toFixed(decimals)}${stat.trendSuffix ?? "%"}`;
}

/* ------------------------------------------------------------------ */
/* count-up, driven by the scroll position of the whole band          */
/* ------------------------------------------------------------------ */

function useCountUp(
  target: number,
  opts: { start: boolean; reduce: boolean; delay: number }
) {
  const [value, setValue] = useState(0);
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
      duration: COUNT_DURATION,
      ease: EASE,
      delay: opts.delay,
      onUpdate: (v) => setValue(v),
      onComplete: () => setValue(target),
    });

    return () => controls.stop();
  }, [opts.start, opts.reduce, opts.delay, target]);

  return opts.reduce ? target : value;
}

/* ------------------------------------------------------------------ */
/* one stat cell                                                      */
/* ------------------------------------------------------------------ */

type StatCellProps = {
  stat: StatsSectionStat;
  index: number;
  show: boolean;
  reduce: boolean;
  format: (value: number, stat: StatsSectionStat) => string;
};

function StatCell({ stat, index, show, reduce, format }: StatCellProps) {
  const value = useCountUp(stat.value, {
    start: show,
    reduce,
    delay: index * 0.08,
  });

  const neutral = stat.trend === 0;
  const positive = stat.trend > 0;
  const good = stat.goodWhenDown ? stat.trend < 0 : stat.trend > 0;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce || show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{
        duration: reduce ? 0 : 0.55,
        delay: reduce ? 0 : index * 0.07,
        ease: EASE,
      }}
      className={cn(
        "group relative flex min-w-0 flex-col gap-2 px-4 py-6 sm:px-6 md:px-5 md:py-7 lg:px-7",
        /* 2x2 on phones: a vertical rule in the right column and a
           horizontal rule under the first row. */
        index % 2 === 1 && "border-l border-border",
        index >= 2 && "border-t border-border",
        /* one row of four on desktop: only the vertical dividers remain. */
        "md:border-t-0",
        index > 0 && "md:border-l md:border-border"
      )}
    >
      <dt className="text-[12px] font-medium text-muted-foreground sm:text-[13px]">
        {stat.label}
      </dt>

      <dd className="m-0 flex flex-col gap-2">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-foreground sm:text-[28px] md:text-[30px] lg:text-[34px]">
          <span aria-hidden="true">{format(value, stat)}</span>
          <span className="sr-only">{format(stat.value, stat)}</span>
        </span>

        <span
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] leading-none",
            neutral
              ? "text-muted-foreground"
              : good
                ? "text-success"
                : "text-destructive"
          )}
        >
          <span className="inline-flex items-center gap-0.5 font-medium tabular-nums">
            {neutral ? null : positive ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
            )}
            {formatTrend(stat)}
          </span>
          {stat.trendLabel ? (
            <span className="font-normal text-muted-foreground">
              {stat.trendLabel}
            </span>
          ) : null}
        </span>

        {/* the thin underline draws itself while the number counts up */}
        <span
          aria-hidden="true"
          className="relative mt-1 block h-px w-full bg-border"
        >
          <motion.span
            className="absolute inset-y-0 left-0 block w-full origin-left bg-foreground/45"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: reduce || show ? 1 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    duration: COUNT_DURATION,
                    delay: 0.1 + index * 0.08,
                    ease: EASE,
                  }
            }
          />
          {/* the one lens glint: a tiny ring that settles on hover */}
          <span
            className="pointer-events-none absolute -top-[3px] right-0 grid h-[7px] w-[7px] place-items-center rounded-full border bg-card opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ borderColor: "var(--chart-1)" }}
          >
            <span
              className="h-[2px] w-[2px] translate-x-[1px] -translate-y-[1px] rounded-full"
              style={{ background: "var(--chart-1)" }}
            />
          </span>
        </span>
      </dd>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                              */
/* ------------------------------------------------------------------ */

export function StatsSection({
  className,
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
  stats = DEFAULT_STATS,
  formatValue,
}: StatsSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;
  const format = formatValue ?? defaultFormat;
  const headingId = useId();

  const safeStats = stats.length > 0 ? stats : DEFAULT_STATS;
  const hasHeading = Boolean(heading || subheading);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        role="group"
        aria-labelledby={heading ? headingId : undefined}
        aria-label={heading ? undefined : "Key statistics"}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={reduce || show ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        {hasHeading ? (
          <div className="flex flex-col gap-1.5 border-b border-border px-5 py-5 sm:px-7 sm:py-6">
            {heading ? (
              <h2
                id={headingId}
                className="text-[15px] font-medium tracking-[-0.01em] text-foreground sm:text-base"
              >
                {heading}
              </h2>
            ) : null}
            {subheading ? (
              <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                {subheading}
              </p>
            ) : null}
          </div>
        ) : null}

        <dl className="grid grid-cols-2 md:grid-cols-4">
          {safeStats.map((stat, index) => (
            <StatCell
              key={stat.id}
              stat={stat}
              index={index}
              show={show}
              reduce={reduce}
              format={format}
            />
          ))}
        </dl>
      </motion.div>
    </MotionConfig>
  );
}

export default StatsSection;
