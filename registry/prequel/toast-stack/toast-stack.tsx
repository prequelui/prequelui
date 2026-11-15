"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Bell, CircleCheck, CircleX, Info, Plus, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type ToastStackTone = "success" | "info" | "warning" | "error";

export type ToastStackItem = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastStackTone;
  /** Static timestamp, e.g. "2 min ago". */
  time?: string;
};

export type ToastStackProps = {
  className?: string;
  title?: string;
  description?: string;
  initialToasts?: ToastStackItem[];
  /** Notifications used by the "New" button, in order. */
  queue?: Omit<ToastStackItem, "id">[];
  /** How long a toast stays before the oldest one leaves. Defaults to 9000 ms. */
  autoDismissMs?: number;
  /** Most cards kept in the stack. Defaults to 4. */
  max?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_TOASTS: ToastStackItem[] = [
  {
    id: "deploy",
    title: "Deploy finished",
    description: "api@2026.11.15 is live in production.",
    tone: "success",
    time: "just now",
  },
  {
    id: "comment",
    title: "New comment",
    description: "Mei Tanaka replied on the billing thread.",
    tone: "info",
    time: "2 min ago",
  },
  {
    id: "retry",
    title: "Retry queued",
    description: "Webhook to Kite & Co failed twice.",
    tone: "warning",
    time: "6 min ago",
  },
];

const DEFAULT_QUEUE: Omit<ToastStackItem, "id">[] = [
  {
    title: "Invoice #4021 paid",
    description: "$1,284.00 from Bluebird Studio.",
    tone: "success",
    time: "just now",
  },
  {
    title: "Member invited",
    description: "priya@halocloud.io can review billing.",
    tone: "info",
    time: "just now",
  },
  {
    title: "Build #184 failed",
    description: "Type error in the pricing page.",
    tone: "error",
    time: "just now",
  },
  {
    title: "Usage at 86%",
    description: "Sable Systems is close to its seat cap.",
    tone: "warning",
    time: "just now",
  },
];

/* ------------------------------------------------------------------ */
/* tone styling                                                        */
/* ------------------------------------------------------------------ */

const TONES: Record<
  ToastStackTone,
  { icon: typeof CircleCheck; iconClass: string; borderClass: string }
> = {
  success: {
    icon: CircleCheck,
    iconClass: "bg-success/10 text-success",
    borderClass: "border-success/25",
  },
  info: {
    icon: Info,
    iconClass: "bg-muted text-foreground",
    borderClass: "border-border",
  },
  warning: {
    icon: TriangleAlert,
    iconClass: "bg-muted text-foreground",
    borderClass: "border-border",
  },
  error: {
    icon: CircleX,
    iconClass: "bg-destructive/10 text-destructive",
    borderClass: "border-destructive/25",
  },
};

/* ------------------------------------------------------------------ */
/* one toast card                                                      */
/* ------------------------------------------------------------------ */

function ToastCard({
  toast,
  front,
  onDismiss,
}: {
  toast: ToastStackItem;
  front: boolean;
  onDismiss: (id: string) => void;
}) {
  const tone = TONES[toast.tone ?? "info"];
  const Icon = tone.icon;

  return (
    <div
      className={cn(
        "flex h-full min-w-0 items-start gap-3 rounded-lg border bg-card p-3 shadow-sm",
        tone.borderClass
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
          tone.iconClass
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[12.5px] font-medium text-foreground">
            {toast.title}
          </p>
          <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
            {toast.time ?? "just now"}
          </span>
        </div>
        {toast.description ? (
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {toast.description}
          </p>
        ) : null}
      </div>

      {front ? (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label={`Dismiss ${toast.title}`}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span aria-hidden="true" className="h-6 w-6 shrink-0" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function ToastStack({
  className,
  title = "Notifications",
  description = "New events stack on top and leave after nine seconds.",
  initialToasts = DEFAULT_TOASTS,
  queue = DEFAULT_QUEUE,
  autoDismissMs = 9000,
  max = 4,
}: ToastStackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const safeMax = Math.max(1, max);
  const [toasts, setToasts] = useState<ToastStackItem[]>(() =>
    initialToasts.slice(0, safeMax)
  );
  const added = useRef(0);
  const [paused, setPaused] = useState(false);

  const safeQueue = queue.length > 0 ? queue : DEFAULT_QUEUE;

  useEffect(() => {
    if (paused || autoDismissMs <= 0 || toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(0, -1));
    }, Math.max(1200, autoDismissMs));
    return () => window.clearTimeout(timer);
  }, [paused, autoDismissMs, toasts.length]);

  const addToast = () => {
    const index = added.current;
    added.current = index + 1;
    const next = safeQueue[index % safeQueue.length];
    if (!next) return;
    setToasts((current) =>
      [{ ...next, id: `queued-${index}` }, ...current].slice(0, safeMax)
    );
  };

  const dismiss = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const visible = toasts.slice(0, safeMax);
  const stackHeight =
    visible.length === 0 ? 92 : 76 + (Math.min(visible.length, safeMax) - 1) * 10;

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

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={addToast}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[11.5px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              New
            </button>
            <button
              type="button"
              onClick={() => setToasts([])}
              disabled={toasts.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
            >
              Clear
            </button>
          </div>
        </div>

        <div
          className="mt-5"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setPaused(false);
            }
          }}
        >
          <div
            role="region"
            aria-live="polite"
            aria-label="Notifications"
            className="relative transition-[height] duration-300 ease-out motion-reduce:transition-none"
            style={{ height: reduce ? undefined : stackHeight }}
          >
            <AnimatePresence initial={false}>
              {visible.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                  className="flex h-[92px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center"
                >
                  <Bell aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[12px] text-muted-foreground">
                    All caught up. New events land here.
                  </p>
                </motion.div>
              ) : reduce ? (
                <ul key="flow" className="flex flex-col gap-2">
                  {visible.map((toast) => (
                    <li key={toast.id} className="h-[76px]">
                      <ToastCard toast={toast} front onDismiss={dismiss} />
                    </li>
                  ))}
                </ul>
              ) : (
                visible.map((toast, index) => (
                  <motion.div
                    key={toast.id}
                    className="absolute inset-x-0 top-0 h-[76px]"
                    style={{ zIndex: visible.length - index }}
                    aria-hidden={index > 0 ? "true" : undefined}
                    initial={{ opacity: 0, y: -16, scale: 0.97 }}
                    animate={{
                      opacity: 1,
                      y: index * 10,
                      scale: 1 - Math.min(index, 3) * 0.018,
                    }}
                    exit={{
                      opacity: 0,
                      x: 24,
                      transition: { duration: 0.2, ease: EASE },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 340,
                      damping: 32,
                      mass: 0.8,
                      opacity: { duration: 0.22, ease: EASE },
                    }}
                  >
                    <div
                      className={cn(
                        "h-full",
                        index === 0 ? "" : "pointer-events-none"
                      )}
                    >
                      <ToastCard
                        toast={toast}
                        front={index === 0}
                        onDismiss={dismiss}
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                paused ? "bg-muted-foreground" : "bg-success"
              )}
            />
            {paused ? "Paused while you are here" : `${visible.length} of ${safeMax} in the stack`}
          </span>
          <span className="tabular-nums text-[11px] text-muted-foreground">
            {autoDismissMs > 0
              ? `auto-dismiss ${Math.round(autoDismissMs / 1000)} s`
              : "kept until dismissed"}
          </span>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default ToastStack;
