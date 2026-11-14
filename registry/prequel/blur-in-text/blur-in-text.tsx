"use client";

import { Fragment, useRef } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type BlurInTextProps = {
  className?: string;
  /** The line whose letters sharpen in sequence. */
  text?: string;
  /** Name shown in the attribution line. Leave empty to hide the caption. */
  name?: string;
  /** Role and company shown next to the name. */
  role?: string;
  /** Seconds between consecutive letters. */
  stagger?: number;
};

const DEFAULT_TEXT =
  "Nobody opens a dashboard to admire it. They open it to decide, and the numbers should already be waiting.";

const DEFAULT_NAME = "Ama Mensah";
const DEFAULT_ROLE = "Head of Analytics, Northwind Labs";

export function BlurInText({
  className,
  text = DEFAULT_TEXT,
  name = DEFAULT_NAME,
  role = DEFAULT_ROLE,
  stagger = 0.012,
}: BlurInTextProps) {
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView || reduce;

  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalLetters = words.reduce((sum, word) => sum + word.length, 0);
  const step = Math.max(0, stagger);
  const captionDelay = Math.min(1.2, totalLetters * step + 0.18);

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  let letterIndex = 0;

  return (
    <MotionConfig reducedMotion="user">
      <figure
        ref={rootRef}
        className={cn("w-full max-w-3xl text-left", className)}
      >
        <blockquote>
          <span className="sr-only">{text}</span>
          <span
            aria-hidden="true"
            className="block text-balance text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl md:text-[2.5rem] md:leading-[1.22]"
          >
            {words.map((word, wordIndex) => {
              const start = letterIndex;
              letterIndex += word.length;
              const long = word.length > 14;

              return (
                <Fragment key={`${word}-${wordIndex}`}>
                  <span
                    className={cn(
                      "inline-block align-baseline",
                      long ? "max-w-full break-all" : "whitespace-nowrap"
                    )}
                  >
                    {Array.from(word).map((char, charIndex) => {
                      const index = start + charIndex;
                      return (
                        <motion.span
                          key={`${char}-${charIndex}`}
                          className="inline-block will-change-[filter,opacity,transform]"
                          initial={
                            reduce
                              ? false
                              : { opacity: 0, filter: "blur(7px)", y: "0.14em" }
                          }
                          animate={
                            show
                              ? { opacity: 1, filter: "blur(0px)", y: 0 }
                              : undefined
                          }
                          transition={
                            reduce
                              ? { duration: 0 }
                              : {
                                  duration: 0.55,
                                  delay: Math.min(1.1, index * step),
                                  ease: EASE,
                                }
                          }
                        >
                          {char}
                        </motion.span>
                      );
                    })}
                  </span>
                  {wordIndex < words.length - 1 ? " " : null}
                </Fragment>
              );
            })}
          </span>
        </blockquote>

        {name || role ? (
          <motion.figcaption
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={show ? { opacity: 1, y: 0 } : undefined}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.5, delay: captionDelay, ease: EASE }
            }
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4"
          >
            {initials ? (
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-[11px] font-medium tabular-nums text-muted-foreground"
              >
                {initials}
              </span>
            ) : null}
            {name ? (
              <span className="text-[13px] font-medium text-foreground">
                {name}
              </span>
            ) : null}
            {role ? (
              <span className="text-[13px] text-muted-foreground">{role}</span>
            ) : null}
          </motion.figcaption>
        ) : null}
      </figure>
    </MotionConfig>
  );
}

export default BlurInText;
