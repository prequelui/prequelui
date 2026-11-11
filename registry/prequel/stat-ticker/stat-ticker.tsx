"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  Activity,
  MousePointerClick,
  Smile,
  TrendingDown,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* a single keyframe, shared by every instance of the block */
const KEYFRAMES = `
@keyframes prequel-ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type StatTickerItem = {
  id: string;
  label: string;
  /** Display values, cycled in order as the ticker refreshes. */
  values: string[];
  /** Optional Lucide icon in a small square before the value. */
  icon?: LucideIcon;
};

export type StatTickerProps = {
  className?: string;
  items?: StatTickerItem[];
  /** Seconds between each value refresh. Defaults to 4. */
  interval?: number;
  /** Seconds for one full loop of the track. Defaults to 42. */
  duration?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now at module load)  */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: StatTickerItem[] = [
  {
    id: "mrr",
    label: "MRR",
    icon: TrendingUp,
    values: ["$84,260", "$84,268", "$84,277", "$84,271", "$84,285"],
  },
  {
    id: "signups",
    label: "Signups today",
    icon: UserPlus,
    values: ["1,284", "1,291", "1,298", "1,305", "1,312"],
  },
  {
    id: "conversion",
    label: "Conversion",
    icon: MousePointerClick,
    values: ["3.2%", "3.4%", "3.1%", "3.5%", "3.3%"],
  },
  {
    id: "nps",
    label: "NPS",
    icon: Smile,
    values: ["71", "72", "70", "73", "74"],
  },
  {
    id: "active",
    label: "Active now",
    icon: Activity,
    values: ["2,847", "2,902", "2,876", "2,931", "2,915"],
  },
  {
    id: "churn",
    label: "Revenue churn",
    icon: TrendingDown,
    values: ["1.9%", "1.8%", "1.9%", "1.7%", "1.8%"],
  },
];

/* ------------------------------------------------------------------ */
/* a value that flips with a vertical slide when it changes            */
/* ------------------------------------------------------------------ */

function RollingValue({
  value,
  reduce,
  className,
}: {
  value: string;
  reduce: boolean;
  className?: string;
}) {
  if (reduce) {
    return (
      <span className={cn("inline-block whitespace-nowrap tabular-nums", className)}>
        {value}
      </span>
    );
  }

  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "110%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-110%" }}
          transition={{ duration: 0.55, ease: EASE }}
          className="inline-block whitespace-nowrap tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* one compact stat in the ticker                                      */
/* ------------------------------------------------------------------ */

function TickerStat({
  item,
  value,
  reduce,
}: {
  item: StatTickerItem;
  value: string;
  reduce: boolean;
}) {
  const Icon = item.icon;

  return (
    <div className="flex shrink-0 items-center gap-3">
      {Icon ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          {item.label}
        </span>
        <RollingValue
          value={value}
          reduce={reduce}
          className="text-[22px] font-semibold leading-none tracking-tight text-card-foreground"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function StatTicker({
  className,
  items = DEFAULT_ITEMS,
  interval = 4,
  duration = 42,
}: StatTickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const safeItems = items.length > 0 ? items : DEFAULT_ITEMS;
  const intervalMs = Math.max(1, interval) * 1000;
  const safeDuration = Math.max(1, duration);

  /* one shared value step per stat, so the two copies stay in sync */
  const [steps, setSteps] = useState<number[]>(() => safeItems.map(() => 0));

  const paused = hovered || focused;
  const running = show && !paused && !reduce;

  /* refresh values on a gentle, per-stat stagger; everything pauses on
     hover/focus and under reduced motion. */
  useEffect(() => {
    if (!running) return;
    const timeouts: number[] = [];
    const intervals: number[] = [];
    for (let i = 0; i < safeItems.length; i++) {
      const start = window.setTimeout(() => {
        setSteps((prev) => prev.map((v, j) => (j === i ? v + 1 : v)));
        const id = window.setInterval(() => {
          setSteps((prev) => prev.map((v, j) => (j === i ? v + 1 : v)));
        }, intervalMs);
        intervals.push(id);
      }, intervalMs + i * 650);
      timeouts.push(start);
    }
    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      intervals.forEach((id) => window.clearInterval(id));
    };
  }, [running, intervalMs, safeItems.length]);

  const valueFor = (i: number) => {
    const item = safeItems[i];
    const step = steps[i] ?? 0;
    return item.values.length > 0
      ? item.values[step % item.values.length]
      : "";
  };

  const maskStyle: CSSProperties = {
    maskImage:
      "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
    WebkitMaskImage:
      "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
  };

  const trackStyle: CSSProperties | undefined = reduce
    ? undefined
    : {
        animation: `prequel-ticker-scroll ${safeDuration}s linear infinite`,
        animationPlayState: paused ? "paused" : "running",
      };

  const renderGroup = (hidden: boolean) => (
    <div
      className="flex shrink-0 items-center gap-10 pr-10"
      aria-hidden={hidden ? "true" : undefined}
    >
      {safeItems.map((item, i) => (
        <TickerStat
          key={`${item.id}-${hidden ? "copy" : "main"}`}
          item={item}
          value={valueFor(i)}
          reduce={reduce}
        />
      ))}
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <style>{KEYFRAMES}</style>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 16 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        tabIndex={0}
        role="group"
        aria-label="Live statistics ticker"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "relative rounded-xl border border-border bg-card text-card-foreground shadow-sm outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <div
          className={cn(
            "relative flex items-center py-4",
            reduce ? "overflow-x-auto" : "overflow-hidden"
          )}
          style={maskStyle}
        >
          <div className="flex w-max" style={trackStyle}>
            {renderGroup(false)}
            {reduce ? null : renderGroup(true)}
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default StatTicker;
