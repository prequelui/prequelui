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
import { Check, ChevronDown, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Format = "csv" | "json" | "pdf";

const FORMATS: { id: Format; label: string }[] = [
  { id: "csv", label: "CSV" },
  { id: "json", label: "JSON" },
  { id: "pdf", label: "PDF" },
];

const BASE_ROWS = 12480;
const ARCHIVED_ROWS = 622;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type PopoverProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Label on the button that opens the popover. Defaults to "Export". */
  triggerLabel?: string;
  /** Number of rows in the report, before archived rows. Defaults to 12480. */
  rows?: number;
};

type Coords = { top: number; left: number; width: number };

/* ------------------------------------------------------------------ */
/* small switch                                                        */
/* ------------------------------------------------------------------ */

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-[12.5px] text-popover-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
          {hint}
        </span>
      </span>
      <span className="relative mt-0.5 inline-flex h-4 w-7 flex-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-popover",
            checked ? "bg-foreground" : "bg-muted"
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-background shadow-sm transition-[left] duration-200",
            checked ? "left-3.5" : "left-0.5"
          )}
        />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function Popover({
  className,
  title = "Weekly digest",
  description = "Northwind Labs · Product analytics",
  triggerLabel = "Export",
  rows = BASE_ROWS,
}: PopoverProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFormatRef = useRef<HTMLButtonElement | null>(null);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const uid = useId().replace(/:/g, "");
  const panelId = `${uid}-export-popover`;

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [format, setFormat] = useState<Format>("csv");
  const [archived, setArchived] = useState(false);
  const [emailCopy, setEmailCopy] = useState(true);
  const [exported, setExported] = useState(false);

  const totalRows = rows + (archived ? ARCHIVED_ROWS : 0);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const openPanel = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(304, window.innerWidth - 24);
    const left = Math.max(
      12,
      Math.min(rect.right - width, window.innerWidth - width - 12)
    );
    setCoords({ top: rect.bottom + 8, left, width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => firstFormatRef.current?.focus(), 60);

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    const onViewportChange = () => close(false);

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, close]);

  const runExport = () => {
    setExported(true);
    close(true);
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
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p>
          </div>

          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onClick={() => (open ? close(false) : openPanel())}
            className="inline-flex flex-none items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {triggerLabel}
            <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <div className="min-w-0 bg-card px-3 py-3">
            <dt className="truncate text-[11px] text-muted-foreground">Users</dt>
            <dd className="mt-0.5 text-[18px] font-semibold leading-none tracking-tight tabular-nums">
              12,480
            </dd>
          </div>
          <div className="min-w-0 bg-card px-3 py-3">
            <dt className="truncate text-[11px] text-muted-foreground">Sessions</dt>
            <dd className="mt-0.5 text-[18px] font-semibold leading-none tracking-tight tabular-nums">
              38,204
            </dd>
          </div>
          <div className="min-w-0 bg-card px-3 py-3">
            <dt className="truncate text-[11px] text-muted-foreground">Retention</dt>
            <dd className="mt-0.5 text-[18px] font-semibold leading-none tracking-tight tabular-nums">
              61.4%
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px]">
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              exported ? "text-success" : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {exported ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : null}
            {exported
              ? `Exported as ${format.toUpperCase()} · just now`
              : "Last export 2 days ago"}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {BASE_ROWS.toLocaleString("en-US")} rows · 4.1 MB
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && coords ? (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Export weekly digest"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              close(true);
            }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -3 }}
            transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.7 }}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: `calc(100dvh - ${coords.top + 12}px)`,
              transformOrigin: "100% 0%",
            }}
            className="z-50 overflow-y-auto rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">Export weekly digest</p>
                <p className="mt-0.5 text-[11.5px] tabular-nums text-muted-foreground">
                  48 columns · {totalRows.toLocaleString("en-US")} rows
                </p>
              </div>
              <button
                type="button"
                onClick={() => close(true)}
                aria-label="Close export options"
                className="grid h-6 w-6 flex-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div
              role="radiogroup"
              aria-label="File format"
              className="mt-4 inline-flex w-full items-center rounded-lg bg-muted p-1"
            >
              {FORMATS.map((option, index) => {
                const active = format === option.id;
                return (
                  <button
                    key={option.id}
                    ref={index === 0 ? firstFormatRef : undefined}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFormat(option.id)}
                    className={cn(
                      "relative flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`${uid}-format-pill`}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-md bg-popover shadow-sm ring-1 ring-border"
                        transition={{ type: "spring", stiffness: 520, damping: 38 }}
                      />
                    ) : null}
                    <span className="relative">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 divide-y divide-border">
              <ToggleRow
                label="Include archived rows"
                hint={`Adds ${ARCHIVED_ROWS} rows from before June.`}
                checked={archived}
                onChange={setArchived}
              />
              <ToggleRow
                label="Email a copy"
                hint="Sent to Ama Mensah when the file is ready."
                checked={emailCopy}
                onChange={setEmailCopy}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-[11px] text-muted-foreground">
                {emailCopy ? "Delivered by email" : "Download only"}
              </span>
              <button
                type="button"
                onClick={runExport}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export {totalRows.toLocaleString("en-US")} rows
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default Popover;
