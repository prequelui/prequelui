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
  type Variants,
} from "motion/react";
import {
  Archive,
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  Send,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type DropdownMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  icon?: LucideIcon;
  /** A rule is drawn above this item. */
  separatorBefore?: boolean;
  /** Status shown in the card once selected. Defaults to "<label> · just now". */
  feedback?: string;
  tone?: "default" | "destructive";
};

export type DropdownMenuProps = {
  className?: string;
  title?: string;
  description?: string;
  items?: DropdownMenuItem[];
};

type Coords = { top: number; left: number; width: number };

/* ------------------------------------------------------------------ */
/* demo data                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: DropdownMenuItem[] = [
  { id: "view", label: "View invoice", shortcut: "↵", icon: Eye },
  { id: "download", label: "Download PDF", shortcut: "⌘D", icon: Download },
  { id: "remind", label: "Send reminder", icon: Send },
  { id: "duplicate", label: "Duplicate invoice", icon: Copy },
  {
    id: "archive",
    label: "Archive",
    icon: Archive,
    separatorBefore: true,
    feedback: "Archived · just now",
  },
  {
    id: "delete",
    label: "Delete invoice",
    icon: Trash2,
    tone: "destructive",
    feedback: "Deletion requested",
  },
];

const panelVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
    y: -4,
    transition: { duration: 0.12, ease: EASE },
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 430,
      damping: 32,
      mass: 0.7,
      staggerChildren: 0.028,
      delayChildren: 0.015,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5, transition: { duration: 0.1, ease: EASE } },
  show: { opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE } },
};

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function DropdownMenu({
  className,
  title = "Invoice INV-2049",
  description = "Sable Systems · €3,840.00",
  items = DEFAULT_ITEMS,
}: DropdownMenuProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const inView = useInView(cardRef, { once: true, margin: "-10% 0px" });
  const uid = useId().replace(/:/g, "");
  const menuId = `${uid}-invoice-menu`;

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [hovered, setHovered] = useState(-1);
  const [focused, setFocused] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const safeItems = items.length > 0 ? items : DEFAULT_ITEMS;
  const activeIndex = hovered >= 0 ? hovered : focused;
  const menuWidth = 236;

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setHovered(-1);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const openMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(menuWidth, window.innerWidth - 24);
    const left = Math.max(
      12,
      Math.min(rect.right - width, window.innerWidth - width - 12)
    );
    const top = rect.bottom + 6;
    setCoords({
      top,
      left,
      width,
      // keep the panel inside the viewport on short screens
    });
    setHovered(-1);
    setFocused(0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => itemRefs.current[0]?.focus(), 60);

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
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
    window.addEventListener("scroll", onViewportChange);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange);
    };
  }, [open, close]);

  const moveFocus = (next: number) => {
    const count = safeItems.length;
    const index = ((next % count) + count) % count;
    setHovered(-1);
    itemRefs.current[index]?.focus();
    setFocused(index);
  };

  const select = (item: DropdownMenuItem) => {
    setLastAction(item.feedback ?? `${item.label} · just now`);
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
            aria-label="Invoice actions"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={() => (open ? close(false) : openMenu())}
            className="grid h-8 w-8 flex-none place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-5 space-y-2.5 text-[12.5px]">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2.5">
            <dt className="text-muted-foreground">Issued</dt>
            <dd className="tabular-nums">4 Nov 2026</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2.5">
            <dt className="text-muted-foreground">Due</dt>
            <dd className="tabular-nums">18 Nov 2026</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Terms</dt>
            <dd className="tabular-nums">Net 14 · EUR</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-3 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            Paid 6 Nov via bank transfer
          </span>
          <span
            className={cn(
              "tabular-nums",
              lastAction ? "text-foreground" : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {lastAction ?? "No action yet"}
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && coords ? (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Invoice actions"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={panelVariants}
            onPointerLeave={() => setHovered(-1)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveFocus(focused + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveFocus(focused - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                moveFocus(0);
              } else if (event.key === "End") {
                event.preventDefault();
                moveFocus(safeItems.length - 1);
              } else if (event.key === "Escape") {
                event.preventDefault();
                close(true);
              } else if (event.key === "Tab") {
                event.preventDefault();
                close(true);
              }
            }}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transformOrigin: "100% 0%",
            }}
            className="z-50 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
          >
            <div className="px-2 pb-1.5 pt-1 text-[11px] text-muted-foreground">
              INV-2049 · Sable Systems
            </div>

            {safeItems.map((item, index) => {
              const Icon = item.icon;
              const highlighted = activeIndex === index;
              const destructive = item.tone === "destructive";

              return (
                <div key={item.id}>
                  {item.separatorBefore ? (
                    <div role="separator" className="my-1 h-px bg-border" />
                  ) : null}
                  <motion.button
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    type="button"
                    role="menuitem"
                    variants={itemVariants}
                    onPointerEnter={() => setHovered(index)}
                    onFocus={() => setFocused(index)}
                    onClick={() => select(item)}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      destructive ? "text-destructive" : "text-popover-foreground"
                    )}
                  >
                    {highlighted ? (
                      <motion.span
                        layoutId={`${uid}-menu-highlight`}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-md bg-muted"
                        transition={{ type: "spring", stiffness: 540, damping: 38 }}
                      />
                    ) : null}
                    {Icon ? (
                      <Icon
                        className={cn(
                          "relative h-3.5 w-3.5 flex-none",
                          destructive ? "text-destructive" : "text-muted-foreground"
                        )}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
                    {item.shortcut ? (
                      <span className="relative text-[10.5px] tabular-nums text-muted-foreground">
                        {item.shortcut}
                      </span>
                    ) : null}
                  </motion.button>
                </div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default DropdownMenu;
