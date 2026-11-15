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
const DOT_SPRING = { type: "spring", stiffness: 480, damping: 38 } as const;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type MovingRadioOption = {
  id: string;
  label: string;
  description: string;
  /** Small note aligned to the right of the label, e.g. "Next 02:00". */
  meta?: string;
  /** Line shown under the group when this option is selected. */
  summary: string;
};

export type MovingRadioProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  options?: MovingRadioOption[];
  /** Option selected on first render. Defaults to the first one. */
  defaultOption?: string;
  /** Called with the id of the newly selected option. */
  onChange?: (id: string) => void;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_OPTIONS: MovingRadioOption[] = [
  {
    id: "six-hours",
    label: "Every 6 hours",
    description: "Snapshots at 00:00, 06:00, 12:00 and 18:00.",
    meta: "Next 18:00",
    summary: "4 snapshots a day, kept for 7 days.",
  },
  {
    id: "daily",
    label: "Every day",
    description: "One snapshot at 02:00, when traffic is at its lowest.",
    meta: "Next 02:00",
    summary: "7 daily snapshots, about 42 GB in total.",
  },
  {
    id: "weekly",
    label: "Every week",
    description: "A Sunday snapshot for long-term restore points.",
    meta: "Sun 03:00",
    summary: "12 weekly snapshots, about 96 GB in total.",
  },
];

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function MovingRadio({
  className,
  title = "Backup schedule",
  subtitle = "Applied to the production database.",
  options = DEFAULT_OPTIONS,
  defaultOption,
  onChange,
}: MovingRadioProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = reduce || inView;

  const uid = useId().replace(/:/g, "");
  const groupName = `moving-radio-${uid}`;
  const dotId = `moving-radio-dot-${uid}`;

  const [selected, setSelected] = useState(() => {
    if (defaultOption && options.some((option) => option.id === defaultOption)) {
      return defaultOption;
    }
    return options[0]?.id ?? "";
  });

  const found = options.findIndex((option) => option.id === selected);
  const index = found < 0 ? 0 : found;
  const current = options[index];

  const choose = (id: string) => {
    setSelected(id);
    onChange?.(id);
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
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {options.length > 0 && current ? (
            <>
              <fieldset className="mt-4">
                <legend className="sr-only">{title}</legend>
                <div className="overflow-hidden rounded-lg border border-border">
                  {options.map((option, position) => {
                    const checked = position === index;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 px-3 py-3.5 transition-colors sm:px-4",
                          checked ? "bg-muted/50" : "hover:bg-muted/30",
                          position > 0 && "border-t border-border"
                        )}
                      >
                        <input
                          type="radio"
                          name={groupName}
                          value={option.id}
                          checked={checked}
                          onChange={() => choose(option.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border bg-background transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                            checked
                              ? "border-foreground"
                              : "border-border"
                          )}
                        >
                          {checked ? (
                            <motion.span
                              layoutId={dotId}
                              transition={
                                reduce ? { duration: 0 } : DOT_SPRING
                              }
                              className="h-2 w-2 rounded-full bg-foreground"
                            />
                          ) : null}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <span
                              className={cn(
                                "text-[14px] font-medium leading-5 tracking-[-0.01em] transition-colors",
                                checked
                                  ? "text-foreground"
                                  : "text-foreground/85"
                              )}
                            >
                              {option.label}
                            </span>
                            {option.meta ? (
                              <span className="text-[11.5px] tabular-nums text-muted-foreground">
                                {option.meta}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-5 text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-4 min-h-[44px] rounded-lg bg-muted/40 px-3 py-2.5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={current.id}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -4 }}
                    transition={{
                      duration: reduce ? 0 : 0.2,
                      ease: EASE,
                    }}
                    className="text-[12.5px] leading-5 text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {current.label}.
                    </span>{" "}
                    {current.summary}
                  </motion.p>
                </AnimatePresence>
              </div>
            </>
          ) : (
            <p className="mt-5 text-[13px] text-muted-foreground">
              No schedule options yet.
            </p>
          )}
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default MovingRadio;
