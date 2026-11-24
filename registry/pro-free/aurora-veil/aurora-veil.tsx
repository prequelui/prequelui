"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

export type AuroraVeilProps = {
  className?: string;
  /** Content placed above the curtain. */
  children?: ReactNode;
  /** Curtain strength, 0–1. Default 0.72. */
  intensity?: number;
  /** Seconds per sway. Default 26. */
  drift?: number;
  /** Noise layer opacity, 0–0.4. Default 0.1. */
  grain?: number;
};

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function noiseUrl(size: number) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/>` +
    `</filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * An aurora curtain: three tall, softly folded veils of theme colour sway at
 * different speeds behind a grained haze. The folds are drawn with repeating
 * token tints instead of a flat blur, so the light keeps a textile texture.
 */
export function AuroraVeil({
  className,
  children,
  intensity = 0.72,
  drift = 26,
  grain = 0.1,
}: AuroraVeilProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const scope = `aurora-${rawId || "veil"}`;

  const strength = clamp(intensity, 0, 1);
  const seconds = clamp(drift, 8, 60);
  const noise = clamp(grain, 0, 0.4);

  const style: CSSVars = {
    "--av-i": strength,
    "--av-drift": `${seconds}s`,
    "--av-grain": noise,
  };

  const image = useMemo(() => noiseUrl(150), []);

  const css = `
.${scope} {
  --av-o: calc(var(--av-i, .72) * .36);
}
:is(.dark, [data-theme="dark"]) .${scope} {
  --av-o: calc(var(--av-i, .72) * .64);
}

.${scope} .av-veil {
  position: absolute;
  display: block;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  filter: blur(30px) saturate(1.08);
  mix-blend-mode: multiply;
  opacity: var(--av-o);
  transform-origin: 50% 100%;
  will-change: transform;
}
:is(.dark, [data-theme="dark"]) .${scope} .av-veil {
  mix-blend-mode: screen;
}

.${scope} .av-v1 {
  width: 50%;
  height: 158%;
  left: -8%;
  top: -34%;
  background:
    repeating-linear-gradient(90deg,
      transparent 0 8.4%,
      color-mix(in oklab, var(--chart-4) 32%, transparent) 8.8% 9.6%,
      transparent 10% 17.4%),
    linear-gradient(180deg,
      transparent 2%,
      color-mix(in oklab, var(--success) 52%, transparent) 28%,
      color-mix(in oklab, var(--chart-2) 44%, transparent) 58%,
      transparent 91%);
  animation: ${scope}-v1 var(--av-drift, 26s) cubic-bezier(.45,.05,.55,.95) infinite alternate;
}

.${scope} .av-v2 {
  width: 42%;
  height: 170%;
  left: 27%;
  top: -40%;
  background:
    repeating-linear-gradient(90deg,
      transparent 0 11%,
      color-mix(in oklab, var(--success) 28%, transparent) 11.6% 12.4%,
      transparent 13% 21%),
    linear-gradient(180deg,
      transparent 4%,
      color-mix(in oklab, var(--chart-2) 50%, transparent) 24%,
      color-mix(in oklab, var(--success) 40%, transparent) 52%,
      transparent 88%);
  animation: ${scope}-v2 var(--av-drift, 26s) cubic-bezier(.45,.05,.55,.95) infinite alternate;
  animation-delay: calc(var(--av-drift, 26s) * -.34);
}

.${scope} .av-v3 {
  width: 44%;
  height: 150%;
  right: -9%;
  top: -28%;
  background:
    repeating-linear-gradient(90deg,
      transparent 0 9.6%,
      color-mix(in oklab, var(--chart-2) 34%, transparent) 10% 10.8%,
      transparent 11.4% 19%),
    linear-gradient(180deg,
      transparent 2%,
      color-mix(in oklab, var(--chart-1) 46%, transparent) 30%,
      color-mix(in oklab, var(--chart-4) 40%, transparent) 62%,
      transparent 94%);
  animation: ${scope}-v3 var(--av-drift, 26s) cubic-bezier(.45,.05,.55,.95) infinite alternate;
  animation-delay: calc(var(--av-drift, 26s) * -.68);
}

@keyframes ${scope}-v1 {
  from { transform: translate3d(-2.4%, 0, 0) rotate(-4deg) skewX(-3deg); }
  to { transform: translate3d(3.2%, -1%, 0) rotate(2deg) skewX(2deg); }
}
@keyframes ${scope}-v2 {
  from { transform: translate3d(2%, 1%, 0) rotate(3deg) skewX(2deg); }
  to { transform: translate3d(-2.6%, -1%, 0) rotate(-3deg) skewX(-2deg); }
}
@keyframes ${scope}-v3 {
  from { transform: translate3d(-3%, -1%, 0) rotate(5deg) skewX(3deg); }
  to { transform: translate3d(2%, 1%, 0) rotate(-2deg) skewX(-2deg); }
}

.${scope} .av-noise {
  background-repeat: repeat;
  background-size: 150px 150px;
  mix-blend-mode: soft-light;
  opacity: var(--av-grain, .1);
}

.${scope} .av-fade {
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--background) 66%, transparent) 0%,
    transparent 20%,
    transparent 76%,
    color-mix(in oklab, var(--background) 76%, transparent) 100%);
}

@media (prefers-reduced-motion: reduce) {
  .${scope} .av-veil { animation: none !important; }
  .${scope} .av-v1 { transform: rotate(-2deg); }
  .${scope} .av-v2 { transform: rotate(1deg); }
  .${scope} .av-v3 { transform: rotate(2deg); }
}
  `;

  return (
    <div
      className={cn(
        scope,
        "relative isolate min-h-[320px] w-full overflow-hidden bg-background",
        className
      )}
      style={style}
    >
      <style>{css}</style>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="av-veil av-v1" />
        <div className="av-veil av-v2" />
        <div className="av-veil av-v3" />
        <div
          className={`${scope} av-noise absolute inset-0`}
          style={{ backgroundImage: image }}
        />
        <div className={`${scope} av-fade absolute inset-0`} />
      </div>

      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

export default AuroraVeil;
