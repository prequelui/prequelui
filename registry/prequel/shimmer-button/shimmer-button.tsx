"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* The sweep runs once on entrance and again on hover or keyboard focus.
   The ripple is driven entirely by CSS and removes itself on animationend,
   so no timers are left behind. */
const SHIMMER_CSS = `
.prequel-shimmer-band {
  position: absolute;
  top: -12%;
  left: -20%;
  height: 124%;
  width: 46%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    color-mix(in oklab, currentColor 24%, transparent) 50%,
    transparent 100%
  );
  transform: translateX(-180%) skewX(-18deg);
  opacity: 0;
  pointer-events: none;
}
.prequel-shimmer-group:hover .prequel-shimmer-band,
.prequel-shimmer-group:focus-visible .prequel-shimmer-band,
.prequel-shimmer-band[data-auto="true"] {
  opacity: 1;
  animation: prequel-shimmer-sweep 900ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes prequel-shimmer-sweep {
  from { transform: translateX(-180%) skewX(-18deg); }
  to { transform: translateX(320%) skewX(-18deg); }
}
.prequel-shimmer-ripple {
  position: absolute;
  border-radius: 9999px;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
  animation: prequel-shimmer-ripple 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes prequel-shimmer-ripple {
  from { transform: scale(0); opacity: 0.28; }
  to { transform: scale(2.2); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .prequel-shimmer-band,
  .prequel-shimmer-group:hover .prequel-shimmer-band,
  .prequel-shimmer-group:focus-visible .prequel-shimmer-band,
  .prequel-shimmer-band[data-auto="true"] {
    animation: none;
    opacity: 0;
  }
  .prequel-shimmer-ripple {
    animation: none;
    opacity: 0;
  }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type ShimmerButtonProps = {
  className?: string;
  /** Visible label. Defaults to "Deploy to production". */
  children?: ReactNode;
  /** Visual style. Defaults to "solid". */
  variant?: "solid" | "outline";
  /** Height and padding. Defaults to "md". */
  size?: "sm" | "md" | "lg";
  /** Renders a link instead of a button when set. */
  href?: string;
  /** Click handler for both the button and the link. */
  onClick?: () => void;
  /** Native button type. Defaults to "button". */
  type?: "button" | "submit" | "reset";
  /** Disables the button. Links keep their href. */
  disabled?: boolean;
  /** Accessible name when the visible label is not enough. */
  ariaLabel?: string;
  /** Show a ripple from the pointer or the centre of the button. Defaults to true. */
  ripple?: boolean;
};

type Ripple = {
  id: number;
  x: number;
  y: number;
  size: number;
};

const VARIANTS = {
  solid: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-10 px-4 text-[13.5px]",
  lg: "h-12 px-6 text-[15px]",
} as const;

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function ShimmerButton({
  className,
  children = "Deploy to production",
  variant = "solid",
  size = "md",
  href,
  onClick,
  type = "button",
  disabled = false,
  ariaLabel,
  ripple = true,
}: ShimmerButtonProps) {
  const reduce = Boolean(useReducedMotion());
  const [autoSweep, setAutoSweep] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextRipple = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(() => setAutoSweep(true), 520);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    onClick?.();
    if (reduce || !ripple) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const keyboard = event.detail === 0;
    const size = Math.max(rect.width, rect.height) * 1.8;
    const id = nextRipple.current++;

    setRipples((current) => [
      ...current.slice(-2),
      {
        id,
        x: keyboard ? rect.width / 2 : event.clientX - rect.left,
        y: keyboard ? rect.height / 2 : event.clientY - rect.top,
        size,
      },
    ]);
  };

  const removeRipple = (id: number) => {
    setRipples((current) => current.filter((item) => item.id !== id));
  };

  const classes = cn(
    "prequel-shimmer-group relative inline-flex select-none items-center justify-center overflow-hidden rounded-lg font-medium",
    "transition-[background-color,transform] duration-200 active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className
  );

  const inner = (
    <>
      <span
        aria-hidden="true"
        className="prequel-shimmer-band"
        data-auto={autoSweep ? "true" : "false"}
        onAnimationEnd={() => setAutoSweep(false)}
      />
      {ripples.map((item) => (
        <span
          key={item.id}
          aria-hidden="true"
          className="prequel-shimmer-ripple"
          style={{
            left: item.x - item.size / 2,
            top: item.y - item.size / 2,
            width: item.size,
            height: item.size,
          }}
          onAnimationEnd={() => removeRipple(item.id)}
        />
      ))}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </>
  );

  if (href) {
    return (
      <>
        <style>{SHIMMER_CSS}</style>
        <a
          href={href}
          onClick={handleClick}
          aria-label={ariaLabel}
          aria-disabled={disabled || undefined}
          className={classes}
        >
          {inner}
        </a>
      </>
    );
  }

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <button
        type={type}
        onClick={handleClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={classes}
      >
        {inner}
      </button>
    </>
  );
}

/* Two actions side by side, handy for previews. */
export function ShimmerButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ShimmerButton>Deploy to production</ShimmerButton>
      <ShimmerButton variant="outline" size="md">
        View the release
      </ShimmerButton>
    </div>
  );
}

export default ShimmerButton;
