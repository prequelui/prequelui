"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type CopyMorphCommand = {
  id: string;
  label: string;
  command: string;
};

export type CopyMorphProps = {
  className?: string;
  title?: string;
  description?: string;
  commands?: CopyMorphCommand[];
  defaultCommandId?: string;
  /** Text shown after a successful copy. Defaults to "Copied". */
  copiedLabel?: string;
  /** How long the copied state stays on screen, in ms. Defaults to 2000. */
  copiedDuration?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_COMMANDS: CopyMorphCommand[] = [
  {
    id: "npm",
    label: "npm",
    command: "npx shadcn@latest add https://prequelui.terravidhal.me/r/copy-morph.json",
  },
  {
    id: "pnpm",
    label: "pnpm",
    command: "pnpm dlx shadcn@latest add https://prequelui.terravidhal.me/r/copy-morph.json",
  },
  {
    id: "bun",
    label: "bun",
    command: "bunx --bun shadcn@latest add https://prequelui.terravidhal.me/r/copy-morph.json",
  },
];

/* ------------------------------------------------------------------ */
/* clipboard                                                           */
/* ------------------------------------------------------------------ */

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-999px";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(field);
  if (!copied) throw new Error("Copy failed");
}

/* ------------------------------------------------------------------ */
/* icon: the two sheets fold away while the check draws in             */
/* ------------------------------------------------------------------ */

function MorphIcon({ copied, reduce }: { copied: boolean; reduce: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      fill="none"
      className="h-[18px] w-[18px]"
    >
      <motion.g
        initial={false}
        animate={{
          opacity: copied ? 0 : 1,
          scale: copied ? 0.72 : 1,
          rotate: copied ? -18 : 0,
        }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.28, ease: EASE }
        }
        style={{ transformOrigin: "10px 10px" }}
      >
        <rect
          x="7"
          y="3.4"
          width="9.6"
          height="9.6"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M4.9 7.1v6.3a3.2 3.2 0 0 0 3.2 3.2h6.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </motion.g>

      <motion.g
        initial={false}
        animate={{
          opacity: copied ? 1 : 0,
          scale: copied ? 1 : 0.72,
          rotate: copied ? 0 : 18,
        }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.28, ease: EASE }
        }
        style={{ transformOrigin: "10px 10px" }}
      >
        <motion.path
          d="M3.8 10.4l4.1 4.1L16.3 5.9"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: copied ? 1 : 0, opacity: copied ? 1 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 0.34, ease: EASE, delay: copied ? 0.06 : 0 }
          }
        />
      </motion.g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function CopyMorph({
  className,
  title = "Quick install",
  description = "Add the block to a project that already uses shadcn/ui.",
  commands = DEFAULT_COMMANDS,
  defaultCommandId,
  copiedLabel = "Copied",
  copiedDuration = 2000,
}: CopyMorphProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const groupId = useId();

  const safeCommands = commands.length > 0 ? commands : DEFAULT_COMMANDS;
  const [activeId, setActiveId] = useState(() => {
    const initial =
      safeCommands.find((item) => item.id === defaultCommandId) ?? safeCommands[0];
    return initial?.id ?? "";
  });
  const [copied, setCopied] = useState(false);

  const active =
    safeCommands.find((item) => item.id === activeId) ?? safeCommands[0];

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(
      () => setCopied(false),
      Math.max(600, copiedDuration)
    );
    return () => window.clearTimeout(timer);
  }, [copied, copiedDuration]);

  const select = (id: string) => {
    setActiveId(id);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!active) return;
    try {
      await writeToClipboard(active.command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
            MIT
          </span>
        </div>

        <div
          role="group"
          aria-label="Package manager"
          className="mt-5 inline-flex w-fit items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
        >
          {safeCommands.map((item) => {
            const selected = item.id === active?.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                aria-pressed={selected}
                className={cn(
                  "relative rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId={`copy-morph-manager-${groupId}`}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[6px] border border-border bg-card"
                    transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                  />
                ) : null}
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            "mt-3 min-w-0 rounded-lg border bg-background transition-colors motion-reduce:transition-none",
            copied ? "border-success/40" : "border-border"
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5 p-2.5 pl-3">
            <Terminal
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            />
            <code
              title={active?.command}
              className="min-w-0 flex-1 select-all truncate font-mono text-[11.5px] leading-6 text-muted-foreground sm:text-[12px]"
            >
              {active?.command}
            </code>
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label={copied ? copiedLabel : "Copy install command"}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none",
                copied
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <MorphIcon copied={copied} reduce={reduce} />
              <span className="relative inline-flex h-4 min-w-[48px] items-center overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    key={copied ? "copied" : "copy"}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                    className="absolute inset-0 flex items-center"
                  >
                    {copied ? copiedLabel : "Copy"}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
            <span aria-live="polite" className="text-[11px] text-muted-foreground">
              {copied ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <Check aria-hidden="true" className="h-3 w-3" />
                  Copied to clipboard — paste it in your terminal.
                </span>
              ) : (
                "Copies the exact command for this block."
              )}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              registry v1
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
          <Copy aria-hidden="true" className="h-3 w-3" />
          <span>Run it at the root of your project.</span>
          <span aria-hidden="true" className="text-border">
            /
          </span>
          <span className="text-foreground">Requires Node 18.17 or newer</span>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default CopyMorph;
