"use client";

import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

export type TypingHeadlineProps = {
  className?: string;
  /** Text shown before the rotating word. */
  prefix?: string;
  /** Words typed in rotation after the prefix. */
  words?: string[];
  /** Text shown after the rotating word. */
  suffix?: string;
  /** Supporting sentence under the headline. */
  description?: string;
  /** Milliseconds per typed character. */
  typeSpeed?: number;
  /** How long a finished word stays on screen, in milliseconds. */
  holdMs?: number;
};

const DEFAULT_WORDS = ["watch", "move", "question", "answer", "forecast"];

export function TypingHeadline({
  className,
  prefix = "Built for the people who",
  words = DEFAULT_WORDS,
  suffix = "the numbers.",
  description = "Free, MIT-licensed dashboard blocks for shadcn/ui. Install one, keep the file, and shape it to the data your team actually argues about.",
  typeSpeed = 70,
  holdMs = 1700,
}: TypingHeadlineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const list = words.filter((word) => word.trim().length > 0);
  const safeWords = list.length > 0 ? list : DEFAULT_WORDS;
  const signature = safeWords.join("\u0000");

  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduce) {
      setTyped(safeWords[0] ?? "");
      setActive(0);
      setDone(true);
      return;
    }
    if (!inView) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let wordIndex = 0;
    let char = 0;
    let deleting = false;

    setTyped("");
    setActive(0);
    setDone(false);

    const tick = () => {
      if (cancelled) return;
      const word = safeWords[wordIndex % safeWords.length] ?? "";

      if (!deleting) {
        char += 1;
        setTyped(word.slice(0, char));

        if (char >= word.length) {
          if (safeWords.length === 1) {
            setDone(true);
            return;
          }
          deleting = true;
          timeout = setTimeout(tick, Math.max(400, holdMs));
        } else {
          timeout = setTimeout(tick, Math.max(28, typeSpeed));
        }
        return;
      }

      char -= 1;
      setTyped(word.slice(0, Math.max(0, char)));

      if (char <= 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % safeWords.length;
        setActive(wordIndex);
        timeout = setTimeout(tick, Math.max(120, typeSpeed * 2));
      } else {
        timeout = setTimeout(tick, Math.max(18, typeSpeed / 2));
      }
    };

    timeout = setTimeout(tick, 420);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [inView, reduce, signature, typeSpeed, holdMs]);

  const showCaret = !reduce && !done;
  const displayed = reduce ? (safeWords[0] ?? "") : typed;

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={rootRef}
        className={cn("w-full max-w-3xl text-left", className)}
      >
        <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          <span className="text-muted-foreground">{prefix}</span>{" "}
          <span className="text-foreground">{displayed || "\u00A0"}</span>
          {showCaret ? (
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ opacity: [1, 1, 0] }}
              transition={{
                duration: 1.05,
                times: [0, 0.55, 1],
                repeat: Infinity,
                ease: "linear",
              }}
              className="ml-0.5 inline-block h-[0.86em] w-[2px] translate-y-[0.08em] rounded-[1px] bg-foreground"
            />
          ) : null}{" "}
          <span className="text-muted-foreground">{suffix}</span>
        </h2>

        <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
          {description}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
          <span className="text-[11px] font-medium text-muted-foreground">
            In rotation
          </span>
          <ul className="flex list-none flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
            {safeWords.map((word, index) => {
              const isActive = index === active;
              return (
                <li
                  key={`${word}-${index}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1 w-1 rounded-full transition-colors duration-300",
                      isActive ? "bg-foreground" : "bg-border"
                    )}
                  />
                  {word}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </MotionConfig>
  );
}

export default TypingHeadline;
