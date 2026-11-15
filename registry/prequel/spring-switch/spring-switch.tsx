"use client";

import { useId, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const KNOB_SPRING = { type: "spring", stiffness: 520, damping: 40 } as const;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type SpringSwitchItem = {
  id: string;
  title: string;
  description: string;
  defaultOn?: boolean;
};

export type SpringSwitchProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  items?: SpringSwitchItem[];
  /** Called with the row id and its new state. */
  onChange?: (id: string, on: boolean) => void;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: SpringSwitchItem[] = [
  {
    id: "digest",
    title: "Weekly digest",
    description:
      "A Monday summary of mentions, replies and threads still waiting on you.",
    defaultOn: true,
  },
  {
    id: "mentions",
    title: "Mentions and reviews",
    description:
      "Skip everything except direct mentions and review requests assigned to you.",
    defaultOn: true,
  },
  {
    id: "updates",
    title: "Product updates",
    description:
      "New blocks, changelog entries and the occasional note from the team.",
    defaultOn: false,
  },
];

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function SpringSwitch({
  className,
  title = "Notifications",
  subtitle = "Choose what reaches your inbox.",
  items = DEFAULT_ITEMS,
  onChange,
}: SpringSwitchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = reduce || inView;

  const uid = useId().replace(/:/g, "");
  const [state, setState] = useState<Record<string, boolean>>({});

  const isOn = (item: SpringSwitchItem) =>
    state[item.id] ?? item.defaultOn ?? false;

  const onCount = items.filter(isOn).length;

  const toggle = (item: SpringSwitchItem) => {
    const next = !isOn(item);
    setState((current) => ({ ...current, [item.id]: next }));
    onChange?.(item.id, next);
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {subtitle}
              </p>
            </div>
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
              {onCount} of {items.length} on
            </span>
          </div>

          {items.length > 0 ? (
            <ul className="mt-4 border-t border-border">
              {items.map((item, index) => {
                const on = isOn(item);
                const labelId = `${uid}-switch-label-${index}`;
                const descId = `${uid}-switch-desc-${index}`;
                return (
                  <motion.li
                    key={item.id}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={
                      show
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: reduce ? 0 : 8 }
                    }
                    transition={{
                      duration: reduce ? 0 : 0.45,
                      ease: EASE,
                      delay: reduce ? 0 : index * 0.05,
                    }}
                    className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p
                        id={labelId}
                        className="text-[14px] font-medium leading-5 tracking-[-0.01em]"
                      >
                        {item.title}
                      </p>
                      <p
                        id={descId}
                        className="mt-1 text-[12.5px] leading-5 text-muted-foreground"
                      >
                        {item.description}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-labelledby={labelId}
                      aria-describedby={descId}
                      onClick={() => toggle(item)}
                      whileTap={reduce ? undefined : { scale: 0.95 }}
                      transition={reduce ? { duration: 0 } : KNOB_SPRING}
                      className={cn(
                        "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        on
                          ? "border-foreground/20 bg-foreground"
                          : "border-border bg-muted hover:bg-muted/70"
                      )}
                    >
                      <motion.span
                        aria-hidden="true"
                        initial={false}
                        animate={{ x: on ? 20 : 0 }}
                        transition={reduce ? { duration: 0 } : KNOB_SPRING}
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full bg-background shadow-sm",
                          on ? null : "border border-border"
                        )}
                      >
                        <motion.span
                          initial={false}
                          animate={{
                            opacity: on ? 1 : 0,
                            scale: on ? 1 : 0.4,
                          }}
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { duration: 0.18, ease: EASE }
                          }
                          className="h-1.5 w-1.5 rounded-full bg-foreground"
                        />
                      </motion.span>
                    </motion.button>
                  </motion.li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 text-[13px] text-muted-foreground">
              No notification channels yet.
            </p>
          )}

          <p className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-success"
            />
            Changes save as you toggle.
          </p>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default SpringSwitch;
