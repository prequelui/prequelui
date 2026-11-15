"use client";

import { Fragment, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
} from "motion/react";
import {
  Bold,
  Command,
  Italic,
  Link2,
  MessageSquare,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type TooltipAction = {
  id: string;
  /** Short label shown inside the tooltip. */
  label: string;
  /** Keyboard hint, e.g. "⌘B". */
  shortcut?: string;
  icon?: LucideIcon;
};

export type TooltipProps = {
  className?: string;
  title?: string;
  description?: string;
  actions?: TooltipAction[];
  /** Which side of each action the tooltip grows from. Defaults to "top". */
  side?: "top" | "bottom";
};

/* ------------------------------------------------------------------ */
/* demo data                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_ACTIONS: TooltipAction[] = [
  { id: "bold", label: "Bold", shortcut: "⌘B", icon: Bold },
  { id: "italic", label: "Italic", shortcut: "⌘I", icon: Italic },
  { id: "link", label: "Add link", shortcut: "⌘K", icon: Link2 },
  { id: "comment", label: "Comment", shortcut: "⌘M", icon: MessageSquare },
  { id: "undo", label: "Undo", shortcut: "⌘Z", icon: Undo2 },
];

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function Tooltip({
  className,
  title = "Quick actions",
  description = "Format the selected sentence without leaving the keyboard.",
  actions = DEFAULT_ACTIONS,
  side = "top",
}: TooltipProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const uid = useId().replace(/:/g, "");
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [status, setStatus] = useState("Selection · 38 words");

  const active = hovered ?? focused;
  const safeActions = actions.length > 0 ? actions : DEFAULT_ACTIONS;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
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
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <span className="flex flex-none items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            Draft saved
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
            <span>Inventory memo · Q4</span>
            <span className="tabular-nums">Edited 4 min ago</span>
          </div>

          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            We are moving the warehouse cut-off to{" "}
            <span className="rounded bg-muted px-1 py-0.5 font-medium text-foreground">
              Thursday, 18:00
            </span>{" "}
            so the December batch clears before the holiday window.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div
              role="toolbar"
              aria-label="Selection actions"
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-sm"
            >
              {safeActions.map((action, index) => {
                const Icon = action.icon ?? Command;
                const visible = active === action.id;
                const tipId = `${uid}-${action.id}-tip`;

                return (
                  <Fragment key={action.id}>
                    {index === 3 ? (
                      <span
                        aria-hidden="true"
                        className="mx-1 h-5 w-px self-center bg-border"
                      />
                    ) : null}
                    <span className="relative inline-flex">
                    <button
                      type="button"
                      aria-label={action.label}
                      aria-describedby={visible ? tipId : undefined}
                      onPointerEnter={() => setHovered(action.id)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => setFocused(action.id)}
                      onBlur={() => setFocused(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.currentTarget.blur();
                        }
                      }}
                      onClick={() => setStatus(`${action.label} applied`)}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <AnimatePresence>
                      {visible ? (
                        <span
                          className={cn(
                            "pointer-events-none absolute left-1/2 z-30 -translate-x-1/2",
                            side === "top"
                              ? "bottom-full mb-2"
                              : "top-full mt-2"
                          )}
                        >
                          <motion.span
                            role="tooltip"
                            id={tipId}
                            initial={{
                              opacity: 0,
                              scale: 0.82,
                              y: side === "top" ? 4 : -4,
                            }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{
                              opacity: 0,
                              scale: 0.9,
                              y: side === "top" ? 2 : -2,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 480,
                              damping: 32,
                              mass: 0.6,
                            }}
                            style={{
                              transformOrigin:
                                side === "top" ? "50% 100%" : "50% 0%",
                            }}
                            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-foreground px-2.5 py-1.5 text-[11.5px] font-medium text-background shadow-lg"
                          >
                            {action.label}
                            {action.shortcut ? (
                              <kbd className="rounded border border-background/25 px-1 py-px font-sans text-[10px] font-normal text-background/70">
                                {action.shortcut}
                              </kbd>
                            ) : null}
                          </motion.span>
                        </span>
                      ) : null}
                    </AnimatePresence>
                    </span>
                  </Fragment>
                );
              })}
            </div>

            <span className="text-[11.5px] text-muted-foreground" aria-live="polite">
              {status}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
          <span>Shortcuts match the desktop editor.</span>
          <span>
            <kbd className="rounded border border-border px-1 py-px text-[10px]">Tab</kbd>{" "}
            to focus ·{" "}
            <kbd className="rounded border border-border px-1 py-px text-[10px]">Esc</kbd>{" "}
            to dismiss
          </span>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default Tooltip;
