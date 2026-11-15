"use client";

import { useId, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const BAR_SPRING = { type: "spring", stiffness: 260, damping: 32 } as const;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type SpringCheckboxItem = {
  id: string;
  label: string;
  /** Optional small line under the label, e.g. an owner or a due day. */
  detail?: string;
  defaultDone?: boolean;
};

export type SpringCheckboxProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  items?: SpringCheckboxItem[];
  /** Called with the item id and its new state. */
  onChange?: (id: string, done: boolean) => void;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: SpringCheckboxItem[] = [
  {
    id: "dns",
    label: "Move DNS to the new nameservers",
    detail: "Kite & Co · due Monday",
    defaultDone: true,
  },
  {
    id: "beta",
    label: "Invite the 12 beta accounts",
    detail: "Ama Mensah · due Tuesday",
    defaultDone: true,
  },
  {
    id: "tour",
    label: "Record the 90-second product tour",
    detail: "Lucas Ferreira · due Wednesday",
  },
  {
    id: "rollback",
    label: "Write the rollback note",
    detail: "Jonas Weber · due Thursday",
  },
  {
    id: "rehearsal",
    label: "Schedule the status-page rehearsal",
    detail: "Priya Nair · due Friday",
  },
];

/* ------------------------------------------------------------------ */
/* row                                                                 */
/* ------------------------------------------------------------------ */

type RowProps = {
  item: SpringCheckboxItem;
  index: number;
  done: boolean;
  show: boolean;
  reduce: boolean;
  onToggle: (item: SpringCheckboxItem) => void;
};

function CheckRow({ item, index, done, show, reduce, onToggle }: RowProps) {
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 8 }}
      transition={{
        duration: reduce ? 0 : 0.42,
        ease: EASE,
        delay: reduce ? 0 : index * 0.045,
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        onClick={() => onToggle(item)}
        className="group flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-[background-color,border-color,transform] duration-200 group-active:scale-90",
            done
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-transparent group-hover:border-muted-foreground/50"
          )}
        >
          <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
            <motion.path
              d="M2.4 6.2 4.9 8.6 9.6 3.4"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.28, ease: EASE }
              }
            />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "text-[14px] leading-5 tracking-[-0.01em] transition-colors duration-200",
              done
                ? "text-muted-foreground line-through decoration-muted-foreground/50"
                : "text-foreground"
            )}
          >
            {item.label}
          </span>
          {item.detail ? (
            <span
              className={cn(
                "mt-0.5 block text-[12px] leading-4 transition-colors duration-200",
                done ? "text-muted-foreground/60" : "text-muted-foreground"
              )}
            >
              {item.detail}
            </span>
          ) : null}
        </span>
      </button>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function SpringCheckbox({
  className,
  title = "Launch checklist",
  subtitle = "Release 2.4 · ships Friday at 14:00.",
  items = DEFAULT_ITEMS,
  onChange,
}: SpringCheckboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = reduce || inView;

  const uid = useId().replace(/:/g, "");

  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.defaultDone ?? false]))
  );

  const isDone = (item: SpringCheckboxItem) => state[item.id] ?? false;
  const doneCount = items.filter(isDone).length;
  const ratio = items.length === 0 ? 0 : doneCount / items.length;

  const toggle = (item: SpringCheckboxItem) => {
    const next = !isDone(item);
    setState((current) => ({ ...current, [item.id]: next }));
    onChange?.(item.id, next);
  };

  const clearCompleted = () => {
    setState(
      Object.fromEntries(items.map((item) => [item.id, false]))
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={rootRef}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={
          show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 16 }
        }
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2
                id={`${uid}-title`}
                className="text-[15px] font-semibold tracking-tight"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {subtitle}
              </p>
            </div>
            <p className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
              <span className="text-[15px] font-semibold text-foreground">
                {doneCount}
              </span>{" "}
              / {items.length} done
            </p>
          </div>

          <div
            aria-hidden="true"
            className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted"
          >
            <motion.span
              initial={false}
              animate={{ scaleX: ratio }}
              transition={reduce ? { duration: 0 } : BAR_SPRING}
              className="block h-full w-full origin-left rounded-full bg-foreground/80"
            />
          </div>

          {items.length > 0 ? (
            <ul className="mt-2" aria-labelledby={`${uid}-title`}>
              {items.map((item, index) => (
                <CheckRow
                  key={item.id}
                  item={item}
                  index={index}
                  done={isDone(item)}
                  show={show}
                  reduce={reduce}
                  onToggle={toggle}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-[13px] text-muted-foreground">
              Nothing left to check off.
            </p>
          )}

          <AnimatePresence initial={false}>
            {doneCount > 0 ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="flex justify-end border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={clearCompleted}
                    className="rounded-sm text-[12.5px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear completed
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default SpringCheckbox;
