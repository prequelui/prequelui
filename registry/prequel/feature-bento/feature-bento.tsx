"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type FeatureBentoRevenue = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delta: number;
  deltaLabel?: string;
  series: number[];
  tone?: number;
};

export type FeatureBentoCounter = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta: number;
  deltaLabel?: string;
};

export type FeatureBentoStorage = {
  label: string;
  used: number;
  total: number;
  unit?: string;
  tone?: number;
};

export type FeatureBentoAutomation = {
  label: string;
  description: string;
  detail: string;
  defaultOn?: boolean;
};

export type FeatureBentoCommand = {
  label: string;
  command: string;
  response: string;
};

export type FeatureBentoProps = {
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  revenue?: FeatureBentoRevenue;
  workspaces?: FeatureBentoCounter;
  automation?: FeatureBentoAutomation;
  storage?: FeatureBentoStorage;
  command?: FeatureBentoCommand;
};

const DEFAULT_REVENUE: FeatureBentoRevenue = {
  label: "Recurring revenue",
  value: 84260,
  prefix: "$",
  decimals: 0,
  delta: 12.4,
  deltaLabel: "vs last month",
  series: [41, 44, 43, 47, 51, 50, 54, 58, 61, 66, 72, 78, 84],
  tone: 1,
};

const DEFAULT_WORKSPACES: FeatureBentoCounter = {
  label: "Active workspaces",
  value: 1284,
  delta: 8.2,
  deltaLabel: "vs last month",
};

const DEFAULT_STORAGE: FeatureBentoStorage = {
  label: "Storage used",
  used: 34.2,
  total: 50,
  unit: "GB",
  tone: 2,
};

const DEFAULT_AUTOMATION: FeatureBentoAutomation = {
  label: "Automatic backups",
  description: "Snapshots every 6 hours",
  detail: "Last backup 12 min ago",
  defaultOn: true,
};

const DEFAULT_COMMAND: FeatureBentoCommand = {
  label: "Quick actions",
  command: "npx shadcn@latest add feature-bento",
  response: "Added feature-bento",
};

const TILE =
  "group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background/50 p-4 text-card-foreground transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-muted-foreground/30 hover:shadow-[0_24px_60px_-42px_var(--foreground)] sm:p-5 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMetric(
  value: number,
  decimals = 0,
  prefix = "",
  suffix = ""
) {
  const number = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${number}${suffix}`;
}

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
      duration: 1.05,
      ease: EASE,
      delay: opts.delay,
      onUpdate: (v) => setValue(v),
      onComplete: () => setValue(target),
    });

    return () => controls.stop();
  }, [opts.start, target, opts.reduce, opts.delay]);

  return value;
}

function useTypewriter(
  text: string,
  opts: { start: boolean; reduce: boolean; delay: number }
) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!opts.start) return;
    if (opts.reduce) {
      setCount(text.length);
      return;
    }

    setCount(0);
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      index += 1;
      setCount(index);
      if (index < text.length) {
        timer = setTimeout(tick, 42);
      }
    };

    const startTimer = setTimeout(tick, opts.delay * 1000);

    return () => {
      clearTimeout(startTimer);
      if (timer) clearTimeout(timer);
    };
  }, [text, opts.start, opts.reduce, opts.delay]);

  return text.slice(0, count);
}

type DeltaBadgeProps = {
  delta: number;
  label?: string;
  className?: string;
};

function DeltaBadge({ delta, label, className }: DeltaBadgeProps) {
  const positive = delta > 0;
  const neutral = delta === 0;

  return (
    <div className={cn("flex shrink-0 flex-col items-end gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
          neutral
            ? "bg-muted text-muted-foreground"
            : positive
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
        )}
      >
        {neutral ? null : positive ? (
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
        )}
        {`${positive ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(1)}%`}
      </span>
      {label ? (
        <span className="text-[11px] text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}

type TileProps = {
  children: ReactNode;
  index: number;
  show: boolean;
  reduce: boolean;
  className?: string;
  onHoverChange?: (hovered: boolean) => void;
};

function Tile({
  children,
  index,
  show,
  reduce,
  className,
  onHoverChange,
}: TileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: show ? 1 : 0, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.55,
        delay: reduce ? 0 : index * 0.06,
        ease: EASE,
      }}
      className={cn("min-w-0", className)}
    >
      <div
        onPointerEnter={() => onHoverChange?.(true)}
        onPointerLeave={() => onHoverChange?.(false)}
        className={cn(TILE, "h-full")}
      >
        {children}
      </div>
    </motion.div>
  );
}

const SPARK_W = 320;
const SPARK_H = 100;
const SPARK_PAD = 8;

type Pt = { x: number; y: number };

function sparkPoints(values: number[]): Pt[] {
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map((value, index) => ({
    x:
      SPARK_PAD +
      ((SPARK_W - SPARK_PAD * 2) * index) / Math.max(1, n - 1),
    y:
      SPARK_H -
      SPARK_PAD -
      ((value - min) / range) * (SPARK_H - SPARK_PAD * 2),
  }));
}

function sparkPath(points: Pt[]) {
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x},${point.y}`;
      const previous = points[index - 1];
      const cx = (previous.x + point.x) / 2;
      return `C${cx},${previous.y} ${cx},${point.y} ${point.x},${point.y}`;
    })
    .join(" ");
}

