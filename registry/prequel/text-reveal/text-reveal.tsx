"use client";

import { Fragment, createElement, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

export type TextRevealProps = {
  className?: string;
  /** The text that lights up, word by word, as it scrolls through the viewport. */
  text?: string;
  /** Semantic element used for the heading. Defaults to "h2". */
  as?: "h1" | "h2" | "h3" | "p";
};

const DEFAULT_TEXT =
  "A dashboard should feel like a place you return to, not a report you reopen.";

type RevealWordProps = {
  word: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
  reduce: boolean;
};

function RevealWord({
  word,
  index,
  count,
  progress,
  reduce,
}: RevealWordProps) {
  const start = index / count;
  const end = (index + 1) / count;
  const opacity = useTransform(progress, [start, end], [0.16, 1], {
    clamp: true,
  });

  return (
    <motion.span
      className="inline-block will-change-[opacity]"
      style={{ opacity: reduce ? 1 : opacity }}
    >
      {word}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* the small readout at the end of the rail                            */
/* ------------------------------------------------------------------ */

function ProgressReadout({ value }: { value: MotionValue<number> }) {
  const [percent, setPercent] = useState(0);
  const last = useRef(-1);

  useEffect(() => {
    const next = Math.round(value.get() * 100);
    last.current = next;
    setPercent(next);
  }, [value]);

  useMotionValueEvent(value, "change", (latest) => {
    const next = Math.round(latest * 100);
    if (next === last.current) return;
    last.current = next;
    setPercent(next);
  });

  return <>{percent}%</>;
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function TextReveal({
  className,
  text = DEFAULT_TEXT,
  as = "h2",
}: TextRevealProps) {
  const reduce = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start 0.9", "end 0.35"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.35,
  });

  const words = text.trim().split(/\s+/).filter(Boolean);
  const count = Math.max(1, words.length);

  const classes = cn(
    "text-balance font-semibold tracking-tight text-foreground",
    as === "h1" && "text-4xl sm:text-5xl md:text-6xl",
    as === "h2" && "text-3xl sm:text-4xl md:text-5xl",
    as === "h3" && "text-2xl sm:text-3xl",
    as === "p" &&
      "text-base font-normal leading-relaxed text-muted-foreground sm:text-lg"
  );

  return (
    <div ref={rootRef} className={cn("w-full max-w-3xl", className)}>
      {createElement(
        as,
        { className: classes },
        words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <RevealWord
              word={word}
              index={index}
              count={count}
              progress={progress}
              reduce={reduce}
            />
            {index < words.length - 1 ? " " : null}
          </Fragment>
        ))
      )}

      <div aria-hidden="true" className="mt-6 flex items-center gap-3">
        <div className="relative h-px flex-1 overflow-hidden bg-border">
          <motion.div
            className="h-px w-full origin-left bg-foreground"
            style={{ scaleX: reduce ? 1 : progress }}
          />
        </div>
        <span className="w-9 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
          {reduce ? "100%" : <ProgressReadout value={progress} />}
        </span>
      </div>
    </div>
  );
}

export default TextReveal;
