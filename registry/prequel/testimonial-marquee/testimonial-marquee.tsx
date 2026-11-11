"use client";

import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { Pause, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  /** Rating from 0 to 5. */
  rating: number;
};

export type TestimonialMarqueeProps = {
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  testimonials?: Testimonial[];
  /** Drift speed in pixels per second. Defaults to 26. */
  speed?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "t01",
    name: "Maya Chen",
    role: "Head of Product · B2B SaaS",
    quote:
      "We replaced three dashboards with one screen. The team finally looks at the same numbers.",
    rating: 5,
  },
  {
    id: "t02",
    name: "Jonas Weber",
    role: "Design Director · Fintech",
    quote:
      "The motion is quiet enough to use in production. Nothing shouts for attention.",
    rating: 5,
  },
  {
    id: "t03",
    name: "Priya Raman",
    role: "Engineering Lead · Infrastructure",
    quote:
      "Setup took an afternoon. It reads like code we would have written ourselves.",
    rating: 5,
  },
  {
    id: "t04",
    name: "Elias Moreau",
    role: "Founder · Analytics",
    quote:
      "Our weekly review went from forty minutes of screenshots to a single glance.",
    rating: 5,
  },
  {
    id: "t05",
    name: "Nora Kim",
    role: "Product Designer · Health",
    quote:
      "Every block is legible in dark mode, which is rarer than it should be.",
    rating: 4,
  },
  {
    id: "t06",
    name: "Tomás Silva",
    role: "Frontend Lead · Logistics",
    quote:
      "The charts feel considered. Small details, but they add up across the product.",
    rating: 5,
  },
  {
    id: "t07",
    name: "Hannah Brooks",
    role: "Head of Data · Retail",
    quote:
      "We shipped the first dashboard before lunch and have not touched the layout since.",
    rating: 5,
  },
  {
    id: "t08",
    name: "Aiko Tanaka",
    role: "Design Systems Lead · Media",
    quote:
      "Clear defaults, tidy tokens, no surprises when we themed it for our brand.",
    rating: 4,
  },
  {
    id: "t09",
    name: "Sam Okafor",
    role: "Product Manager · Education",
    quote:
      "It gave our metrics a calm home. The numbers finally have room to breathe.",
    rating: 5,
  },
  {
    id: "t10",
    name: "Lea Fischer",
    role: "Co-founder · Productivity",
    quote:
      "A rare UI kit that our designers and engineers both want to keep using.",
    rating: 5,
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "—";
}

/* ------------------------------------------------------------------ */
/* card                                                                */
/* ------------------------------------------------------------------ */

type TestimonialCardProps = {
  item: Testimonial;
  /** Marquee cards join the tab order so keyboard focus can pause the row. */
  focusable: boolean;
  className?: string;
};

