"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type StepperStep = {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
};

export type StepperProps = {
  className?: string;
  title?: string;
  description?: string;
  steps?: StepperStep[];
  defaultStep?: number;
  onStepChange?: (index: number) => void;
  onComplete?: () => void;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_STEPS: StepperStep[] = [
  {
    id: "source",
    title: "Connect data",
    description:
      "Point PrequelUI at your warehouse. We read the schema, never the rows, and keep every query inside your account.",
  },
  {
    id: "metrics",
    title: "Pick metrics",
    description:
      "Choose the numbers the team checks every morning. Start with revenue, activation and churn — you can change them later.",
  },
  {
    id: "team",
    title: "Invite the team",
    description:
      "Three seats are included on the Studio plan. Invite the people who act on these numbers, not everyone who asks for them.",
  },
  {
    id: "publish",
    title: "Publish",
    description:
      "Ship the dashboard to a private link, or embed it in the tools your team already opens every day.",
  },
];

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function Stepper({
  className,
  title = "Set up your workspace",
  description = "Four steps, about three minutes. You can leave and come back at any point.",
  steps = DEFAULT_STEPS,
  defaultStep = 2,
  onStepChange,
  onComplete,
}: StepperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const count = Math.max(1, steps.length);
  const [step, setStep] = useState(() => Math.min(count - 1, Math.max(0, defaultStep)));
  const [done, setDone] = useState(false);

  const activeStep = steps[Math.min(step, count - 1)];
  const last = step === count - 1;
  const railProgress = count > 1 ? step / (count - 1) : 1;

  const goTo = (next: number) => {
    const target = Math.min(count - 1, Math.max(0, next));
    setDone(false);
    setStep(target);
    onStepChange?.(target);
  };

  const next = () => {
    if (!last) {
      goTo(step + 1);
      return;
    }
    setDone(true);
    onComplete?.();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className={cn("w-full", className)}>
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: inView ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
          className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
              <p className="mt-0.5 max-w-lg text-[12.5px] leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums",
                done
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-border text-muted-foreground"
              )}
            >
              {done ? (
                <>
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  Complete
                </>
              ) : (
                `Step ${step + 1} of ${count}`
              )}
            </span>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div
                className="absolute top-4 h-px bg-border"
                style={{ left: `${50 / count}%`, right: `${50 / count}%` }}
              />
              <motion.div
                aria-hidden="true"
                initial={{ scaleX: reduce ? railProgress : 0 }}
                animate={{ scaleX: inView ? railProgress : 0 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE, delay: reduce ? 0 : 0.1 }}
                style={{
                  transformOrigin: "left center",
                  left: `${50 / count}%`,
                  right: `${50 / count}%`,
                }}
                className="absolute top-4 h-px bg-foreground"
              />

              <ol
                className="relative grid gap-1"
                style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
              >
                {steps.map((item, index) => {
                  const completed = done || index < step;
                  const active = !done && index === step;

                  return (
                    <li key={item.id} className="flex min-w-0 flex-col items-center">
                      <button
                        type="button"
                        onClick={() => goTo(index)}
                        aria-label={`Step ${index + 1} of ${count}: ${item.title}`}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "relative flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                          completed
                            ? "border-foreground bg-foreground text-background"
                            : active
                              ? "border-foreground bg-card text-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        {completed ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                        ) : (
                          <span>{index + 1}</span>
                        )}

                        {active && !reduce ? (
                          <motion.span
                            key={`pulse-${step}`}
                            aria-hidden="true"
                            initial={{ scale: 0.85, opacity: 0.5 }}
                            animate={{ scale: 1.7, opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-foreground"
                          />
                        ) : null}
                      </button>

                      <span
                        className={cn(
                          "mt-2 min-w-0 text-center text-[11px] leading-4 sm:text-[11.5px]",
                          active ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {item.title}
                        {item.optional ? (
                          <span className="block text-[10px] text-muted-foreground/70">Optional</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div
                  key="done"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                  aria-live="polite"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">Dashboard published</p>
                      <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
                        Northwind Labs can open it from the Showcase. Invitees get an email with the
                        private link.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <a
                      href="/showcase"
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      Open showcase
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => goTo(0)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Start over
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`step-${step}`}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
                  aria-live="polite"
                >
                  <p className="text-[13px] font-medium text-foreground">
                    {activeStep?.title}
                    {activeStep?.optional ? (
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                        Optional
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
                    {activeStep?.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => goTo(step - 1)}
                      disabled={step === 0}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      {last ? "Publish dashboard" : "Continue"}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

export default Stepper;
