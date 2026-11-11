"use client";

import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* timing shared by every row so the bars fill, count up, and complete in lock-step */
const FILL_DURATION = 1.0;
const STAGGER = 0.14;
const BASE_DELAY = 0.15;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type GoalProgressGoal = {
  id: string;
  label: string;
  /** Progress from 0 to 100. */
  progress: number;
  /** Short context line, e.g. "$84.3k of $100k MRR". */
  detail?: string;
  /** Chart colour token 1–5. Defaults to 1. */
  tone?: number;
};

export type GoalProgressProps = {
  className?: string;
  title?: string;
  description?: string;
  goals?: GoalProgressGoal[];
  formatProgress?: (progress: number) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now at module load)  */
/* ------------------------------------------------------------------ */

const DEFAULT_GOALS: GoalProgressGoal[] = [
  {
    id: "revenue",
    label: "Recurring revenue",
    progress: 84,
    detail: "$84.3k of $100k MRR",
  },
  {
    id: "signups",
    label: "New signups",
    progress: 64,
    detail: "1,024 of 1,600 accounts",
  },
  {
    id: "activation",
    label: "Activation rate",
    progress: 48,
    detail: "48% of new signups activated",
  },
  {
    id: "expansion",
    label: "Expansion revenue",
    progress: 100,
    detail: "$40k of $40k added",
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/* count-up that shares the fill's duration + easing so the number lands
   exactly when the bar does */
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

const MILESTONES = [25, 50, 75] as const;

/* ------------------------------------------------------------------ */
/* row                                                                 */
/* ------------------------------------------------------------------ */

type GoalRowProps = {
  goal: GoalProgressGoal;
  index: number;
  show: boolean;
  reduce: boolean;
  format: (value: number) => string;
};

function GoalRow({ goal, index, show, reduce, format }: GoalRowProps) {
  const pct = clamp(goal.progress, 0, 100);
  const done = pct >= 100;
  const color = `var(--chart-${clamp(goal.tone ?? 1, 1, 5)})`;

  const fillDelay = BASE_DELAY + index * STAGGER;
  const value = useCountUp(pct, { start: show, reduce, delay: fillDelay });

  /* the check mark lands a touch before the bar finishes; the ring follows once */
  const checkDelay = fillDelay + FILL_DURATION * 0.82;

  return (
    <motion.li
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: show ? 1 : 0, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : index * 0.06,
        ease: EASE,
      }}
      className="rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[13.5px] font-medium text-card-foreground">
          {goal.label}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {done ? (
            <motion.span
              initial={
                reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
              }
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.35, delay: checkDelay, ease: EASE }
              }
              className="relative inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-success/10 text-success"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
              {!reduce ? (
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: 0.5, opacity: 0.6 }}
                  animate={{ scale: 2.1, opacity: 0 }}
                  transition={{
                    duration: 0.9,
                    delay: checkDelay,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 rounded-full ring-1 ring-success"
                />
              ) : null}
            </motion.span>
          ) : null}
          <span className="text-[15px] font-semibold tracking-tight tabular-nums">
            {format(value)}
          </span>
        </div>
      </div>

      {goal.detail ? (
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {goal.detail}
        </p>
      ) : null}

      <div
        role="progressbar"
        aria-label={goal.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={`${Math.round(pct)}%`}
        className="relative mt-2.5 h-1.5 w-full overflow-visible rounded-full bg-muted"
      >
        <motion.div
          initial={{ scaleX: reduce ? pct / 100 : 0 }}
          animate={{ scaleX: show ? pct / 100 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: FILL_DURATION, delay: fillDelay, ease: EASE }
          }
          style={{ background: color, transformOrigin: "0% 50%" }}
          className="absolute inset-0 rounded-full"
        />

        {MILESTONES.map((m) => (
          <span
            key={m}
            aria-hidden="true"
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-border"
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function GoalProgress({
  className,
  title = "Quarter goals",
  description = "Q4 · progress against targets",
  goals = DEFAULT_GOALS,
  formatProgress,
}: GoalProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const format = formatProgress ?? ((v: number) => `${Math.round(v)}%`);

  const completed = goals.filter((g) => clamp(g.progress, 0, 100) >= 100).length;

  const ariaLabel = `${title}. ${goals
    .map((g) => `${g.label} ${format(clamp(g.progress, 0, 100))}`)
    .join(", ")}. ${completed} of ${goals.length} complete.`;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
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

            <motion.span
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: show ? 1 : 0 }}
              transition={{
                duration: reduce ? 0 : 0.5,
                delay: reduce ? 0 : 0.2,
                ease: EASE,
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-medium text-muted-foreground"
            >
              <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="tabular-nums">
                {completed} of {goals.length} complete
              </span>
            </motion.span>
          </div>

          <ul
            className="mt-4 -mx-2 flex flex-col gap-1"
            role="list"
            aria-label={ariaLabel}
          >
            {goals.map((goal, index) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                index={index}
                show={show}
                reduce={reduce}
                format={format}
              />
            ))}
          </ul>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default GoalProgress;
