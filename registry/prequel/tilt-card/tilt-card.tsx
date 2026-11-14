"use client";

import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const SERIES = [
  38, 41, 39, 45, 44, 49, 52, 48, 55, 58, 57, 63, 61, 68, 72, 70, 74, 79,
];

function buildSeries(values: number[], width: number, height: number, pad: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1);

  const points = values.map((value, index) => ({
    x: pad + index * step,
    y: pad + (height - pad * 2) * (1 - (value - min) / span),
  }));

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");

  return {
    line,
    area: `${line} L${(width - pad).toFixed(2)},${(height - pad).toFixed(2)} L${pad},${(
      height - pad
    ).toFixed(2)} Z`,
    last: points[points.length - 1],
  };
}

const CHART = buildSeries(SERIES, 220, 56, 4);

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type TiltCardProps = {
  className?: string;
  /** Replaces the default demo body. */
  children?: ReactNode;
  /** Maximum rotation on each axis, in degrees. Defaults to 9. */
  maxTilt?: number;
  /** Perspective of the 3D stage, in pixels. Defaults to 900. */
  perspective?: number;
};

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function TiltCard({
  className,
  children,
  maxTilt = 9,
  perspective = 900,
}: TiltCardProps) {
  const reduce = Boolean(useReducedMotion());
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { once: true, margin: "-10% 0px" });
  const show = inView || reduce;

  /* A normalized pointer position drives both the tilt and the glare.
     Springs smooth the motion without a single React re-render. */
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 170, damping: 22, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 170, damping: 22, mass: 0.6 });

  const rotateX = useTransform(smoothY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(smoothX, [0, 1], [-maxTilt, maxTilt]);

  const glareX = useTransform(smoothX, (value) => `${(value * 100).toFixed(1)}%`);
  const glareY = useTransform(smoothY, (value) => `${(value * 100).toFixed(1)}%`);
  const glare = useMotionTemplate`radial-gradient(
    circle 300px at ${glareX} ${glareY},
    color-mix(in oklab, var(--card-foreground) 14%, transparent),
    transparent 68%
  )`;

  const follow = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX.set(clamp((event.clientX - rect.left) / rect.width));
    pointerY.set(clamp((event.clientY - rect.top) / rect.height));
  };

  const reset = () => {
    if (reduce) return;
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  return (
    <motion.div
      ref={stageRef}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{ perspective: `${Math.max(400, perspective)}px` }}
      className={cn("relative [transform-style:preserve-3d]", className)}
    >
      <motion.div
        onPointerMove={follow}
        onPointerLeave={reset}
        onPointerCancel={reset}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground [will-change:transform]"
      >
        <div
          className="relative p-5 sm:p-6"
          style={{ transform: "translateZ(26px)", transformStyle: "preserve-3d" }}
        >
          {children ?? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-border bg-muted font-mono text-[10.5px] font-semibold tracking-tight">
                    NW
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em]">
                      Northwind Labs
                    </h3>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      Production · v2.4.1
                    </p>
                  </div>
                </div>

                <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Healthy
                </span>
              </div>

              <div className="mt-6 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11.5px] text-muted-foreground">Requests today</p>
                  <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                    1,928,440
                  </p>
                </div>
                <span className="inline-flex flex-none items-center gap-0.5 pb-0.5 text-[12px] font-medium tabular-nums text-success">
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  12.4%
                </span>
              </div>

              <svg
                viewBox="0 0 220 56"
                role="img"
                aria-label="Requests over the last 18 hours, rising from 38 to 79 thousand per minute."
                className="mt-4 w-full"
              >
                <line
                  x1="4"
                  x2="216"
                  y1="28"
                  y2="28"
                  stroke="var(--border)"
                  strokeDasharray="2 4"
                />
                <motion.path
                  d={CHART.area}
                  fill="var(--chart-1)"
                  initial={false}
                  animate={{ opacity: show ? 0.07 : 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
                <motion.path
                  d={CHART.line}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: show ? 1 : 0 }}
                  transition={{ duration: 1, ease: EASE, delay: 0.25 }}
                />
                <g>
                  <circle
                    cx={CHART.last.x}
                    cy={CHART.last.y}
                    r={5}
                    fill="var(--card)"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                  />
                  <circle
                    cx={CHART.last.x}
                    cy={CHART.last.y}
                    r={1.6}
                    fill="var(--chart-1)"
                  />
                  <circle
                    cx={CHART.last.x - 1.1}
                    cy={CHART.last.y - 1.1}
                    r={0.8}
                    fill="var(--card)"
                  />
                </g>
              </svg>

              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">p95</dt>
                  <dd className="mt-0.5 text-[13px] font-medium tabular-nums">48 ms</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">Errors</dt>
                  <dd className="mt-0.5 text-[13px] font-medium tabular-nums">0.03%</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">Uptime</dt>
                  <dd className="mt-0.5 text-[13px] font-medium tabular-nums">99.97%</dd>
                </div>
              </dl>
            </>
          )}
        </div>

        <motion.span
          aria-hidden="true"
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
        />
      </motion.div>
    </motion.div>
  );
}

/* The default card on its own, handy for previews. */
export function TiltCardDemo() {
  return <TiltCard />;
}

export default TiltCard;
