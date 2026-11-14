"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* The spotlight reads its position from two custom properties on the card.
   Pointer moves are coalesced into one animation frame, so React never
   re-renders while the light travels across the surface. */
const SPOTLIGHT_CSS = `
.prequel-spotlight-surface {
  background: radial-gradient(
    circle var(--spot-radius, 260px) at var(--spot-x, 50%) var(--spot-y, 50%),
    color-mix(in oklab, var(--card-foreground) 9%, transparent),
    transparent 72%
  );
  opacity: 0;
  transition: opacity 320ms ease-out;
}
.prequel-spotlight-border {
  padding: 1px;
  background: radial-gradient(
    circle calc(var(--spot-radius, 260px) * 0.72) at var(--spot-x, 50%) var(--spot-y, 50%),
    color-mix(in oklab, var(--card-foreground) 58%, transparent),
    color-mix(in oklab, var(--card-foreground) 16%, transparent) 56%,
    transparent 76%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 320ms ease-out;
}
.prequel-spotlight:hover .prequel-spotlight-surface,
.prequel-spotlight:focus-visible .prequel-spotlight-surface,
.prequel-spotlight:focus-within .prequel-spotlight-surface {
  opacity: 1;
}
.prequel-spotlight:hover .prequel-spotlight-border,
.prequel-spotlight:focus-visible .prequel-spotlight-border,
.prequel-spotlight:focus-within .prequel-spotlight-border {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .prequel-spotlight-surface,
  .prequel-spotlight-border {
    transition: none;
  }
  .prequel-spotlight:hover .prequel-spotlight-surface,
  .prequel-spotlight:focus-visible .prequel-spotlight-surface,
  .prequel-spotlight:focus-within .prequel-spotlight-surface {
    opacity: 0;
  }
  .prequel-spotlight:hover .prequel-spotlight-border,
  .prequel-spotlight:focus-visible .prequel-spotlight-border,
  .prequel-spotlight:focus-within .prequel-spotlight-border {
    opacity: 0.45;
  }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type SpotlightCardProps = {
  className?: string;
  /** Replaces the default demo body. */
  children?: ReactNode;
  /** Headline shown in the default demo body. */
  title?: string;
  /** Supporting sentence shown in the default demo body. */
  description?: string;
  /** Radius of the spotlight and border light, in pixels. Defaults to 260. */
  radius?: number;
  /** Accessible name for the card region. */
  ariaLabel?: string;
};

type SpotlightStyle = CSSProperties & {
  "--spot-radius": string;
};

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function SpotlightCard({
  className,
  children,
  title = "Every request, in one calm view.",
  description = "Traces, logs and latency for Northwind Labs' edge services, without opening four tabs.",
  radius = 260,
  ariaLabel = "Spotlight card",
}: SpotlightCardProps) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);
  const point = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  const follow = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    point.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      const node = ref.current;
      if (!node) return;
      node.style.setProperty("--spot-x", `${point.current.x}px`);
      node.style.setProperty("--spot-y", `${point.current.y}px`);
    });
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
      onPointerEnter={follow}
      onPointerMove={follow}
      style={{ "--spot-radius": `${Math.max(120, radius)}px` } as SpotlightStyle}
      className={cn(
        "prequel-spotlight relative isolate overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <style>{SPOTLIGHT_CSS}</style>

      <span
        aria-hidden="true"
        className="prequel-spotlight-surface pointer-events-none absolute inset-0 rounded-[inherit]"
      />
      <span
        aria-hidden="true"
        className="prequel-spotlight-border pointer-events-none absolute inset-0 rounded-[inherit]"
      />

      <div className="relative">
        {children ?? (
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                  <span className="relative flex h-2 w-2 flex-none">
                    <span className="absolute inset-0 rounded-full bg-success/25" />
                    <span className="absolute inset-[3px] rounded-full bg-success" />
                  </span>
                  All systems normal
                </div>
                <h3 className="mt-3 max-w-[26ch] text-balance text-[20px] font-semibold leading-snug tracking-[-0.02em] sm:text-[22px]">
                  {title}
                </h3>
                <p className="mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>

              <div className="flex-none text-left sm:text-right">
                <div className="text-[11.5px] text-muted-foreground">p95 latency</div>
                <div className="mt-0.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums">
                  48
                  <span className="ml-1 text-[13px] font-medium text-muted-foreground">
                    ms
                  </span>
                </div>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-background/50">
              <div className="min-w-0 px-3 py-3 sm:px-4">
                <dt className="truncate text-[11px] text-muted-foreground">Requests</dt>
                <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">2.84M</dd>
              </div>
              <div className="min-w-0 px-3 py-3 sm:px-4">
                <dt className="truncate text-[11px] text-muted-foreground">Errors</dt>
                <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">0.03%</dd>
              </div>
              <div className="min-w-0 px-3 py-3 sm:px-4">
                <dt className="truncate text-[11px] text-muted-foreground">Regions</dt>
                <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">14</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
              <span>Updated 42 seconds ago</span>
              <span className="tabular-nums">312 traces · 1.4 GB logs today</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* The default card on its own, handy for previews. */
export function SpotlightCardDemo() {
  return <SpotlightCard />;
}

export default SpotlightCard;
