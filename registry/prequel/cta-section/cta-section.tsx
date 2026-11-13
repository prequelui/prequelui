"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowRight, ArrowUpRight, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function LensMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
    >
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="10.4" cy="5.6" r="1.05" fill="currentColor" />
    </svg>
  );
}

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

export type CtaSectionProps = {
  className?: string;
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Command shown in the copyable pill. */
  installCommand?: string;
  /** Small line under the install command. */
  note?: string;
};

const DEFAULT_TITLE = "Build a dashboard worth opening.";
const DEFAULT_DESCRIPTION =
  "Free MIT blocks that copy into your project as a single file you own. No runtime, no lock-in.";
const DEFAULT_INSTALL =
  "npx shadcn@latest add https://prequelui.terravidhal.me/r/cta-section.json";
const DEFAULT_NOTE = "MIT licensed — works with any shadcn theme.";

const CTA_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function CtaSection({
  className,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  primaryLabel = "Browse the blocks",
  primaryHref = "https://prequelui.terravidhal.me",
  secondaryLabel = "View on GitHub",
  secondaryHref = "https://github.com/prequelui/prequelui",
  installCommand = DEFAULT_INSTALL,
  note = DEFAULT_NOTE,
}: CtaSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const opened = inView || reduce;

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await writeToClipboard(installCommand);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const reveal = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: opened ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: {
      duration: reduce ? 0 : 0.6,
      delay: reduce ? 0 : delay,
      ease: EASE,
    },
  });

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={ref}
        aria-labelledby={titleId}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
          className
        )}
      >
        <div className="grid gap-8 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12 lg:px-12 lg:py-14">
          <div className="min-w-0">
            <motion.div
              {...reveal(0)}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5 text-muted-foreground"
            >
              <LensMark className="h-3.5 w-3.5 text-foreground" />
              <span className="font-medium text-foreground">
                PrequelUI 2.4.0
              </span>
              <span aria-hidden="true" className="text-border">
                /
              </span>
              <span className="tabular-nums">17 blocks</span>
              <span aria-hidden="true" className="text-border">
                /
              </span>
              <span className="tabular-nums">4,812 GitHub stars</span>
            </motion.div>

            <motion.h2
              id={titleId}
              {...reveal(0.06)}
              className="mt-4 text-balance text-[28px] font-semibold leading-[1.06] tracking-[-0.04em] sm:text-4xl lg:text-[42px]"
            >
              {title}
            </motion.h2>

            <motion.p
              {...reveal(0.12)}
              className="mt-3 max-w-lg text-pretty text-[14px] leading-6 text-muted-foreground sm:text-[15px]"
            >
              {description}
            </motion.p>

            <motion.div
              {...reveal(0.18)}
              className="mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center"
            >
              <a
                href={primaryHref}
                className={cn(
                  CTA_BUTTON,
                  "group w-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
                )}
              >
                {primaryLabel}
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </a>
              <a
                href={secondaryHref}
                className={cn(
                  CTA_BUTTON,
                  "group w-full border border-border bg-background text-foreground hover:bg-muted sm:w-auto"
                )}
              >
                {secondaryLabel}
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                />
              </a>
            </motion.div>

            <motion.p
              {...reveal(0.24)}
              className="mt-5 max-w-md text-[12px] leading-5 text-muted-foreground"
            >
              Teams at{" "}
              <span className="text-foreground">Northwind Labs</span> and{" "}
              <span className="text-foreground">Halo Cloud</span> shipped{" "}
              <span className="tabular-nums text-foreground">2,140</span>{" "}
              dashboards with these blocks this week.
            </motion.p>
          </div>

          <motion.div {...reveal(0.16)} className="min-w-0">
            <div
              className={cn(
                "min-w-0 rounded-lg border bg-background transition-colors duration-300 motion-reduce:transition-none",
                copied ? "border-success/50" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-3 px-3 pt-3">
                <span className="truncate text-[12px] font-medium text-foreground">
                  Install a block
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-success"
                  />
                  MIT
                </span>
              </div>

              <div className="p-1.5 pt-2">
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 rounded-md border bg-muted/40 p-0.5 pl-2.5 transition-colors duration-300 motion-reduce:transition-none",
                    copied ? "border-success/40" : "border-border"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-mono text-[11px] text-muted-foreground"
                  >
                    $
                  </span>
                  <code
                    title={installCommand}
                    className="min-w-0 flex-1 select-all truncate font-mono text-[11px] leading-8 text-muted-foreground sm:text-[11.5px]"
                  >
                    {installCommand}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    aria-label={copied ? "Copied" : "Copy install command"}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <AnimatePresence initial={false} mode="wait">
                      <motion.span
                        key={copied ? "check" : "copy"}
                        initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={
                          reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }
                        }
                        transition={{
                          duration: reduce ? 0 : 0.16,
                          ease: EASE,
                        }}
                        className={cn(
                          "grid place-items-center",
                          copied ? "text-success" : undefined
                        )}
                      >
                        {copied ? (
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                <p className="min-w-0 text-[11px] leading-4 text-muted-foreground">
                  {note}
                </p>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  v2.4.0
                </span>
              </div>
            </div>

            <span aria-live="polite" className="sr-only">
              {copied ? "Install command copied to clipboard." : ""}
            </span>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}

export default CtaSection;
