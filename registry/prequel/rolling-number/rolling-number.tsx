"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type RollingNumberProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Starting value. Defaults to 13,860. */
  defaultValue?: number;
  /** Smallest value the stepper can reach. Defaults to 0. */
  min?: number;
  /** Largest value the stepper can reach. Defaults to 25,000. */
  max?: number;
  /** Amount added or removed by the stepper. Defaults to 500. */
  step?: number;
  /** Text after the number. Defaults to "credits". */
  unit?: string;
  /** Called after every successful change. */
  onChange?: (value: number) => void;
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

/* ------------------------------------------------------------------ */
/* one rolling digit slot                                              */
/* ------------------------------------------------------------------ */

function Digit({
  char,
  index,
  direction,
  rollKey,
  reduce,
  animateIn,
}: {
  char: string;
  index: number;
  direction: 1 | -1;
  rollKey: number;
  reduce: boolean;
  animateIn: boolean;
}) {
  if (!/\d/.test(char)) {
    return (
      <span aria-hidden="true" className="inline-block tabular-nums">
        {char}
      </span>
    );
  }

  if (reduce) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-[1em] w-[0.62em] items-center justify-center tabular-nums"
      >
        {char}
      </span>
    );
  }

  /* the outgoing glyph leaves the way the value is moving, the incoming one
     arrives from the opposite edge: a small physical wheel per column */
  const enter = direction === 1 ? "115%" : "-115%";
  const leave = direction === 1 ? "-115%" : "115%";

  return (
    <span
      aria-hidden="true"
      className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline tabular-nums"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={`${char}-${rollKey}`}
          className="absolute inset-0 flex items-center justify-center leading-none will-change-transform"
          initial={animateIn ? { y: enter } : false}
          animate={{ y: "0%" }}
          exit={{ y: leave }}
          transition={{
            duration: 0.52,
            ease: EASE,
            delay: Math.min(index * 0.025, 0.12),
          }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function RollingNumber({
  className,
  title = "API credits",
  description = "Monthly allowance, resets in 12 days",
  defaultValue = 13860,
  min = 0,
  max = 25000,
  step = 500,
  unit = "credits",
  onChange,
}: RollingNumberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const [value, setValue] = useState(() => clamp(defaultValue, min, max));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [rollKey, setRollKey] = useState(0);
  const revealed = useRef(false);

  /* roll every column once when the card enters the viewport */
  useEffect(() => {
    if (!inView || revealed.current || reduce) return;
    revealed.current = true;
    setDirection(1);
    setRollKey((key) => key + 1);
  }, [inView, reduce]);

  const used = Math.max(0, max - value);
  const usedPct = max > 0 ? clamp((used / max) * 100, 0, 100) : 0;
  const characters = formatNumber(value).split("");
  const disabledDown = value <= min;
  const disabledUp = value >= max;

  const update = (next: number) => {
    const clamped = clamp(next, min, max);
    if (clamped === value) return;
    setDirection(clamped > value ? 1 : -1);
    setValue(clamped);
    setRollKey((key) => key + 1);
    onChange?.(clamped);
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={inView || reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-6",
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
          </div>

          <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium tabular-nums text-muted-foreground">
            {Math.round(usedPct)}% used
          </span>
        </div>

        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div
              role="status"
              aria-live="polite"
              aria-label={`${formatNumber(value)} ${unit} left`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
            >
              <span
                aria-hidden="true"
                className="inline-flex items-baseline text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-[56px]"
              >
                {characters.map((character, index) => (
                  <Digit
                    key={index}
                    char={character}
                    index={index}
                    direction={direction}
                    rollKey={rollKey}
                    reduce={reduce}
                    animateIn={inView}
                  />
                ))}
              </span>
              <span className="text-[12.5px] font-medium text-muted-foreground">
                {unit} left
              </span>
            </div>
          </div>

          <div
            role="group"
            aria-label="Adjust credit balance"
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => update(value - step)}
              disabled={disabledDown}
              aria-label={`Remove ${formatNumber(step)} credits`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => update(value + step)}
              disabled={disabledUp}
              aria-label={`Add ${formatNumber(step)} credits`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-foreground text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-7 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="text-muted-foreground">
              <span className="tabular-nums text-foreground">{formatNumber(used)}</span> of{" "}
              <span className="tabular-nums text-foreground">{formatNumber(max)}</span> used
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(value)} left
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Credits used this cycle"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usedPct)}
            aria-valuetext={`${Math.round(usedPct)}% used`}
            className="relative mt-2.5 h-1.5 w-full rounded-full bg-muted"
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-foreground/80"
              style={{ transformOrigin: "0% 50%" }}
              initial={{ scaleX: reduce ? usedPct / 100 : 0 }}
              animate={{ scaleX: inView || reduce ? usedPct / 100 : 0 }}
              transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-border"
              style={{ left: "80%" }}
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background ring-1 ring-foreground/70"
              style={{ left: `${usedPct}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            We email you when the balance falls below 20%.
          </p>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default RollingNumber;
