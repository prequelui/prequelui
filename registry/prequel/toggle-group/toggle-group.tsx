"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type ToggleGroupOption = {
  id: string;
  label: string;
  /** File name shown above the snippet. */
  fileName: string;
  /** Short note under the snippet. */
  note: string;
  /** Lines of code, one string per line. */
  lines: string[];
};

export type ToggleGroupProps = {
  className?: string;
  title?: string;
  description?: string;
  options?: ToggleGroupOption[];
  defaultValue?: string;
  /** Accessible name for the control. Defaults to "Choose a language". */
  groupLabel?: string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_OPTIONS: ToggleGroupOption[] = [
  {
    id: "curl",
    label: "cURL",
    fileName: "create-charge.sh",
    note: "Replace the key with your own.",
    lines: [
      "curl https://api.halo.cloud/v3/charges \\",
      '  -H "Authorization: Bearer $HALO_KEY" \\',
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"amount": 1284, "currency": "usd"}\'',
    ],
  },
  {
    id: "node",
    label: "Node",
    fileName: "create-charge.ts",
    note: "The SDK retries once on a network error.",
    lines: [
      'const { Halo } = require("@halo-cloud/node");',
      "",
      "const halo = new Halo(process.env.HALO_KEY);",
      "const charge = await halo.charges.create({",
      '  amount: 1284, currency: "usd",',
      "});",
    ],
  },
  {
    id: "python",
    label: "Python",
    fileName: "create_charge.py",
    note: "Amounts are in the smallest currency unit.",
    lines: [
      "import os",
      "from halo import Halo",
      "",
      "halo = Halo(os.environ[\"HALO_KEY\"])",
      "charge = halo.charges.create(",
      "    amount=1284, currency=\"usd\"",
      ")",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* tiny syntax colouring (tokens only, no highlighter)                 */
/* ------------------------------------------------------------------ */

const KEYWORDS = /^(import|from|const|await|new|return|def)$/;

function CodeLine({ line }: { line: string }) {
  if (!line) {
    return <span className="block h-4" aria-hidden="true" />;
  }

  const parts = line.split(/("[^"]*"|'[^']*'|\b(?:import|from|const|await|new|return|def)\b)/g);

  return (
    <span className="block min-h-4 whitespace-pre">
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith('"') || part.startsWith("'")) {
          return (
            <span key={index} className="text-success">
              {part}
            </span>
          );
        }
        if (KEYWORDS.test(part)) {
          return (
            <span key={index} className="text-foreground">
              {part}
            </span>
          );
        }
        return (
          <span key={index} className="text-muted-foreground">
            {part}
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function ToggleGroup({
  className,
  title = "Send a charge",
  description = "One request, three languages. Pick the one you ship.",
  options = DEFAULT_OPTIONS,
  defaultValue,
  groupLabel = "Choose a language",
}: ToggleGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const pillId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const safeOptions = options.length > 0 ? options : DEFAULT_OPTIONS;
  const [value, setValue] = useState(() => {
    const initial =
      safeOptions.find((option) => option.id === defaultValue) ?? safeOptions[0];
    return initial?.id ?? "";
  });

  const active =
    safeOptions.find((option) => option.id === value) ?? safeOptions[0];

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % safeOptions.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + safeOptions.length) % safeOptions.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = safeOptions.length - 1;
    }

    const option = safeOptions[next];
    if (!option) return;
    setValue(option.id);
    buttons.current[next]?.focus();
  };

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
          <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
            API v3
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label={groupLabel}
          className="mt-5 inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted/40 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {safeOptions.map((option, index) => {
            const selected = option.id === active?.id;
            return (
              <button
                key={option.id}
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setValue(option.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  "relative shrink-0 rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId={`toggle-group-pill-${pillId}`}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[6px] border border-border bg-card shadow-sm"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                ) : null}
                <span className="relative">{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 min-w-0 overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
            <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
              {active?.fileName}
            </span>
            <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
              application/json
            </span>
          </div>

          <div
            data-scroll-x
            className="relative min-h-[148px] min-w-0 overflow-x-auto p-3 font-mono text-[11.5px] leading-[1.55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-4"
            tabIndex={0}
            aria-label={`${active?.label ?? "Code"} example`}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.pre
                key={active?.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}
                className="m-0 flex gap-3"
              >
                <span
                  aria-hidden="true"
                  className="select-none text-right text-muted-foreground/50"
                >
                  {active?.lines.map((_, index) => (
                    <span key={index} className="block min-h-4 tabular-nums">
                      {index + 1}
                    </span>
                  ))}
                </span>
                <code className="min-w-0">
                  {active?.lines.map((line, index) => (
                    <CodeLine key={index} line={line} />
                  ))}
                </code>
              </motion.pre>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
            <span className="min-w-0 text-[11px] text-muted-foreground">
              {active?.note}
            </span>
            <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-success">
              201 Created
            </span>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
          Use the arrow keys to switch; the pill moves with the selection.
        </p>
      </motion.div>
    </MotionConfig>
  );
}

export default ToggleGroup;
