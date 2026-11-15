"use client";

import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SIZE = 220;
const CENTER = SIZE / 2;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type RadialProgressItem = {
  id: string;
  label: string;
  /** Progress from 0 to 100. */
  value: number;
  /** One short line under the label. */
  detail?: string;
  /** Chart colour token 1–5. Defaults to the item index + 1. */
  tone?: number;
};

export type RadialProgressProps = {
  className?: string;
  title?: string;
  description?: string;
  items?: RadialProgressItem[];
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: RadialProgressItem[] = [
  {
    id: "design",
    label: "Design system",
    value: 82,
    detail: "14 of 17 components",
    tone: 1,
  },
  {
    id: "api",
    label: "API v3",
    value: 64,
    detail: "9 of 14 endpoints",
    tone: 2,
  },
  {
    id: "mobile",
    label: "Mobile beta",
    value: 47,
    detail: "5 of 11 screens",
    tone: 3,
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(items: RadialProgressItem[]) {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + clamp(item.value, 0, 100), 0) / items.length;
}

function pointOnRing(radius: number, value: number) {
  const angle = (-90 + (clamp(value, 0, 100) / 100) * 360) * (Math.PI / 180);
  /* Round before rendering: the last digits of Math.cos/Math.sin are not
     guaranteed to match between the server and the browser. */
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return {
    x: round(CENTER + Math.cos(angle) * radius),
    y: round(CENTER + Math.sin(angle) * radius),
  };
}

function useAnimatedValue(target: number, start: boolean, reduce: boolean) {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (!start) return;
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }

    const controls = animate(current.current, target, {
      duration: 0.55,
      ease: EASE,
      onUpdate: (next) => {
        current.current = next;
        setValue(next);
      },
      onComplete: () => {
        current.current = target;
        setValue(target);
      },
    });
    return () => controls.stop();
  }, [target, start, reduce]);

  return value;
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function RadialProgress({
  className,
  title = "Quarterly objectives",
  description = "6 of 9 key results on track",
  items = DEFAULT_ITEMS,
}: RadialProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const safeItems = items.length > 0 ? items : DEFAULT_ITEMS;
  const shown = safeItems.slice(0, 3);
  const [activeId, setActiveId] = useState<string | null>(null);

  const overall = average(shown);
  const active = shown.find((item) => item.id === activeId) ?? null;
  const displayTarget = active ? clamp(active.value, 0, 100) : overall;
  const displayValue = useAnimatedValue(displayTarget, inView, reduce);

  const ringGap = shown.length > 1 ? 22 : 0;
  const outer = 94;
  const radii = shown.map((_, index) => outer - index * ringGap);

  const summary = `${title}. ${shown
    .map((item) => `${item.label} ${Math.round(clamp(item.value, 0, 100))}%`)
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

          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-success">
            <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
            <span className="tabular-nums">12 pts</span>
          </span>
        </div>

        <div className="mt-5 grid items-center gap-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-7">
          <div className="relative mx-auto w-full max-w-[220px]">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={summary}
              className="h-auto w-full"
            >
              {shown.map((item, index) => {
                const radius = radii[index];
                const tone = clamp(item.tone ?? index + 1, 1, 5);
                const value = clamp(item.value, 0, 100);
                const dim = activeId !== null && activeId !== item.id;
                const end = pointOnRing(radius, value);

                return (
                  <g key={item.id}>
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={radius}
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth={7}
                    />
                    <motion.circle
                      cx={CENTER}
                      cy={CENTER}
                      r={radius}
                      fill="none"
                      stroke={`var(--chart-${tone})`}
                      strokeWidth={7}
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100 100"
                      transform={`rotate(-90 ${CENTER} ${CENTER})`}
                      initial={{
                        strokeDashoffset: reduce ? 100 - value : 100,
                        opacity: dim ? 0.3 : 1,
                      }}
                      animate={{
                        strokeDashoffset: inView || reduce ? 100 - value : 100,
                        opacity: dim ? 0.3 : 1,
                      }}
                      transition={{
                        strokeDashoffset: {
                          duration: reduce ? 0 : 1,
                          ease: EASE,
                          delay: reduce ? 0 : index * 0.13,
                        },
                        opacity: { duration: reduce ? 0 : 0.2, ease: EASE },
                      }}
                    />
                    <motion.circle
                      cx={end.x}
                      cy={end.y}
                      r={3}
                      fill={`var(--chart-${tone})`}
                      stroke="var(--card)"
                      strokeWidth={2}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: inView || reduce ? (dim ? 0.35 : 1) : 0 }}
                      transition={{
                        duration: reduce ? 0 : 0.3,
                        delay: reduce ? 0 : 0.6 + index * 0.13,
                        ease: EASE,
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground sm:text-[36px]">
                {Math.round(clamp(displayValue, 0, 100))}%
              </span>
              <span className="mt-1.5 max-w-[120px] truncate text-[11px] leading-4 text-muted-foreground">
                {active ? active.label : `across ${shown.length} ${shown.length === 1 ? "objective" : "objectives"}`}
              </span>
            </div>
          </div>

          <ul className="flex min-w-0 flex-col gap-1" role="list">
            {shown.map((item, index) => {
              const tone = clamp(item.tone ?? index + 1, 1, 5);
              const value = clamp(item.value, 0, 100);
              const selected = item.id === activeId;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveId(item.id)}
                    onMouseLeave={() => setActiveId(null)}
                    onFocus={() => setActiveId(item.id)}
                    onBlur={() => setActiveId(null)}
                    onClick={() =>
                      setActiveId((current) =>
                        current === item.id ? null : item.id
                      )
                    }
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none",
                      selected ? "bg-muted/60" : "hover:bg-muted/40"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: `var(--chart-${tone})` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {item.label}
                      </span>
                      {item.detail ? (
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          {item.detail}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-foreground">
                      {Math.round(value)}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5">
          <span className="text-[11.5px] text-muted-foreground">
            Hover an objective to read its ring
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
            <span className="tabular-nums">week 46</span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span className="tabular-nums">3 weeks left</span>
          </span>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default RadialProgress;
