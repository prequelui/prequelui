"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type DotPatternBackgroundProps = {
  className?: string;
  /** Content rendered above the dots. */
  children?: ReactNode;
  /** Distance between dot centres, in pixels. Defaults to 24. */
  spacing?: number;
  /** Radius of the pointer's influence, in pixels. Defaults to 150. */
  radius?: number;
  /** Maximum push away from the pointer, in pixels. Defaults to 20. */
  strength?: number;
  /** Base dot radius, in pixels. Defaults to 1.5. */
  dotSize?: number;
};

type Dot = {
  x: number;
  y: number;
  ox: number;
  oy: number;
};

type Point = { x: number; y: number };

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function DotPatternBackground({
  className,
  children,
  spacing = 24,
  radius = 150,
  strength = 20,
  dotSize = 1.5,
}: DotPatternBackgroundProps) {
  const reduce = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const gap = Math.max(18, spacing);
    const influence = Math.max(48, radius);
    const push = Math.max(0, strength);
    const baseRadius = Math.max(0.75, dotSize);

    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let color: string | null = null;
    let pointer: Point | null = null;
    let rect: DOMRect | null = null;
    let frame: number | null = null;
    let running = false;
    let dirty = true;

    const buildDots = () => {
      dots = [];
      if (width < 1 || height < 1) return;

      const columns = Math.max(1, Math.floor(width / gap) + 1);
      const rows = Math.max(1, Math.floor(height / gap) + 1);
      const originX = (width - (columns - 1) * gap) / 2;
      const originY = (height - (rows - 1) * gap) / 2;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          dots.push({
            x: originX + column * gap,
            y: originY + row * gap,
            ox: 0,
            oy: 0,
          });
        }
      }
    };

    const paint = () => {
      const ctx = context;
      if (dirty || !color) {
        color = getComputedStyle(canvas).color || null;
        dirty = false;
      }

      ctx.clearRect(0, 0, width, height);
      if (!color) return;
      ctx.fillStyle = color;

      for (const dot of dots) {
        const distance = Math.hypot(dot.ox, dot.oy);
        const energy = push > 0 ? Math.min(1, distance / push) : 0;

        ctx.globalAlpha = 0.22 + energy * 0.5;
        ctx.beginPath();
        ctx.arc(
          dot.x + dot.ox,
          dot.y + dot.oy,
          baseRadius + energy * 1.35,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    const step = () => {
      frame = null;
      let moving = false;

      if (!pointer) {
        for (const dot of dots) {
          const nextX = dot.ox + (0 - dot.ox) * 0.16;
          const nextY = dot.oy + (0 - dot.oy) * 0.16;
          if (Math.abs(nextX - dot.ox) > 0.01 || Math.abs(nextY - dot.oy) > 0.01) {
            moving = true;
          }
          dot.ox = nextX;
          dot.oy = nextY;
        }
      } else {
        const target = pointer;

        for (const dot of dots) {
          const dx = dot.x - target.x;
          const dy = dot.y - target.y;
          const distance = Math.hypot(dx, dy);

          let tx = 0;
          let ty = 0;

          if (distance < influence && distance > 0.5) {
            const force = (1 - distance / influence) * push;
            tx = (dx / distance) * force;
            ty = (dy / distance) * force;
          }

          const nextX = dot.ox + (tx - dot.ox) * 0.16;
          const nextY = dot.oy + (ty - dot.oy) * 0.16;
          if (Math.abs(nextX - dot.ox) > 0.01 || Math.abs(nextY - dot.oy) > 0.01) {
            moving = true;
          }
          dot.ox = nextX;
          dot.oy = nextY;
        }
      }

      paint();

      if (moving || dirty) {
        frame = window.requestAnimationFrame(step);
      } else {
        running = false;
      }
    };

    const ensureLoop = () => {
      if (reduce || running) return;
      running = true;
      frame = window.requestAnimationFrame(step);
    };

    const resize = () => {
      const bounds = root.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(0, bounds.width);
      height = Math.max(0, bounds.height);
      rect = bounds;

      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildDots();
      dirty = true;
      paint();
      if (!reduce) ensureLoop();
    };

    const movePointer = (event: PointerEvent) => {
      if (reduce) return;
      if (!rect) rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (!pointer) pointer = { x, y };
      else {
        pointer.x = x;
        pointer.y = y;
      }
      ensureLoop();
    };

    const enterPointer = (event: PointerEvent) => {
      rect = root.getBoundingClientRect();
      movePointer(event);
    };

    const leavePointer = () => {
      pointer = null;
      ensureLoop();
    };

    const upPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        pointer = null;
        ensureLoop();
      }
    };

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => resize());
      observer.observe(root);

      resize();

      /* Watch the root and its ancestors only: a theme switch changes the
         tokens on one of them, while unrelated animations stay invisible. */
      const themeObserver = new MutationObserver(() => {
        dirty = true;
        if (reduce) paint();
        else ensureLoop();
      });

      for (
        let node: Element | null = root;
        node;
        node = node.parentElement
      ) {
        themeObserver.observe(node, {
          attributes: true,
          attributeFilter: ["class", "style", "data-theme"],
        });
      }

      root.addEventListener("pointerenter", enterPointer);
      root.addEventListener("pointermove", movePointer);
      root.addEventListener("pointerdown", enterPointer);
      root.addEventListener("pointerleave", leavePointer);
      root.addEventListener("pointercancel", leavePointer);
      root.addEventListener("pointerup", upPointer);

      return () => {
        observer.disconnect();
        themeObserver.disconnect();
        root.removeEventListener("pointerenter", enterPointer);
        root.removeEventListener("pointermove", movePointer);
        root.removeEventListener("pointerdown", enterPointer);
        root.removeEventListener("pointerleave", leavePointer);
        root.removeEventListener("pointercancel", leavePointer);
        root.removeEventListener("pointerup", upPointer);
        if (frame !== null) window.cancelAnimationFrame(frame);
        running = false;
      };
    }

    resize();

    root.addEventListener("pointerenter", enterPointer);
    root.addEventListener("pointermove", movePointer);
    root.addEventListener("pointerdown", enterPointer);
    root.addEventListener("pointerleave", leavePointer);
    root.addEventListener("pointercancel", leavePointer);
    root.addEventListener("pointerup", upPointer);

    return () => {
      root.removeEventListener("pointerenter", enterPointer);
      root.removeEventListener("pointermove", movePointer);
      root.removeEventListener("pointerdown", enterPointer);
      root.removeEventListener("pointerleave", leavePointer);
      root.removeEventListener("pointercancel", leavePointer);
      root.removeEventListener("pointerup", upPointer);
      if (frame !== null) window.cancelAnimationFrame(frame);
      running = false;
    };
  }, [reduce, spacing, radius, strength, dotSize]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative isolate min-h-[320px] overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <div className="relative">
        {children ?? (
          <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-16 sm:px-10">
            <span className="text-[12.5px] font-medium text-muted-foreground">
              Build metrics
            </span>
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Deploys finish 18% faster this month.
            </h2>
            <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
              Median build time is 94 seconds across 2,847 runs, and the slowest
              queue is down to six jobs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Ready-made instance for previews and docs. */
export function DotPatternBackgroundDemo() {
  return <DotPatternBackground />;
}

export default DotPatternBackground;
