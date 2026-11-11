"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* timing shared by every stage so the bars fill in cascade */
const FILL_DURATION = 0.9;
const STAGGER = 0.12;
const BASE_DELAY = 0.15;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type ConversionFunnelStep = {
  id: string;
  label: string;
  /** Count at this stage (visitors, signups, …). */
  value: number;
  /** Short context line under the label, e.g. "Sessions". */
  detail?: string;
  /** Chart colour token 1–5. Defaults to the step index + 1. */
  tone?: number;
};

export type ConversionFunnelProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Funnel stages, widest first. The first stage defines the 100% width. */
  steps?: ConversionFunnelStep[];
  formatValue?: (value: number) => string;
  /** Receives the share of the top of funnel, e.g. 39.7. */
  formatShare?: (share: number) => string;
  /** Receives the step-to-step drop-off, e.g. 60.3. */
  formatDropoff?: (dropoff: number) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now during render)   */
/* ------------------------------------------------------------------ */

const DEFAULT_STEPS: ConversionFunnelStep[] = [
  { id: "visitors", label: "Visitors", value: 24800, detail: "Sessions", tone: 1 },
  { id: "signups", label: "Signups", value: 9840, detail: "New accounts", tone: 2 },
  { id: "trials", label: "Trials", value: 2614, detail: "Free trials", tone: 3 },
  { id: "paid", label: "Paid", value: 776, detail: "Subscribers", tone: 4 },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function trimZero(n: number) {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/* ------------------------------------------------------------------ */
/* geometry                                                             */
/* ------------------------------------------------------------------ */

type FunnelRow = {
  step: ConversionFunnelStep;
  index: number;
  color: string;
  /** Bar width relative to the first (top) stage, 0–1. */
  fraction: number;
  /** Share of the top of funnel, as a percentage. */
  share: number;
  /** Drop-off to the next stage, as a percentage; null on the last stage. */
  dropoff: number | null;
  nextLabel: string | null;
};

function computeRows(steps: ConversionFunnelStep[]): FunnelRow[] {
  const firstValue = steps[0]?.value ?? 0;

  return steps.map((step, i) => {
    const tone = clamp(step.tone ?? i + 1, 1, 5);
    const fraction = firstValue > 0 ? clamp(step.value / firstValue, 0, 1) : 0;
    const share = firstValue > 0 ? (step.value / firstValue) * 100 : 0;

    const next = steps[i + 1];
    const dropoff =
      next && step.value > 0
        ? clamp((1 - next.value / step.value) * 100, 0, 100)
        : null;

    return {
      step,
      index: i,
      color: `var(--chart-${tone})`,
      fraction,
      share,
      dropoff,
      nextLabel: next ? next.label : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* stage row                                                           */
/* ------------------------------------------------------------------ */

type FunnelRowProps = {
  row: FunnelRow;
  show: boolean;
  reduce: boolean;
  formatValue: (value: number) => string;
  formatShare: (share: number) => string;
  formatDropoff: (dropoff: number) => string;
};

function FunnelRow({
  row,
  show,
  reduce,
  formatValue,
  formatShare,
  formatDropoff,
}: FunnelRowProps) {
  const [hovered, setHovered] = useState(false);
  const { step, index, color, fraction, share, dropoff, nextLabel } = row;

  const fillDelay = BASE_DELAY + index * STAGGER;

  const tooltipText =
    dropoff != null && nextLabel
      ? `${step.label}: ${formatValue(step.value)} · ${formatDropoff(dropoff)} drop-off to ${nextLabel}`
      : `${step.label}: ${formatValue(step.value)} · ${formatShare(share)} of total`;

  return (
    <motion.li
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: show ? 1 : 0, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : index * 0.06,
        ease: EASE,
      }}
    >
      <div className="relative">
        {/* tooltip: follows keyboard focus as well as the pointer */}
        <motion.div
          aria-hidden="true"
          initial={false}
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 4, x: "-50%" }}
          transition={{ duration: 0.18, ease: EASE }}
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] text-muted-foreground shadow-md"
        >
          <span className="tabular-nums">{tooltipText}</span>
        </motion.div>

        <button
          type="button"
          aria-label={tooltipText}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3"
        >
          {/* label + detail */}
          <div className="w-14 min-w-0 shrink-0 sm:w-24">
            <div className="truncate text-[13.5px] font-medium text-card-foreground">
              {step.label}
            </div>
            {step.detail ? (
              <div className="truncate text-[11.5px] text-muted-foreground">
                {step.detail}
              </div>
            ) : null}
          </div>

          {/* the bar: centred, narrowing, fills in from the left */}
          <div className="relative h-9 min-w-0 flex-1">
            <div
              className="relative mx-auto h-full overflow-hidden rounded-lg"
              style={{ width: `${clamp(fraction * 100, 0, 100)}%` }}
            >
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{ background: color, transformOrigin: "0% 50%" }}
                initial={{ scaleX: reduce ? 1 : 0 }}
                animate={{ scaleX: show ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: FILL_DURATION, delay: fillDelay, ease: EASE }
                }
              />

              {/* slow flow shimmer, only while hovered */}
              <motion.span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
                initial={false}
                animate={
                  hovered && show && !reduce
                    ? { x: ["-100%", "200%"], opacity: 1 }
                    : { x: "-100%", opacity: 0 }
                }
                transition={
                  hovered && show && !reduce
                    ? { duration: 2.4, repeat: Infinity, ease: "linear" }
                    : { duration: 0.25 }
                }
              />
            </div>
          </div>

          {/* value + share */}
          <div className="w-16 shrink-0 text-right sm:w-20">
            <div className="text-[15px] font-semibold leading-tight tabular-nums text-card-foreground">
              {formatValue(step.value)}
            </div>
            <div className="text-[11.5px] tabular-nums text-muted-foreground">
              {formatShare(share)}
            </div>
          </div>
        </button>
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* drop-off connector between stages                                    */
/* ------------------------------------------------------------------ */

function DropoffConnector({
  label,
  show,
  reduce,
  index,
}: {
  label: string;
  show: boolean;
  reduce: boolean;
  index: number;
}) {
  const delay = BASE_DELAY + index * STAGGER + FILL_DURATION * 0.4;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{
        duration: reduce ? 0 : 0.4,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      className="my-0.5 flex items-center justify-center gap-1.5 text-muted-foreground"
    >
      <TrendingDown className="h-3 w-3" />
      <span className="text-[11.5px] font-medium tabular-nums">{label}</span>
      <span className="text-[11.5px]">drop-off</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function ConversionFunnel({
  className,
  title = "Conversion funnel",
  description = "Visitors to paid, one step at a time.",
  steps = DEFAULT_STEPS,
  formatValue,
  formatShare,
  formatDropoff,
}: ConversionFunnelProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const rows = useMemo(() => computeRows(steps), [steps]);

  const formatVal =
    formatValue ?? ((n: number) => Math.round(n).toLocaleString("en-US"));
  const formatPct = formatShare ?? ((s: number) => `${trimZero(s)}%`);
  const formatDrop =
    formatDropoff ?? ((d: number) => `${trimZero(d)}%`);

  const overallShare = rows.length ? rows[rows.length - 1].share : 0;

  const ariaLabel = `${title}. Conversion funnel from ${steps
    .map((s) => `${s.label} ${formatVal(s.value)}`)
    .join(", ")}. Overall conversion ${formatPct(overallShare)}.`;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={cardRef}
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

            {/* the lens: one small glint dot inside the overall conversion badge */}
            <motion.div
              initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: show ? 1 : 0, y: 0 }}
              transition={{
                duration: reduce ? 0 : 0.5,
                delay: reduce ? 0 : 0.15,
                ease: EASE,
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-medium text-muted-foreground"
            >
              <span className="relative inline-flex h-[14px] w-[14px] items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-foreground/20" />
                <motion.span
                  className="h-[5px] w-[5px] rounded-full bg-foreground"
                  initial={{ scale: reduce ? 1 : 0 }}
                  animate={{ scale: show ? 1 : 0 }}
                  transition={{
                    duration: reduce ? 0 : 0.4,
                    delay: reduce ? 0 : 0.45,
                    ease: EASE,
                  }}
                />
              </span>
              <span>
                Overall{" "}
                <span className="tabular-nums">{formatPct(overallShare)}</span>
              </span>
            </motion.div>
          </div>

          <ul className="mt-5 space-y-1" role="list" aria-label={ariaLabel}>
            {rows.map((row) => (
              <Fragment key={row.step.id}>
                <FunnelRow
                  row={row}
                  show={show}
                  reduce={reduce}
                  formatValue={formatVal}
                  formatShare={formatPct}
                  formatDropoff={formatDrop}
                />
                {row.dropoff != null ? (
                  <DropoffConnector
                    label={`−${formatDrop(row.dropoff)}`}
                    show={show}
                    reduce={reduce}
                    index={row.index}
                  />
                ) : null}
              </Fragment>
            ))}
          </ul>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default ConversionFunnel;
