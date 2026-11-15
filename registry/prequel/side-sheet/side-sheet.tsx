"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Check, ChevronRight, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type Deployment = {
  id: string;
  environment: string;
  time: string;
  status: "Live" | "Ready" | "Expired";
};

export type SideSheetProps = {
  className?: string;
  title?: string;
  description?: string;
  deployments?: Deployment[];
  /** Commit SHA shown in the sheet and copied by the footer button. */
  commit?: string;
};

/* ------------------------------------------------------------------ */
/* demo data                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_DEPLOYMENTS: Deployment[] = [
  { id: "4f2c1a", environment: "Production", time: "6 minutes ago", status: "Live" },
  { id: "9b81e3", environment: "Staging", time: "2 hours ago", status: "Ready" },
  { id: "c07d44", environment: "Preview", time: "Yesterday", status: "Expired" },
];

const STEPS = [
  { label: "Installed dependencies", duration: "18s" },
  { label: "Built application", duration: "51s" },
  { label: "Uploaded edge assets", duration: "12s" },
  { label: "Promoted to production", duration: "21s" },
];

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function SideSheet({
  className,
  title = "Deployments",
  description = "main · Northwind Labs",
  deployments = DEFAULT_DEPLOYMENTS,
  commit = "a91f0c2",
}: SideSheetProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const copyTimer = useRef<number | null>(null);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const uid = useId().replace(/:/g, "");
  const titleId = `${uid}-sheet-title`;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rolledBack, setRolledBack] = useState(false);

  const list = deployments.length > 0 ? deployments : DEFAULT_DEPLOYMENTS;
  const current = list[0];

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
        ?.focus();
    }, 90);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const copyCommit = () => {
    const showCopied = () => {
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(commit).then(showCopied, showCopied);
    } else {
      showCopied();
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-6",
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p>
          </div>
          <span className="rounded-md border border-border px-2 py-1 text-[11px] tabular-nums text-muted-foreground">
            3 this week
          </span>
        </div>

        <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {list.map((deployment, index) => {
            const isCurrent = index === 0;
            const live = deployment.status === "Live" || deployment.status === "Ready";
            const rowClass = cn(
              "flex w-full items-center gap-3 px-3 py-2.5 text-left",
              isCurrent
                ? "transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                : "text-muted-foreground"
            );
            const content = (
              <>
                <span
                  className={cn(
                    "h-1.5 w-1.5 flex-none rounded-full",
                    live ? "bg-success" : "bg-muted-foreground/40"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="break-all font-mono text-[12.5px] text-foreground">
                      {deployment.id}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">
                      {deployment.environment}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {deployment.time}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex-none text-[11px]",
                    live ? "text-success" : "text-muted-foreground"
                  )}
                >
                  {deployment.status}
                </span>
                {isCurrent ? (
                  <>
                    <span className="hidden flex-none text-[11px] font-medium text-foreground sm:inline">
                      View log
                    </span>
                    <ChevronRight
                      className="h-3.5 w-3.5 flex-none text-muted-foreground"
                      aria-hidden="true"
                    />
                  </>
                ) : null}
              </>
            );

            return isCurrent ? (
              <button
                key={deployment.id}
                ref={triggerRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => {
                  setRolledBack(false);
                  setOpen(true);
                }}
                className={rowClass}
              >
                {content}
              </button>
            ) : (
              <div key={deployment.id} className={rowClass}>
                {content}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Last deploy {current.time} · rollback window open for 24 hours.
        </p>
      </motion.div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
            className="fixed inset-0 z-50 flex justify-end bg-background/70"
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36, mass: 0.9 }}
              className="flex h-dvh w-[min(24rem,100vw)] flex-col border-l border-border bg-card text-card-foreground shadow-2xl outline-none"
            >
              <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                    Live in production
                  </p>
                  <h2
                    id={titleId}
                    className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold tracking-[-0.01em]"
                  >
                    Deployment
                    <span className="break-all font-mono text-[13px] font-medium text-muted-foreground">
                      {current.id}
                    </span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close deployment log"
                  className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
                  <div className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">Environment</dt>
                    <dd className="mt-0.5">Production</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">Duration</dt>
                    <dd className="mt-0.5 tabular-nums">1m 42s</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">Branch</dt>
                    <dd className="mt-0.5 font-mono text-[11.5px]">main</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">Commit</dt>
                    <dd className="mt-0.5 font-mono text-[11.5px]">{commit}</dd>
                  </div>
                </dl>

                <p className="mt-5 text-[11.5px] text-muted-foreground">Build steps</p>
                <ol className="mt-2 space-y-4">
                  {STEPS.map((step, index) => (
                    <motion.li
                      key={step.label}
                      initial={reduce ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.35,
                        ease: EASE,
                        delay: reduce ? 0 : 0.12 + index * 0.06,
                      }}
                      className="relative pl-6"
                    >
                      {index < STEPS.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-[-16px] left-[3px] top-2 w-px bg-border"
                        />
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0.5 grid h-2 w-2 place-items-center rounded-full border border-success bg-card"
                      >
                        <span className="h-1 w-1 rounded-full bg-success" />
                      </span>
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-[12.5px]">{step.label}</span>
                        <span className="flex-none text-[11px] tabular-nums text-muted-foreground">
                          {step.duration}
                        </span>
                      </span>
                    </motion.li>
                  ))}
                </ol>

                <div className="mt-5 flex items-center gap-2.5 border-t border-border pt-4">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-muted text-[11px] font-medium">
                    LF
                  </span>
                  <div className="min-w-0 text-[11.5px]">
                    <p className="truncate text-foreground">Lucas Ferreira</p>
                    <p className="text-muted-foreground">Deployed 6 minutes ago</p>
                  </div>
                </div>

                <AnimatePresence>
                  {rolledBack ? (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="mt-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-[11.5px] text-muted-foreground"
                    >
                      Rollback queued · {current.id} → 9b81e3
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border p-4">
                <button
                  type="button"
                  onClick={copyCommit}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy SHA"}
                </button>
                <button
                  type="button"
                  disabled={rolledBack}
                  onClick={() => setRolledBack(true)}
                  className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rolledBack ? "Rollback queued" : "Roll back"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default SideSheet;
