"use client";

import { Fragment, createElement, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type TextRevealProps = {
  className?: string;
  /** The heading text, split and revealed word by word. */
  text?: string;
  /** Semantic element used for the heading. Defaults to "h2". */
  as?: "h1" | "h2" | "h3" | "p";
  /** Delay between each word, in seconds. Defaults to 0.055. */
  stagger?: number;
};

const DEFAULT_TEXT = "A calmer place for the numbers your team watches.";

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function TextReveal({
  className,
  text = DEFAULT_TEXT,
  as = "h2",
  stagger = 0.055,
}: TextRevealProps) {
  const reduce = Boolean(useReducedMotion());
  const nodeRef = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  /* Native IntersectionObserver so the words only move once, the first
     time the heading crosses into the viewport. */
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-10% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [as]);

  const words = text.trim().split(/\s+/).filter(Boolean);
  const hidden = !reduce && !shown;
  const delay = Math.max(0, stagger);

  const classes = cn(
    "text-balance font-semibold tracking-tight text-foreground",
    as === "h1" && "text-4xl sm:text-5xl md:text-6xl",
    as === "h2" && "text-3xl sm:text-4xl md:text-5xl",
    as === "h3" && "text-2xl sm:text-3xl",
    as === "p" &&
      "text-base font-normal leading-relaxed text-muted-foreground sm:text-lg",
    className
  );

  const merged = words.length > 1;

  return createElement(
    as,
    {
      ref: (element: HTMLElement | null) => {
        nodeRef.current = element;
      },
      className: classes,
      "aria-label": merged ? text : undefined,
    },
    words.map((word, index) => (
      <Fragment key={`${word}-${index}`}>
        <motion.span
          className="inline-block will-change-[transform,filter,opacity]"
          aria-hidden={merged ? true : undefined}
          initial={
            reduce
              ? false
              : { opacity: 0, y: "0.4em", filter: "blur(8px)" }
          }
          animate={
            hidden
              ? undefined
              : { opacity: 1, y: "0em", filter: "blur(0px)" }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 0.75, delay: index * delay, ease: EASE }
          }
        >
          {word}
        </motion.span>
        {index < words.length - 1 ? " " : null}
      </Fragment>
    ))
  );
}

/* Small instance with the default copy, handy for previews. */
export function TextRevealDemo() {
  return (
    <TextReveal
      as="h2"
      text="A calmer place for the numbers your team watches."
      className="max-w-2xl"
    />
  );
}

export default TextReveal;
