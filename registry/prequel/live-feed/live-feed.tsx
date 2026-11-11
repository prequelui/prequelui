"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  CreditCard,
  Pause,
  Play,
  RotateCcw,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type LiveFeedEventType = "signup" | "upgrade" | "payment" | "refund";

export type LiveFeedEvent = {
  id: string;
  type: LiveFeedEventType;
  /** Person or company name. */
  name: string;
  /** Short description of what happened, e.g. "Started the Growth plan". */
  detail: string;
  /** Positive amount in currency units; the sign is implied by the type. */
  amount?: number;
};

export type LiveFeedProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Seconds between events. Defaults to 3. */
  interval?: number;
  /** Maximum number of events kept visible. Defaults to 6. */
  maxItems?: number;
  /** Deterministic list of events, cycled in order. */
  events?: LiveFeedEvent[];
  formatAmount?: (amount: number) => string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now at module load)  */
/* ------------------------------------------------------------------ */

const DEFAULT_EVENTS: LiveFeedEvent[] = [
  { id: "e01", type: "payment", name: "Tidewell Health", detail: "Paid invoice #3380", amount: 3380 },
  { id: "e02", type: "signup", name: "Lumio Labs", detail: "Started the Growth plan" },
  { id: "e03", type: "upgrade", name: "Parcel & Pine", detail: "Upgraded to Scale", amount: 240 },
  { id: "e04", type: "refund", name: "Sofia Rossi", detail: "Refunded the Starter plan", amount: 290 },
  { id: "e05", type: "payment", name: "Kestrel Analytics", detail: "Paid invoice #2890", amount: 2890 },
  { id: "e06", type: "signup", name: "Verdant", detail: "Started the Starter plan" },
  { id: "e07", type: "upgrade", name: "Quillfeather", detail: "Added 6 seats", amount: 84 },
  { id: "e08", type: "payment", name: "Brightloom", detail: "Paid invoice #4120", amount: 4120 },
  { id: "e09", type: "refund", name: "Liam O'Connor", detail: "Refunded the Growth plan", amount: 1180 },
  { id: "e10", type: "signup", name: "Coralline", detail: "Started the Scale plan" },
  { id: "e11", type: "upgrade", name: "Fernway", detail: "Upgraded to Growth", amount: 99 },
  { id: "e12", type: "payment", name: "Mosaic HR", detail: "Paid invoice #1720", amount: 1720 },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const TYPE_META: Record<
  LiveFeedEventType,
  { icon: LucideIcon; iconClass: string; prefix: string; amountClass: string }
> = {
  signup: {
    icon: UserPlus,
    iconClass: "text-muted-foreground",
    prefix: "",
    amountClass: "text-foreground",
  },
  upgrade: {
    icon: TrendingUp,
    iconClass: "text-success",
    prefix: "+",
    amountClass: "text-foreground",
  },
  payment: {
    icon: CreditCard,
    iconClass: "text-foreground",
    prefix: "",
    amountClass: "text-foreground",
  },
  refund: {
    icon: RotateCcw,
    iconClass: "text-destructive",
    prefix: "−",
    amountClass: "text-muted-foreground",
  },
};

function defaultFormatAmount(amount: number) {
  return "$" + Math.abs(amount).toLocaleString("en-US");
}

function relativeTime(ageSeconds: number) {
  const s = Math.max(0, Math.round(ageSeconds));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type FeedItem = {
  key: string;
  type: LiveFeedEventType;
  name: string;
  detail: string;
  amount?: number;
  /** Seconds relative to mount (negative for seeded history). */
  arrivedAt: number;
};

/** Seeded "history" so the feed looks alive before the first live event. */
const INITIAL_AGES = [3, 40, 95, 210, 480, 920];

function buildInitial(events: LiveFeedEvent[], maxItems: number): FeedItem[] {
  const items: FeedItem[] = [];
  const len = events.length;
  if (len === 0) return items;
  const n = Math.min(maxItems, INITIAL_AGES.length);
  for (let i = 0; i < n; i++) {
    const ev = events[(len - 1 - i + len) % len];
    items.push({
      key: `${ev.id}-init-${i}`,
      type: ev.type,
      name: ev.name,
      detail: ev.detail,
      amount: ev.amount,
      arrivedAt: -INITIAL_AGES[i],
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function LiveFeed({
  className,
  title = "Live activity",
  description = "Signups, upgrades and payments as they happen.",
  interval = 3,
  maxItems = 6,
  events = DEFAULT_EVENTS,
  formatAmount = defaultFormatAmount,
}: LiveFeedProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const safeMax = Math.max(1, maxItems);

  const [items, setItems] = useState<FeedItem[]>(() =>
    buildInitial(events, safeMax)
  );
  const [now, setNow] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const nowRef = useRef(0);
  const cursorRef = useRef(0);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const maxItemsRef = useRef(safeMax);
  maxItemsRef.current = safeMax;

  const paused = userPaused || hovered || focused;
  const running = !paused && !reduce;

  const intervalMs = Math.max(1, interval) * 1000;

  /* clock: keeps relative timestamps ticking (paused on hover/focus). */
  useEffect(() => {
    if (!show || paused) return;
    const id = window.setInterval(() => {
      nowRef.current += 1;
      setNow(nowRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [show, paused]);

  /* feed: a new event lands at the top every `interval` seconds. */
  useEffect(() => {
    if (!show || paused) return;
    const id = window.setInterval(() => {
      const list = eventsRef.current;
      if (list.length === 0) return;
      const ev = list[cursorRef.current % list.length];
      cursorRef.current += 1;
      const key = `${ev.id}-${cursorRef.current}`;
      setItems((prev) => {
        const item: FeedItem = {
          key,
          type: ev.type,
          name: ev.name,
          detail: ev.detail,
          amount: ev.amount,
          arrivedAt: nowRef.current,
        };
        return [item, ...prev].slice(0, maxItemsRef.current);
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [show, paused, intervalMs]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={(e) => {
          if (e.currentTarget.contains(e.target as Node)) setFocused(true);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setFocused(false);
          }
        }}
        className={cn(
          "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight">
                {title}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  {running ? (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-success"
                      animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative h-1.5 w-1.5 rounded-full",
                      paused ? "bg-muted-foreground" : "bg-success"
                    )}
                  />
                </span>
                Live
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? "Resume live feed" : "Pause live feed"}
            aria-pressed={userPaused}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {userPaused ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* feed */}
        <ul aria-live="polite" className="border-t border-border">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              const age = now - item.arrivedAt;
              return (
                <motion.li
                  key={item.key}
                  layout
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          layout: { duration: 0.4, ease: EASE },
                          opacity: { duration: 0.3, ease: EASE },
                          y: { duration: 0.4, ease: EASE },
                        }
                  }
                  className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0 sm:px-6"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted">
                    <Icon className={cn("h-4 w-4", meta.iconClass)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {item.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.detail}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 pl-2">
                    {item.amount != null ? (
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          meta.amountClass
                        )}
                      >
                        {meta.prefix}
                        {formatAmount(item.amount)}
                      </span>
                    ) : null}
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {relativeTime(age)}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </motion.section>
    </MotionConfig>
  );
}

export default LiveFeed;
