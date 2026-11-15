"use client";

import { useEffect, useRef, useState } from "react";
import {
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

export type ProgressBarsSegment = {
  id: string;
  label: string;
  /** Size in the same unit as `capacity`. */
  value: number;
  /** Chart colour token 1–5. Defaults to the segment index + 1. */
  tone?: number;
};

export type ProgressBarsProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Total space available. Defaults to 500 (GB). */
  capacity?: number;
  /** Unit printed after every value. Defaults to "GB". */
  unit?: string;
  segments?: ProgressBarsSegment[];
  /** Store the warning tick at this percentage. Defaults to 90. */
  warnAt?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_SEGMENTS: ProgressBarsSegment[] = [
  { id: "projects", label: "Project files", value: 152, tone: 1 },
  { id: "media", label: "Media", value: 97, tone: 2 },
  { id: "backups", label: "Snapshots", value: 58, tone: 3 },
  { id: "other", label: "Other", value: 26, tone: 4 },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function useCountUp(target: number, start: boolean, reduce: boolean) {
  const [value, setValue] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setValue(target);
      return;
    }
    if (started.current) return;
    started.current = true;

    const controls = animate(0, target, {
      duration: 1,
      ease: EASE,
      onUpdate: (next) => setValue(next),
      onComplete: () => setValue(target),
    });
    return () => controls.stop();
  }, [start, target, reduce]);

  return value;
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function ProgressBars({
  className,
  title = "Storage",
  description = "Northwind Labs · workspace",
  capacity = 500,
  unit = "GB",
  segments = DEFAULT_SEGMENTS,
  warnAt = 90,
}: ProgressBarsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const safeSegments = segments.length > 0 ? segments : DEFAULT_SEGMENTS;
  const safeCapacity = Math.max(1, capacity);
  const used = safeSegments.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const usedPct = clamp((used / safeCapacity) * 100, 0, 100);
  const free = Math.max(0, safeCapacity - used);
  const displayUsed = useCountUp(used, inView, reduce);

  const [activeId, setActiveId] = useState<string | null>(null);

  const summary = `${formatNumber(used)} of ${formatNumber(safeCapacity)} ${unit} used. ${safeSegments
    .map((item) => `${item.label} ${formatNumber(item.value)} ${unit}`)
    .join(", ")}.`;

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
            {Math.round(usedPct)}% of {formatNumber(safeCapacity)} {unit}
          </span>
        </div>

        <div className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[40px] font-semibold leading-none tracking-[-0.035em] tabular-nums text-foreground sm:text-[44px]">
            {formatNumber(displayUsed)}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {unit} used
          </span>
          <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
            {formatNumber(free)} {unit} free
          </span>
        </div>

        <div
          role="img"
          aria-label={summary}
          className="relative mt-5"
        >
          <div className="flex h-3 w-full gap-[2px] rounded-full bg-muted">
            {safeSegments.map((segment, index) => {
              const share = clamp(segment.value, 0, safeCapacity) / safeCapacity;
              const tone = clamp(segment.tone ?? index + 1, 1, 5);
              const dim = activeId !== null && activeId !== segment.id;

              return (
                <motion.span
                  key={segment.id}
                  aria-hidden="true"
                  className="h-full min-w-[3px] rounded-[3px]"
                  style={{
                    flexGrow: share,
                    flexBasis: 0,
                    background: `var(--chart-${tone})`,
                    transformOrigin: "0% 50%",
                  }}
                  initial={{ scaleX: reduce ? 1 : 0, opacity: dim ? 0.35 : 1 }}
                  animate={{
                    scaleX: inView || reduce ? 1 : 0,
                    opacity: dim ? 0.32 : 1,
                    scaleY: activeId === segment.id ? 1.25 : 1,
                  }}
                  transition={{
                    scaleX: {
                      duration: reduce ? 0 : 0.7,
                      ease: EASE,
                      delay: reduce ? 0 : index * 0.09,
                    },
                    opacity: { duration: reduce ? 0 : 0.2, ease: EASE },
                    scaleY: {
                      duration: reduce ? 0 : 0.25,
                      ease: EASE,
                    },
                  }}
                />
              );
            })}
          </div>

          {warnAt > 0 && warnAt < 100 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 bottom-5 w-px bg-border"
              style={{ left: `${warnAt}%` }}
            />
          ) : null}

          <div className="mt-2 flex items-center justify-between text-[10.5px] tabular-nums text-muted-foreground">
            <span>0 {unit}</span>
            <span>
              alert at {formatNumber((safeCapacity * warnAt) / 100)} {unit}
            </span>
            <span>
              {formatNumber(safeCapacity)} {unit}
            </span>
          </div>
        </div>

        <ul className="mt-5 -mx-2 flex flex-col" role="list">
          {safeSegments.map((segment, index) => {
            const tone = clamp(segment.tone ?? index + 1, 1, 5);
            const pct = clamp((segment.value / safeCapacity) * 100, 0, 100);
            const active = activeId === segment.id;

            return (
              <li key={segment.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveId(segment.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(segment.id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() =>
                    setActiveId((current) =>
                      current === segment.id ? null : segment.id
                    )
                  }
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none",
                    active ? "bg-muted/60" : "hover:bg-muted/40"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: `var(--chart-${tone})` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {segment.label}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                        {formatNumber(segment.value)} {unit}
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full transition-transform duration-300 motion-reduce:transition-none"
                        style={{
                          width: `${pct}%`,
                          background: `var(--chart-${tone})`,
                          transform: `scaleX(${inView || reduce ? 1 : 0})`,
                          transformOrigin: "0% 50%",
                        }}
                      />
                    </span>
                  </span>
                  <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">
                    {Math.round(pct)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 border-t border-border pt-3.5 text-[11.5px] text-muted-foreground">
          Snapshots are kept for 30 days.{" "}
          <span className="text-foreground">Auto-archive starts at 90%.</span>
        </p>
      </motion.div>
    </MotionConfig>
  );
}

export default ProgressBars;
