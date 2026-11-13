"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* A single keyframe, shared by every instance of the block. The gradient
   angle is registered so it can animate smoothly; the mask keeps only the
   one-pixel border, never the fill. */
const SHINE_CSS = `
@property --prequel-shine-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
@keyframes prequel-shine-turn {
  to { --prequel-shine-angle: 360deg; }
}
.prequel-shine-border {
  padding: 1px;
  opacity: 0;
  background: conic-gradient(
    from var(--prequel-shine-angle),
    transparent 0deg,
    transparent 285deg,
    color-mix(in oklab, currentColor 85%, transparent) 330deg,
    transparent 360deg
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  transition: opacity 300ms ease;
  animation: prequel-shine-turn 2.4s linear infinite;
  animation-play-state: paused;
}
.prequel-shine-group:hover .prequel-shine-border,
.prequel-shine-group:focus-visible .prequel-shine-border {
  opacity: 1;
  animation-play-state: running;
}
@media (prefers-reduced-motion: reduce) {
  .prequel-shine-border { animation: none; }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type ShineButtonProps = {
  className?: string;
  children?: ReactNode;
  /** Visual style. Defaults to "default". */
  variant?: "default" | "outline";
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
};

const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted/60",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-10 px-4 text-[13.5px]",
  lg: "h-12 px-6 text-[15px]",
} as const;

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function ShineButton({
  className,
  children = "Read the changelog",
  variant = "default",
  size = "md",
  href,
  onClick,
  type = "button",
  disabled = false,
  ariaLabel,
}: ShineButtonProps) {
  const classes = cn(
    "prequel-shine-group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-colors duration-200",
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
        className="prequel-shine-border pointer-events-none absolute inset-0 rounded-[inherit]"
      />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </>
  );

  if (href) {
    return (
      <>
        <style>{SHINE_CSS}</style>
        <a
          href={href}
          onClick={onClick}
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
      <style>{SHINE_CSS}</style>
      <button
        type={type}
        onClick={onClick}
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
export function ShineButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ShineButton href="/blocks">Browse the blocks</ShineButton>
      <ShineButton href="/changelog" variant="outline">
        Read the changelog
      </ShineButton>
    </div>
  );
}

export default ShineButton;
