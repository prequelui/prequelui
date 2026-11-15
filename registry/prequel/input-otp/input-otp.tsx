"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type InputOtpProps = {
  className?: string;
  /** Number of digits. Defaults to 6. */
  length?: number;
  /** Prefilled code. Defaults to the demo code. */
  defaultValue?: string;
  label?: string;
  /** Email or phone the code was sent to. */
  destination?: string;
  /** Seconds before the resend button becomes available. */
  resendSeconds?: number;
  onComplete?: (code: string) => void;
  onResend?: () => void;
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function digitsOnly(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

function makeDigits(value: string, length: number) {
  const clean = digitsOnly(value, length);
  return Array.from({ length }, (_, index) => clean[index] ?? "");
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function InputOtp({
  className,
  length = 6,
  defaultValue = "240917",
  label = "Verify your sign-in",
  destination = "ama@northwindlabs.com",
  resendSeconds = 30,
  onComplete,
  onResend,
}: InputOtpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const [digits, setDigits] = useState<string[]>(() => makeDigits(defaultValue, length));
  const [active, setActive] = useState(-1);
  const [seconds, setSeconds] = useState(resendSeconds);

  const complete = digits.every((digit) => digit !== "");
  const code = digits.join("");

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const focusCell = (index: number) => {
    const next = Math.max(0, Math.min(length - 1, index));
    setActive(next);
    requestAnimationFrame(() => inputs.current[next]?.focus());
  };

  const commit = (next: string[], focus?: number) => {
    setDigits(next);
    if (focus !== undefined) focusCell(focus);
    const nextCode = next.join("");
    if (next.every((digit) => digit !== "") && nextCode.length === length) {
      onComplete?.(nextCode);
    }
  };

  const handleChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    const next = [...digits];

    if (!clean) {
      next[index] = "";
      commit(next, index);
      return;
    }

    let cursor = index;
    for (const char of clean) {
      if (cursor >= length) break;
      next[cursor] = char;
      cursor += 1;
    }

    commit(next, Math.min(cursor, length - 1));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        commit(next, index);
      } else if (index > 0) {
        next[index - 1] = "";
        commit(next, index - 1);
      }
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      const next = [...digits];
      next[index] = "";
      commit(next, index);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    const clean = digitsOnly(pasted, length - index);
    if (!clean) return;

    event.preventDefault();
    const next = [...digits];
    clean.split("").forEach((char, offset) => {
      next[index + offset] = char;
    });
    commit(next, Math.min(index + clean.length, length - 1));
  };

  const reset = () => {
    const empty = Array.from({ length }, () => "");
    setDigits(empty);
    focusCell(0);
  };

  const resend = () => {
    if (seconds > 0) return;
    setSeconds(resendSeconds);
    onResend?.();
    reset();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className={cn("flex w-full justify-center", className)}>
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: inView ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
          className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: inView ? 1 : 0, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.05 }}
          >
            <h2 className="text-[17px] font-semibold tracking-tight">{label}</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
              Enter the {length}-digit code sent to{" "}
              <span className="font-medium text-foreground">{destination}</span>.
            </p>
          </motion.div>

          <div
            role="group"
            aria-label={`${label}, ${length} digits`}
            className="mt-5 flex items-center gap-1.5 sm:gap-2"
          >
            {digits.map((digit, index) => {
              const isActive = active === index;
              return (
                <motion.div
                  key={index}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: inView ? 1 : 0, y: 0 }}
                  transition={{
                    duration: reduce ? 0 : 0.4,
                    ease: EASE,
                    delay: reduce ? 0 : 0.08 + index * 0.035,
                  }}
                  className="min-w-0 flex-1"
                >
                  <motion.input
                    ref={(element) => {
                      inputs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    aria-label={`Digit ${index + 1} of ${length}`}
                    aria-invalid={false}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={(event) => handlePaste(index, event)}
                    onFocus={(event) => {
                      setActive(index);
                      event.currentTarget.select();
                    }}
                    onBlur={() => setActive((current) => (current === index ? -1 : current))}
                    animate={reduce ? undefined : { y: isActive ? -2 : 0 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className={cn(
                      "h-12 w-full rounded-lg border bg-background text-center text-[19px] font-semibold tabular-nums caret-foreground transition-colors sm:h-14 sm:text-[21px]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      isActive ? "border-foreground/40" : "border-border"
                    )}
                  />
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 min-h-[22px]" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              {complete ? (
                <motion.div
                  key="accepted"
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                  className="flex items-center gap-2"
                >
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    {!reduce ? (
                      <motion.span
                        aria-hidden="true"
                        initial={{ scale: 0.6, opacity: 0.55 }}
                        animate={{ scale: 1.9, opacity: 0 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full ring-1 ring-success"
                      />
                    ) : null}
                  </span>
                  <p className="text-[12.5px] text-muted-foreground">
                    <span className="font-medium text-foreground">Code accepted</span> — welcome
                    back, Ama.
                  </p>
                </motion.div>
              ) : (
                <motion.p
                  key="hint"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                  className="text-[12.5px] leading-5 text-muted-foreground"
                >
                  {code.length} of {length} digits entered
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            {complete ? (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-7 items-center gap-1.5 rounded-md text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Start over
              </button>
            ) : (
              <button
                type="button"
                onClick={resend}
                disabled={seconds > 0}
                className={cn(
                  "inline-flex h-7 items-center rounded-md text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  seconds > 0
                    ? "cursor-default text-muted-foreground"
                    : "text-foreground hover:underline underline-offset-4"
                )}
              >
                {seconds > 0 ? `Resend code in 0:${String(seconds).padStart(2, "0")}` : "Resend code"}
              </button>
            )}

            <a
              href="/contact"
              className="rounded-sm text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Need help?
            </a>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

export default InputOtp;
