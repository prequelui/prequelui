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
} from "motion/react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type DialogProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Members in the workspace, shown in the summary and the dialog. */
  members?: number;
  projects?: number;
  apiKeys?: number;
  /** Word the user has to type before deleting. Defaults to "northwind". */
  confirmationWord?: string;
};

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function Dialog({
  className,
  title = "Danger zone",
  description = "These actions affect everyone in Northwind Labs.",
  members = 8,
  projects = 42,
  apiKeys = 3,
  confirmationWord = "northwind",
}: DialogProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const uid = useId().replace(/:/g, "");
  const titleId = `${uid}-dialog-title`;
  const bodyId = `${uid}-dialog-body`;

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleted, setDeleted] = useState(false);

  const matches = confirm.trim().toLowerCase() === confirmationWord.toLowerCase();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);

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

  const openDialog = () => {
    setConfirm("");
    setOpen(true);
  };

  const confirmDelete = () => {
    if (!matches) return;
    setDeleted(true);
    setConfirm("");
    setOpen(false);
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
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <span className="rounded-md border border-destructive/25 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
            Restricted
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <div className="min-w-0 bg-card px-3 py-3">
            <dt className="truncate text-[11px] text-muted-foreground">Members</dt>
            <dd className="mt-0.5 text-[18px] font-semibold leading-none tracking-tight tabular-nums">
              {members}
            </dd>
          </div>
          <div className="min-w-0 bg-card px-3 py-3">
            <dt className="truncate text-[11px] text-muted-foreground">Projects</dt>
            <dd className="mt-0.5 text-[18px] font-semibold leading-none tracking-tight tabular-nums">
              {projects}
            </dd>
          </div>
          <div className="min-w-0 bg-card px-3 py-3">
            <dt className="truncate text-[11px] text-muted-foreground">API keys</dt>
            <dd className="mt-0.5 text-[18px] font-semibold leading-none tracking-tight tabular-nums">
              {apiKeys}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0 max-w-[34ch]">
            <p className="text-[13px] font-medium">Delete workspace</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              Remove {projects} projects, {apiKeys} API keys and every member&apos;s access.
            </p>
          </div>
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={deleted}
            onClick={openDialog}
            className="inline-flex flex-none items-center rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleted ? "Deletion scheduled" : "Delete workspace"}
          </button>
        </div>

        <AnimatePresence>
          {deleted ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-[11.5px]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Deletion scheduled · restored for 24 hours
                </span>
                <button
                  type="button"
                  onClick={() => setDeleted(false)}
                  className="rounded font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Undo
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
            className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-background/85 p-4 sm:items-center sm:p-6"
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={bodyId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 430, damping: 32, mass: 0.7 }}
              className="relative w-[min(28rem,100%)] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:p-6"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close dialog"
                className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <h2
                id={titleId}
                className="max-w-[24ch] text-[17px] font-semibold tracking-[-0.01em]"
              >
                Delete Northwind Labs?
              </h2>
              <p
                id={bodyId}
                className="mt-2 max-w-[46ch] text-[12.5px] leading-relaxed text-muted-foreground"
              >
                This removes {projects} projects, {apiKeys} API keys and every member&apos;s
                access. Deleted workspaces can be restored for 24 hours from the audit log.
              </p>

              <label className="mt-5 block text-[12px] font-medium" htmlFor={`${uid}-confirm`}>
                Type{" "}
                <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  {confirmationWord}
                </span>{" "}
                to confirm
              </label>
              <input
                ref={inputRef}
                id={`${uid}-confirm`}
                type="text"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") confirmDelete();
                }}
                placeholder={confirmationWord}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className={cn(
                  "mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring",
                  matches ? "border-success/60" : "border-border"
                )}
              />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">
                  All {members} members will be notified.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!matches}
                    onClick={confirmDelete}
                    className="rounded-md bg-destructive px-3 py-1.5 text-[12px] font-medium text-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete workspace
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default Dialog;
