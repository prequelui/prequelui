"use client";

import { useId, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowDownRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type NumberTickerMetric = {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  /** Decimals shown on the value. Defaults to 0. */
  decimals?: number;
  /** Signed change vs the previous period, e.g. 12.4 for +12.4%. */
  delta?: number;
  /** Context after the delta. */
  note?: string;
};

export type NumberTickerProps = {
  className?: string;
  title?: string;
  metrics?: NumberTickerMetric[];
  /** Metric selected on first render. Defaults to the first one. */
  defaultMetricId?: string;
  /** Seconds for the digits to settle. Defaults to 1.2. */
  duration?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_METRICS: NumberTickerMetric[] = [
  {
    id: "mrr",
    label: "MRR",
    value: 84260,
    prefix: "$",
    delta: 12.4,
    note: "vs. the previous 30 days",
  },
  {
    id: "arr",
    label: "ARR",
    value: 1011120,
    prefix: "$",
    delta: 18.2,
    note: "annualised run rate",
  },
  {
    id: "customers",
    label: "Customers",
    value: 2847,
    delta: 4.8,
    note: "active accounts",
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function formatValue(metric: NumberTickerMetric) {
  const decimals = Math.max(0, metric.decimals ?? 0);
  const number = metric.value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${metric.prefix ?? ""}${number}${metric.suffix ?? ""}`;
}

function formatDelta(delta: number) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${Math.abs(delta).toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/* one digit wheel: rolls through two loops and lands on the target    */
/* ------------------------------------------------------------------ */

function DigitWheel({
  digit,
  show,
  reduce,
  delay,
  duration,
}: {
  digit: number;
  show: boolean;
  reduce: boolean;
  delay: number;
  duration: number;
}) {
  const count = 20 + digit + 1;
  const digits = Array.from({ length: count }, (_, index) => index % 10);
  /* one step = one digit = 1/count of the strip height */
  const target = `${(-((count - 1) / count) * 100).toFixed(4)}%`;

  if (reduce) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-[1em] w-[0.62em] items-center justify-center tabular-nums"
      >
        {digit}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline tabular-nums"
    >
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col will-change-transform"
        initial={{ y: "0%" }}
        animate={{ y: show ? target : "0%" }}
        transition={
          show
            ? { duration, delay, ease: EASE }
            : { duration: 0 }
        }
      >
        {digits.map((value, index) => (
          <span
            key={index}
            className="flex h-[1em] w-full items-center justify-center leading-none"
          >
            {value}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* the block                                                           */
/* ------------------------------------------------------------------ */

export function NumberTicker({
  className,
  title = "Revenue",
  metrics = DEFAULT_METRICS,
  defaultMetricId,
  duration = 1.2,
}: NumberTickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const pillId = useId();

  const safeMetrics = metrics.length > 0 ? metrics : DEFAULT_METRICS;
  const [activeId, setActiveId] = useState(() => {
    const initial =
      safeMetrics.find((metric) => metric.id === defaultMetricId) ??
      safeMetrics[0];
    return initial?.id ?? "";
  });
  const [replayKey, setReplayKey] = useState(0);

  const metric =
    safeMetrics.find((item) => item.id === activeId) ?? safeMetrics[0];
  const formatted = formatValue(metric);
  const characters = formatted.split("");
  const show = inView;
  const safeDuration = Math.max(0.2, duration);

  const delta = metric.delta ?? 0;
  const positive = delta > 0;
  const neutral = delta === 0;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={
          reduce || show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
        }
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn("w-full text-foreground", className)}
      >
        <section className="rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
              {title}
            </h2>

            <div
              role="group"
              aria-label="Choose a metric"
              className="inline-flex w-fit items-center rounded-lg border border-border bg-muted/50 p-0.5"
            >
              {safeMetrics.map((item) => {
                const active = item.id === metric.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    aria-pressed={active}
                    className={cn(
                      "relative rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`number-ticker-pill-${pillId}`}
                        className="absolute inset-0 rounded-[6px] border border-border bg-card"
                        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                      />
                    ) : null}
                    <span className="relative">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="img"
            aria-label={`${metric.label}: ${formatted}`}
            className="mt-5 flex min-h-[1em] items-center overflow-hidden sm:mt-6"
          >
            <span
              aria-hidden="true"
              className="flex items-center text-[40px] font-semibold leading-none tracking-[-0.03em] text-foreground sm:text-[56px] md:text-[64px]"
            >
              {characters.map((character, index) => {
                if (/\d/.test(character)) {
                  return (
                    <DigitWheel
                      key={`${metric.id}-${replayKey}-${index}`}
                      digit={Number(character)}
                      show={show}
                      reduce={reduce}
                      delay={index * 0.035}
                      duration={safeDuration}
                    />
                  );
                }

                if (character === "," || character === ".") {
                  return (
                    <span
                      key={`${metric.id}-${replayKey}-${index}`}
                      className={cn(
                        "self-end pb-[0.12em] text-[0.9em] tabular-nums",
                        character === ","
                          ? "text-foreground/70"
                          : "text-foreground"
                      )}
                    >
                      {character}
                    </span>
                  );
                }

                return (
                  <span
                    key={`${metric.id}-${replayKey}-${index}`}
                    className="inline-flex h-[1em] items-center tabular-nums"
                  >
                    {character}
                  </span>
                );
              })}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium tabular-nums",
                  neutral
                    ? "text-muted-foreground"
                    : positive
                      ? "text-success"
                      : "text-destructive"
                )}
              >
                {neutral ? null : positive ? (
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                )}
                {formatDelta(delta)}
              </span>
              {metric.note ? (
                <span className="text-muted-foreground">{metric.note}</span>
              ) : null}
            </div>

            {reduce ? null : (
              <button
                type="button"
                onClick={() => setReplayKey((value) => value + 1)}
                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Replay
              </button>
            )}
          </div>
        </section>
      </motion.div>
    </MotionConfig>
  );
}

export default NumberTicker;
