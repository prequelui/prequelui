"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type SliderProps = {
  className?: string;
  label?: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  /** Render the current value in the header. */
  formatValue?: (value: number) => string;
  /** Small line under the track. */
  formatHint?: (value: number) => string;
  /** Extra tick marks between the min and max. */
  marks?: number[];
  onValueChange?: (value: number) => void;
};

/* ------------------------------------------------------------------ */
/* demo data                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_MARKS = [10, 20, 30];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seatPrice(seats: number) {
  const perSeat = seats >= 30 ? 15 : seats >= 20 ? 17 : 19;
  return { perSeat, total: seats * perSeat };
}

const formatSeats = (value: number) => `${value} ${value === 1 ? "seat" : "seats"}`;

const formatSeatHint = (value: number) => {
  const { perSeat, total } = seatPrice(value);
  return `$${total.toLocaleString("en-US")} / month · $${perSeat} per seat`;
};

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function Slider({
  className,
  label = "Team seats",
  description = "How many people need a seat on the Studio plan?",
  min = 1,
  max = 40,
  step = 1,
  defaultValue = 12,
  formatValue = formatSeats,
  formatHint = formatSeatHint,
  marks = DEFAULT_MARKS,
  onValueChange,
}: SliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const [value, setValue] = useState(() => clamp(defaultValue, min, max));
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const discounted = value >= 20;

  const handleChange = (nextValue: number) => {
    const next = clamp(nextValue, min, max);
    setValue(next);
    onValueChange?.(next);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className={cn("w-full", className)}>
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: inView ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
          className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight">{label}</h2>
                <AnimatePresence initial={false}>
                  {discounted ? (
                    <motion.span
                      key="volume"
                      initial={reduce ? false : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
                      className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10.5px] font-medium text-success"
                    >
                      Volume price
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{description}</p>
            </div>

            <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums sm:text-[30px]">
              {formatValue(value)}
            </p>
          </div>

          <div className="mt-6 px-2">
            <div className="group relative h-9">
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />

              {marks
                .filter((mark) => mark > min && mark < max)
                .map((mark) => (
                  <span
                    key={mark}
                    aria-hidden="true"
                    className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-border"
                    style={{ left: `${((mark - min) / (max - min)) * 100}%` }}
                  />
                ))}

              <motion.div
                aria-hidden="true"
                initial={{ scaleX: reduce ? percent / 100 : 0 }}
                animate={{ scaleX: inView ? percent / 100 : 0 }}
                transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                style={{ transformOrigin: "left center" }}
                className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-foreground"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${percent}%` }}
              >
                <div className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border bg-background shadow-sm transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105 group-focus-within:scale-105 group-focus-within:ring-2 group-focus-within:ring-ring group-focus-within:ring-offset-2 group-focus-within:ring-offset-card">
                  <span className="h-[7px] w-[7px] rounded-full bg-foreground" />
                  <span className="absolute right-[4px] top-[4px] h-[3px] w-[3px] rounded-full bg-muted-foreground/70" />
                </div>
              </div>

              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                aria-label={label}
                aria-valuetext={formatValue(value)}
                onChange={(event) => handleChange(Number(event.target.value))}
                className="absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 focus-visible:outline-none"
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>{formatValue(min)}</span>
              <span>{formatValue(max)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-[12px] tabular-nums text-muted-foreground">{formatHint(value)}</p>
            <p className="text-[11px] text-muted-foreground">
              {discounted ? "Volume pricing applied" : "Volume pricing from 20 seats"}
            </p>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

export default Slider;