function TestimonialCard({ item, focusable, className }: TestimonialCardProps) {
  const rating = Math.max(0, Math.min(5, Math.round(item.rating)));

  return (
    <article
      tabIndex={focusable ? 0 : -1}
      className={cn(
        "flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:border-muted-foreground/30",
        focusable &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <div>
        <div
          className="flex items-center gap-0.5"
          role="img"
          aria-label={`${rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              aria-hidden="true"
              strokeWidth={1.5}
              fill={index < rating ? "currentColor" : "none"}
              className={cn(
                "h-3.5 w-3.5",
                index < rating
                  ? "text-foreground"
                  : "text-muted-foreground/35"
              )}
            />
          ))}
        </div>

        <blockquote className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          &ldquo;{item.quote}&rdquo;
        </blockquote>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold tracking-wide text-foreground"
        >
          {getInitials(item.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-foreground">
            {item.name}
          </div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {item.role}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* marquee row                                                         */
/* ------------------------------------------------------------------ */

type MarqueeRowProps = {
  items: Testimonial[];
  direction: "left" | "right";
  speed: number;
  paused: boolean;
  active: boolean;
};

function MarqueeRow({
  items,
  direction,
  speed,
  paused,
  active,
}: MarqueeRowProps) {
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const primedRef = useRef(false);
  const pausedRef = useRef(paused);
  const activeRef = useRef(active);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    primedRef.current = false;
    lastRef.current = null;
  }, [direction, items.length]);

  /* Each copy is identical, so one copy width is the seamless loop length. */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const measure = () => {
      halfRef.current = el.scrollWidth / 2;
    };
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length]);

  useAnimationFrame((time) => {
    const half = halfRef.current;
    if (half <= 0) return;

    if (!primedRef.current) {
      primedRef.current = true;
      if (direction === "right") x.set(-half);
      lastRef.current = time;
      return;
    }

    const last = lastRef.current ?? time;
    lastRef.current = time;

    if (!activeRef.current || pausedRef.current) return;

    const dt = Math.min(64, time - last) / 1000;
    let next = x.get() + (direction === "left" ? -speed : speed) * dt;

    /* Snap at the seam: copy two is pixel-identical to copy one. */
    if (direction === "left") {
      if (next <= -half) next = 0;
    } else if (next >= 0) {
      next = -half;
    }

    x.set(next);
  });

  return (
    <div className="relative overflow-hidden py-1.5">
      <motion.div
        ref={trackRef}
        style={{ x }}
        className="flex w-max will-change-transform"
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 gap-4 pr-4"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {items.map((item) => (
              <TestimonialCard
                key={`${copy}-${item.id}`}
                item={item}
                focusable={copy === 0}
                className="w-[264px] shrink-0 sm:w-[304px]"
              />
            ))}
          </div>
        ))}
      </motion.div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent sm:w-16"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:w-16"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the one lens accent                                                 */
/* ------------------------------------------------------------------ */

function LensMark({ show, reduce }: { show: boolean; reduce: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      initial={{ rotate: -40, opacity: 0 }}
      animate={
        show || reduce
          ? { rotate: 28, opacity: 1 }
          : { rotate: -40, opacity: 0 }
      }
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 0.9, ease: EASE, delay: 0.1 }
      }
      className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full border border-border" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/40" />
      <span className="absolute left-[1.5px] top-[1.5px] h-1 w-1 rounded-full bg-foreground" />
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function TestimonialMarquee({
  className,
  eyebrow = "Testimonials",
  title = "Teams who build calm dashboards",
  description = "A few words from people using these blocks in production.",
  testimonials = DEFAULT_TESTIMONIALS,
  speed = 26,
}: TestimonialMarqueeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);

  const safeSpeed = Math.max(8, speed);
  const split = Math.max(1, Math.ceil(testimonials.length / 2));
  const rowOne = testimonials.slice(0, split);
  const rowTwo = testimonials.slice(split);
  const paused = hovering || focusWithin || manualPaused;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <LensMark show={inView} reduce={reduce} />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {reduce ? null : (
        <button
          type="button"
          onClick={() => setManualPaused((value) => !value)}
          aria-pressed={manualPaused}
          aria-label={manualPaused ? "Resume testimonials" : "Pause testimonials"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {manualPaused ? (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );

  if (reduce) {
    return (
      <MotionConfig reducedMotion="user">
        <div
          ref={ref}
          className={cn("w-full bg-background text-foreground", className)}
        >
          {header}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((item) => (
              <TestimonialCard
                key={item.id}
                item={item}
                focusable={false}
              />
            ))}
          </div>
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.6, ease: EASE }}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !event.currentTarget.contains(next)) {
            setFocusWithin(false);
          }
        }}
        className={cn("w-full bg-background text-foreground", className)}
      >
        {header}
        <div className="flex flex-col gap-3">
          <MarqueeRow
            items={rowOne}
            direction="left"
            speed={safeSpeed}
            paused={paused}
            active={inView}
          />
          {rowTwo.length > 0 ? (
            <MarqueeRow
              items={rowTwo}
              direction="right"
              speed={safeSpeed}
              paused={paused}
              active={inView}
            />
          ) : null}
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default TestimonialMarquee;