type RevenueTileProps = {
  revenue: FeatureBentoRevenue;
  index: number;
  show: boolean;
  reduce: boolean;
};

function RevenueTile({ revenue, index, show, reduce }: RevenueTileProps) {
  const value = useCountUp(revenue.value, {
    start: show,
    reduce,
    delay: 0.15,
  });
  const color = `var(--chart-${clamp(revenue.tone ?? 1, 1, 5)})`;
  const series = revenue.series.length > 1 ? revenue.series : [0, 1];
  const points = sparkPoints(series);
  const line = sparkPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L${last.x},${SPARK_H} L${first.x},${SPARK_H} Z`;

  return (
    <Tile
      index={index}
      show={show}
      reduce={reduce}
      className="sm:col-span-2 lg:col-span-4 lg:row-span-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">
            {revenue.label}
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums sm:text-[36px]">
            {formatMetric(
              value,
              revenue.decimals ?? 0,
              revenue.prefix,
              revenue.suffix
            )}
          </p>
        </div>
        <DeltaBadge delta={revenue.delta} label={revenue.deltaLabel} />
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`${revenue.label} over the last ${series.length} weeks, trending ${
            revenue.delta >= 0 ? "up" : "down"
          }.`}
        >
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={SPARK_PAD}
              x2={SPARK_W - SPARK_PAD}
              y1={SPARK_PAD + (SPARK_H - SPARK_PAD * 2) * fraction}
              y2={SPARK_PAD + (SPARK_H - SPARK_PAD * 2) * fraction}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2 5"
            />
          ))}

          <motion.path
            d={area}
            fill={color}
            initial={{ opacity: reduce ? 0.08 : 0 }}
            animate={{ opacity: show ? 0.08 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.8, delay: 0.35, ease: EASE }
            }
          />

          <motion.path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: show ? 1 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 1.2, delay: 0.1, ease: EASE }
            }
          />

          <motion.circle
            cx={last.x}
            cy={last.y}
            r={3}
            fill="var(--card)"
            stroke={color}
            strokeWidth={1.75}
            initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.6 }}
            animate={{ opacity: show ? 1 : 0, scale: 1 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.4, delay: 0.85, ease: EASE }
            }
            style={{ transformOrigin: `${last.x}px ${last.y}px` }}
          />
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>12 weeks ago</span>
        <span>This week</span>
      </div>
    </Tile>
  );
}

type CounterTileProps = {
  counter: FeatureBentoCounter;
  index: number;
  show: boolean;
  reduce: boolean;
};

function CounterTile({ counter, index, show, reduce }: CounterTileProps) {
  const value = useCountUp(counter.value, {
    start: show,
    reduce,
    delay: 0.2,
  });

  return (
    <Tile index={index} show={show} reduce={reduce} className="lg:col-span-2">
      <p className="text-[12px] font-medium text-muted-foreground">
        {counter.label}
      </p>
      <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight tabular-nums">
        {formatMetric(value, 0, counter.prefix, counter.suffix)}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <DeltaBadge delta={counter.delta} />
        {counter.deltaLabel ? (
          <span className="text-[11px] text-muted-foreground">
            {counter.deltaLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Live across every workspace
      </p>
    </Tile>
  );
}

type AutomationTileProps = {
  automation: FeatureBentoAutomation;
  index: number;
  show: boolean;
  reduce: boolean;
};

function AutomationTile({
  automation,
  index,
  show,
  reduce,
}: AutomationTileProps) {
  const [on, setOn] = useState(automation.defaultOn ?? true);

  return (
    <Tile index={index} show={show} reduce={reduce} className="lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">
            {automation.label}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-card-foreground">
            {automation.description}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`Toggle ${automation.label}`}
          onClick={() => setOn((current) => !current)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            on ? "border-foreground/20 bg-foreground" : "border-border bg-muted"
          )}
        >
          <motion.span
            initial={false}
            animate={{ x: on ? 20 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.3, ease: EASE }
            }
            className={cn(
              "block h-5 w-5 rounded-full bg-background shadow-sm",
              on ? null : "border border-border"
            )}
          />
        </button>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4 text-[11px] text-muted-foreground">
        <motion.span
          initial={false}
          animate={{ opacity: on ? 1 : 0.4 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            on ? "bg-success" : "bg-muted-foreground"
          )}
        />
        <span className="min-w-0 truncate">
          {on ? automation.detail : "Paused"}
        </span>
      </div>
    </Tile>
  );
}

const RING_W = 72;
const RING_CX = 36;
const RING_CY = 36;
const RING_R = 28;
const RING_STROKE = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function polar(cx: number, cy: number, r: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians),
  };
}

type StorageTileProps = {
  storage: FeatureBentoStorage;
  index: number;
  show: boolean;
  reduce: boolean;
};

function StorageTile({ storage, index, show, reduce }: StorageTileProps) {
  const [hovered, setHovered] = useState(false);
  const total = Math.max(0, storage.total);
  const used = clamp(storage.used, 0, total || storage.used);
  const fraction = total > 0 ? clamp(used / total, 0, 1) : 0;
  const percent = useCountUp(fraction * 100, {
    start: show,
    reduce,
    delay: 0.3,
  });

  const color = `var(--chart-${clamp(storage.tone ?? 1, 1, 5)})`;
  const tip = polar(RING_CX, RING_CY, RING_R, -90 + fraction * 360);
  const offset = RING_CIRCUMFERENCE * (1 - fraction);
  const usedDecimals = Number.isInteger(storage.used) ? 0 : 1;

  return (
    <Tile
      index={index}
      show={show}
      reduce={reduce}
      className="sm:col-span-2 lg:col-span-2"
      onHoverChange={setHovered}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">
            {storage.label}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {`${formatMetric(used, usedDecimals)} of ${formatMetric(total)} ${
              storage.unit ?? ""
            }`}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
          {`${Math.round(fraction * 100)}%`}
        </span>
      </div>

      <div className="mt-3 flex flex-1 items-center justify-center">
        <div
          role="progressbar"
          aria-label={storage.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
          aria-valuetext={`${Math.round(fraction * 100)} percent used`}
          className="relative w-[118px] max-w-full"
        >
          <svg
            viewBox={`0 0 ${RING_W} ${RING_W}`}
            className="block h-auto w-full"
            aria-hidden="true"
          >
            <circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_R}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={RING_STROKE}
            />

            <motion.circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_R}
              fill="none"
              stroke={color}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
              initial={{
                strokeDashoffset: reduce ? offset : RING_CIRCUMFERENCE,
              }}
              animate={{ strokeDashoffset: show ? offset : RING_CIRCUMFERENCE }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 1, delay: 0.3, ease: EASE }
              }
            />

            <g>
              <circle
                cx={tip.x}
                cy={tip.y}
                r={5.5}
                fill="var(--card)"
                stroke={color}
                strokeWidth={1.5}
              />
              <circle cx={tip.x} cy={tip.y} r={2.2} fill={color} />
              <motion.g
                initial={false}
                animate={{
                  rotate: hovered ? 40 : -30,
                  opacity: hovered ? 1 : 0.6,
                }}
                transition={{
                  rotate: {
                    duration: reduce ? 0 : 0.7,
                    ease: EASE,
                  },
                  opacity: { duration: reduce ? 0 : 0.2 },
                }}
                style={{ transformOrigin: `${tip.x}px ${tip.y}px` }}
              >
                <circle
                  cx={tip.x}
                  cy={tip.y - 4.2}
                  r={1.15}
                  fill="var(--foreground)"
                />
              </motion.g>
            </g>
          </svg>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-[18px] font-semibold leading-none tabular-nums">
              {`${Math.round(percent)}%`}
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              used
            </span>
          </div>
        </div>
      </div>
    </Tile>
  );
}

type CommandTileProps = {
  command: FeatureBentoCommand;
  index: number;
  show: boolean;
  reduce: boolean;
};

function CommandTile({ command, index, show, reduce }: CommandTileProps) {
  const typed = useTypewriter(command.command, {
    start: show,
    reduce,
    delay: 0.55,
  });
  const done = typed.length >= command.command.length;

  return (
    <Tile index={index} show={show} reduce={reduce} className="sm:col-span-2 lg:col-span-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-muted-foreground">
          {command.label}
        </p>
        <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-center rounded-md border border-border bg-muted/40 px-3 py-2.5 font-mono text-[11px] sm:text-[12px]">
        <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            $
          </span>
          <span aria-hidden="true" className="min-w-0 overflow-hidden text-ellipsis text-foreground">
            {typed}
          </span>
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{ opacity: done ? 0 : 1 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="inline-block h-3.5 w-[6px] shrink-0 rounded-[1px] bg-foreground"
          />
          <span className="sr-only">{command.command}</span>
        </div>

        <div className="mt-1.5 min-h-[18px] text-[11px]">
          <motion.span
            initial={false}
            animate={{
              opacity: done ? 1 : 0,
              y: done || reduce ? 0 : 3,
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.35, ease: EASE }
            }
            className="inline-flex items-center gap-1 text-success"
          >
            <Check className="h-3 w-3" aria-hidden="true" />
            {command.response}
          </motion.span>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Type a command to jump anywhere.
      </p>
    </Tile>
  );
}

export function FeatureBento({
  className,
  eyebrow = "Overview",
  title = "A calmer control room",
  description = "Live product signals and the controls that keep them moving, arranged in one quiet surface.",
  revenue = DEFAULT_REVENUE,
  workspaces = DEFAULT_WORKSPACES,
  automation = DEFAULT_AUTOMATION,
  storage = DEFAULT_STORAGE,
  command = DEFAULT_COMMAND,
}: FeatureBentoProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={ref}
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: reduce ? 0 : 20 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6",
          className
        )}
      >
        <div className="mb-4 flex flex-col gap-1 sm:mb-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </span>
          <h2
            id={titleId}
            className="text-[20px] font-semibold tracking-tight sm:text-[22px]"
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-6 lg:auto-rows-[minmax(160px,auto)]">
          <RevenueTile
            revenue={revenue}
            index={0}
            show={show}
            reduce={reduce}
          />
          <CounterTile
            counter={workspaces}
            index={1}
            show={show}
            reduce={reduce}
          />
          <AutomationTile
            automation={automation}
            index={2}
            show={show}
            reduce={reduce}
          />
          <StorageTile
            storage={storage}
            index={3}
            show={show}
            reduce={reduce}
          />
          <CommandTile
            command={command}
            index={4}
            show={show}
            reduce={reduce}
          />
        </div>
      </motion.section>
    </MotionConfig>
  );
}

export default FeatureBento;
