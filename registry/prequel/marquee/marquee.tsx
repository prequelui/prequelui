"use client";

import { useId, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const LOGOS_PER_ROW = 8;

/* two identical copies of a row make the loop seamless */
const KEYFRAMES = `
@keyframes prequel-marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type MarqueeMark =
  | "orbit"
  | "arc"
  | "wave"
  | "grid"
  | "prism"
  | "diamond"
  | "stack"
  | "split";

export type MarqueeLogo = {
  id: string;
  name: string;
  /** A small geometric mark drawn beside the wordmark. */
  mark?: MarqueeMark;
};

export type MarqueeProps = {
  className?: string;
  heading?: string;
  /** A short line of context under the heading. */
  note?: string;
  logos?: MarqueeLogo[];
  /** Seconds for one full loop of a row. Defaults to 36. */
  duration?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_LOGOS: MarqueeLogo[] = [
  { id: "northwind", name: "Northwind Labs", mark: "orbit" },
  { id: "halo", name: "Halo Cloud", mark: "arc" },
  { id: "bluebird", name: "Bluebird Studio", mark: "wave" },
  { id: "sable", name: "Sable Systems", mark: "grid" },
  { id: "kite", name: "Kite & Co", mark: "prism" },
  { id: "meridian", name: "Meridian Works", mark: "diamond" },
  { id: "calder", name: "Calder & Finch", mark: "stack" },
  { id: "lumen", name: "Lumen Field", mark: "split" },
  { id: "harborline", name: "Harborline", mark: "orbit" },
  { id: "fathom", name: "Fathom", mark: "arc" },
  { id: "copperline", name: "Copperline", mark: "wave" },
  { id: "tessellate", name: "Tessellate", mark: "grid" },
];

/* ------------------------------------------------------------------ */
/* marks                                                               */
/* ------------------------------------------------------------------ */

function LogoMark({ shape }: { shape: MarqueeMark }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      {shape === "orbit" ? (
        <>
          <circle cx="12" cy="12" r="4.5" />
          <ellipse
            cx="12"
            cy="12"
            rx="9.5"
            ry="3.5"
            transform="rotate(-25 12 12)"
          />
        </>
      ) : null}

      {shape === "arc" ? (
        <>
          <path d="M4 17a8 8 0 0 1 16 0" />
          <circle cx="4" cy="17" r="1" fill="currentColor" stroke="none" />
          <circle cx="20" cy="17" r="1" fill="currentColor" stroke="none" />
        </>
      ) : null}

      {shape === "wave" ? (
        <path d="M3 14c3-7 6-7 9 0s6 7 9 0" />
      ) : null}

      {shape === "grid" ? (
        <>
          <rect x="4.5" y="4.5" width="6" height="6" rx="1.2" />
          <rect x="13.5" y="4.5" width="6" height="6" rx="1.2" />
          <rect x="4.5" y="13.5" width="6" height="6" rx="1.2" />
          <rect x="13.5" y="13.5" width="6" height="6" rx="1.2" />
        </>
      ) : null}

      {shape === "prism" ? (
        <>
          <path d="M12 4 20 19H4L12 4Z" />
          <path d="M12 9v5" />
        </>
      ) : null}

      {shape === "diamond" ? (
        <>
          <path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </>
      ) : null}

      {shape === "stack" ? (
        <path d="M4.5 7.5h15M7.5 12h9M4.5 16.5h15" />
      ) : null}

      {shape === "split" ? (
        <>
          <circle cx="7" cy="7" r="2.8" />
          <circle cx="17" cy="17" r="2.8" />
          <path d="m9 9 6 6" />
        </>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* one wordmark                                                        */
/* ------------------------------------------------------------------ */

function LogoItem({
  logo,
  still = false,
}: {
  logo: MarqueeLogo;
  still?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-2.5 text-muted-foreground transition-colors duration-200 hover:text-foreground",
        still
          ? ""
          : "min-w-[168px] justify-center px-4 sm:min-w-[184px]"
      )}
    >
      <LogoMark shape={logo.mark ?? "orbit"} />
      <span className="whitespace-nowrap text-[13px] font-medium tracking-[-0.01em]">
        {logo.name}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* a row                                                               */
/* ------------------------------------------------------------------ */

function MarqueeRow({
  items,
  direction,
  duration,
  paused,
}: {
  items: MarqueeLogo[];
  direction: "left" | "right";
  duration: number;
  paused: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden">
      <div
        className="marquee-track flex w-max"
        style={{
          animation: `prequel-marquee-scroll ${duration}s linear infinite`,
          animationDirection: direction === "right" ? "reverse" : "normal",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1 ? true : undefined}
            className="flex shrink-0 items-center"
          >
            {items.map((logo, index) => (
              <LogoItem key={`${copy}-${logo.id}-${index}`} logo={logo} />
            ))}
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the block                                                           */
/* ------------------------------------------------------------------ */

export function Marquee({
  className,
  heading = "Teams shipping with PrequelUI",
  note = "2,418 teams, from seed stage to public.",
  logos = DEFAULT_LOGOS,
  duration = 36,
}: MarqueeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const headingId = useId();

  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);

  const base = logos.length > 0 ? logos : DEFAULT_LOGOS;
  const repeat = Math.max(1, Math.ceil((LOGOS_PER_ROW * 2) / base.length));
  const expanded = Array.from({ length: repeat }, () => base).flat();
  const split = Math.ceil(expanded.length / 2);
  const rowOne = expanded.slice(0, split);
  const rowTwo = expanded.slice(split);

  const paused = hovering || focusWithin || manualPaused;
  const safeDuration = Math.max(8, duration);

  return (
    <MotionConfig reducedMotion="user">
      <style>{KEYFRAMES}</style>
      <motion.div
        ref={ref}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={
          reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
        }
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !event.currentTarget.contains(next)) {
            setFocusWithin(false);
          }
        }}
        className={cn("w-full text-foreground", className)}
      >
        <section
          aria-labelledby={headingId}
          className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
        >
          <header className="flex items-start justify-between gap-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
            <div className="min-w-0">
              <h2
                id={headingId}
                className="text-[15px] font-medium tracking-[-0.01em] text-foreground"
              >
                {heading}
              </h2>
              {note ? (
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {note}
                </p>
              ) : null}
            </div>

            {reduce ? null : (
              <button
                type="button"
                onClick={() => setManualPaused((value) => !value)}
                aria-pressed={manualPaused}
                aria-label={
                  manualPaused ? "Resume the logo band" : "Pause the logo band"
                }
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {manualPaused ? (
                  <Play className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Pause className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            )}
          </header>

          <div className="border-t border-border">
            {reduce ? (
              <div className="flex flex-wrap items-center gap-x-8 gap-y-5 px-4 py-5 sm:px-5">
                {base.map((logo) => (
                  <LogoItem key={logo.id} logo={logo} still />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 py-4 sm:gap-3 sm:py-5">
                <MarqueeRow
                  items={rowOne}
                  direction="left"
                  duration={safeDuration}
                  paused={paused}
                />
                {rowTwo.length > 0 ? (
                  <MarqueeRow
                    items={rowTwo}
                    direction="right"
                    duration={safeDuration}
                    paused={paused}
                  />
                ) : null}
              </div>
            )}
          </div>
        </section>
      </motion.div>
    </MotionConfig>
  );
}

export default Marquee;
