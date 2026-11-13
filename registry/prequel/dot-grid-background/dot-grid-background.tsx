"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* The dots breathe on a long, slow cycle so the background never sits
   completely still. Reduced motion gets the same grid, frozen. */
const DOTS_CSS = `
@keyframes prequel-dots-breathe {
  0%, 100% { opacity: 0.16; }
  50% { opacity: 0.3; }
}
.prequel-dots-breathe {
  animation: prequel-dots-breathe 7s ease-in-out infinite;
}
.prequel-dots-static {
  opacity: 0.22;
}
@media (prefers-reduced-motion: reduce) {
  .prequel-dots-breathe {
    animation: none;
    opacity: 0.22;
  }
}
`;

const DOT_IMAGE =
  "radial-gradient(circle at 1px 1px, var(--muted-foreground) 1px, transparent 0)";
const LIT_DOT_IMAGE =
  "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)";

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type DotGridBackgroundProps = {
  className?: string;
  children?: ReactNode;
  /** Gap between dots, in pixels. Defaults to 22. */
  spacing?: number;
  /** Radius of the pointer highlight, in pixels. Defaults to 220. */
  radius?: number;
};

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function DotGridBackground({
  className,
  children,
  spacing = 22,
  radius = 220,
}: DotGridBackgroundProps) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef({ x: 0, y: 0 });
  const [spot, setSpot] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  /* Coalesce pointer moves into one update per frame. */
  const follow = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    pending.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      setSpot(pending.current);
    });
  };

  const gap = Math.max(10, spacing);
  const glow = Math.max(80, radius);

  const dots: CSSProperties = {
    backgroundImage: DOT_IMAGE,
    backgroundSize: `${gap}px ${gap}px`,
  };

  const lit: CSSProperties = {
    backgroundImage: LIT_DOT_IMAGE,
    backgroundSize: `${gap}px ${gap}px`,
    maskImage: `radial-gradient(circle ${glow}px at ${spot.x}px ${spot.y}px, #000 0%, transparent 100%)`,
    WebkitMaskImage: `radial-gradient(circle ${glow}px at ${spot.x}px ${spot.y}px, #000 0%, transparent 100%)`,
    opacity: active && !reduce ? 0.45 : 0,
  };

  return (
    <div
      ref={ref}
      onPointerMove={follow}
      onPointerEnter={(event) => {
        setActive(true);
        follow(event);
      }}
      onPointerLeave={() => setActive(false)}
      className={cn(
        "relative isolate min-h-[300px] overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className
      )}
    >
      <style>{DOTS_CSS}</style>

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0",
          reduce ? "prequel-dots-static" : "prequel-dots-breathe"
        )}
        style={dots}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
        style={lit}
      />

      <div className="relative">
        {children ?? (
          <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-16 sm:px-10">
            <span className="text-[12.5px] font-medium text-muted-foreground">
              Release 2.4.0
            </span>
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Search is 3.2× faster, and webhooks now retry for 24 hours.
            </h2>
            <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
              Audit logs keep 18 months of history, and the new export job runs
              every night at 02:00 UTC.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* The default section on its own, handy for previews. */
export function DotGridBackgroundDemo() {
  return <DotGridBackground />;
}

export default DotGridBackground;
