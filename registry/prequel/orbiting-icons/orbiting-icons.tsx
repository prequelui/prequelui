"use client";

import {
  useId,
  useState,
  type CSSProperties,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  Boxes,
  Braces,
  Cloud,
  Cpu,
  Database,
  GitBranch,
  Globe,
  Layers,
  Lock,
  Server,
  Terminal,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Each ring turns at its own pace; the icon inside turns back so the glyph
   always stays upright. Hovering or focusing the stage holds the orbit still. */
const ORBIT_CSS = `
@keyframes prequel-orbit-cw { to { transform: rotate(360deg); } }
@keyframes prequel-orbit-ccw { to { transform: rotate(-360deg); } }
@keyframes prequel-orbit-glint { to { transform: rotate(360deg); } }
.prequel-orbit-ring-cw { animation: prequel-orbit-cw linear infinite; }
.prequel-orbit-ring-ccw { animation: prequel-orbit-ccw linear infinite; }
.prequel-orbit-fix-cw { animation: prequel-orbit-cw linear infinite; }
.prequel-orbit-fix-ccw { animation: prequel-orbit-ccw linear infinite; }
.prequel-orbit-glint { animation: prequel-orbit-glint 18s linear infinite; }
.prequel-orbit-stage:hover .prequel-orbit-ring-cw,
.prequel-orbit-stage:hover .prequel-orbit-ring-ccw,
.prequel-orbit-stage:hover .prequel-orbit-fix-cw,
.prequel-orbit-stage:hover .prequel-orbit-fix-ccw,
.prequel-orbit-stage:focus-within .prequel-orbit-ring-cw,
.prequel-orbit-stage:focus-within .prequel-orbit-ring-ccw,
.prequel-orbit-stage:focus-within .prequel-orbit-fix-cw,
.prequel-orbit-stage:focus-within .prequel-orbit-fix-ccw {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .prequel-orbit-ring-cw,
  .prequel-orbit-ring-ccw,
  .prequel-orbit-fix-cw,
  .prequel-orbit-fix-ccw,
  .prequel-orbit-glint {
    animation: none;
  }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type OrbitingIconsItem = {
  /** Stable key, also used as the accessible name. */
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Ring index, 0 (inner) to 2 (outer). Defaults to a round-robin. */
  ring?: 0 | 1 | 2;
};

export type OrbitingIconsProps = {
  className?: string;
  /** Heading above the orbit. */
  title?: string;
  /** One short paragraph under the heading. */
  description?: string;
  /** The nodes placed on the three rings. */
  items?: OrbitingIconsItem[];
  /** Maximum diameter of the orbit, in pixels. Defaults to 460. */
  size?: number;
  /** Speed multiplier for every ring. Defaults to 1. */
  speed?: number;
};

/* ------------------------------------------------------------------ */
/* defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: OrbitingIconsItem[] = [
  {
    id: "database",
    label: "Database",
    description: "Managed Postgres with point-in-time restore.",
    icon: Database,
    ring: 0,
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Run scripts against any environment.",
    icon: Terminal,
    ring: 0,
  },
  {
    id: "git-branch",
    label: "Branches",
    description: "Preview every branch on its own URL.",
    icon: GitBranch,
    ring: 0,
  },
  {
    id: "cloud",
    label: "Deploy",
    description: "Ship to the edge in 40 seconds.",
    icon: Cloud,
    ring: 1,
  },
  {
    id: "boxes",
    label: "Components",
    description: "Reusable pieces across every project.",
    icon: Boxes,
    ring: 1,
  },
  {
    id: "workflow",
    label: "Automations",
    description: "Jobs that retry on their own.",
    icon: Workflow,
    ring: 1,
  },
  {
    id: "braces",
    label: "SDKs",
    description: "Typed clients for every language.",
    icon: Braces,
    ring: 1,
  },
  {
    id: "globe",
    label: "Routing",
    description: "Anycast routing across six regions.",
    icon: Globe,
    ring: 2,
  },
  {
    id: "lock",
    label: "Identity",
    description: "SSO, SCIM and a full audit log.",
    icon: Lock,
    ring: 2,
  },
  {
    id: "cpu",
    label: "Compute",
    description: "Dedicated capacity for long jobs.",
    icon: Cpu,
    ring: 2,
  },
  {
    id: "server",
    label: "Workers",
    description: "Private workers inside your network.",
    icon: Server,
    ring: 2,
  },
  {
    id: "layers",
    label: "Cache",
    description: "One cache shared by every service.",
    icon: Layers,
    ring: 2,
  },
];

const RINGS = [
  { radius: 27, duration: 46, direction: -1, offset: 18 },
  { radius: 36, duration: 62, direction: 1, offset: 54 },
  { radius: 42, duration: 78, direction: -1, offset: 30 },
] as const;

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function OrbitingIcons({
  className,
  title = "One orbit, every integration.",
  description = "Connect the tools your team already runs on. Hover or focus a node to hold the orbit and read what it unlocks.",
  items = DEFAULT_ITEMS,
  size = 460,
  speed = 1,
}: OrbitingIconsProps) {
  const titleId = useId();
  const reduce = Boolean(useReducedMotion());
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  const safeSpeed = Number.isFinite(speed) ? Math.max(0.25, speed) : 1;
  const activeIndex = items.length > 0 ? Math.min(selected, items.length - 1) : -1;
  const active = activeIndex >= 0 ? items[activeIndex] : undefined;
  const ActiveIcon = active?.icon;

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6",
        className
      )}
    >
      <style>{ORBIT_CSS}</style>

      <div className="flex flex-col gap-1 text-center">
        <h2
          id={titleId}
          className="text-balance text-[20px] font-semibold tracking-tight sm:text-[22px]"
        >
          {title}
        </h2>
        <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div
        className="prequel-orbit-stage relative mx-auto mt-5 aspect-square w-full"
        style={{ maxWidth: size }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false);
          }
        }}
      >
        {/* static ring tracks */}
        <div aria-hidden="true" className="absolute inset-[8%] rounded-full border border-border/70" />
        <div aria-hidden="true" className="absolute inset-[14%] rounded-full border border-border/70" />
        <div aria-hidden="true" className="absolute inset-[23%] rounded-full border border-border/70" />

        {RINGS.map((ring, ringIndex) => {
          const ringItems = items
            .map((item, index) => ({ item, index }))
            .filter(({ item, index }) => (item.ring ?? index % 3) === ringIndex);
          if (ringItems.length === 0) return null;

          const duration = ring.duration / safeSpeed;
          const ringClass = reduce
            ? undefined
            : ring.direction === 1
              ? "prequel-orbit-ring-cw"
              : "prequel-orbit-ring-ccw";
          const fixClass = reduce
            ? undefined
            : ring.direction === 1
              ? "prequel-orbit-fix-ccw"
              : "prequel-orbit-fix-cw";
          const durationStyle: CSSProperties = { animationDuration: `${duration}s` };

          return (
            <div
              key={ringIndex}
              className={cn("pointer-events-none absolute inset-0", ringClass)}
              style={durationStyle}
            >
              {ringItems.map(({ item, index }, position) => {
                const degrees =
                  ring.offset + (position / ringItems.length) * 360;
                const radians = (degrees * Math.PI) / 180;
                /* Round the percentage so server and client render the
                   exact same style string (no hydration mismatch). */
                const left = Math.round((50 + Math.cos(radians) * ring.radius) * 1000) / 1000;
                const top = Math.round((50 + Math.sin(radians) * ring.radius) * 1000) / 1000;
                const Icon = item.icon;
                const isActive = index === activeIndex;

                return (
                  <span
                    key={item.id}
                    className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <button
                      type="button"
                      aria-label={`${item.label}. ${item.description}`}
                      aria-pressed={isActive}
                      onClick={() => setSelected(index)}
                      onFocus={() => setSelected(index)}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border bg-card transition-colors duration-200 sm:h-9 sm:w-9",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive
                          ? "border-foreground text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
                        fixClass
                      )}
                      style={durationStyle}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
            </div>
          );
        })}

        {/* centre lens, with the selected node repeated inside */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 flex aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-border bg-card px-2 text-center"
        >
          {!reduce ? (
            <span className="prequel-orbit-glint absolute inset-0 rounded-full">
              <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
            </span>
          ) : (
            <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={active?.id ?? "empty"}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.85 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
              className="flex flex-col items-center gap-1"
            >
              {ActiveIcon ? (
                <ActiveIcon className="h-5 w-5 text-foreground" aria-hidden="true" />
              ) : null}
              {active ? (
                <span className="max-w-full truncate text-[10.5px] font-medium text-foreground">
                  {active.label}
                </span>
              ) : null}
            </motion.span>
          </AnimatePresence>

          <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-success" />
            {paused ? "Paused" : "Connected"}
          </span>
        </div>
      </div>

      <div className="mx-auto mt-4 min-h-[44px] max-w-md text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active?.id ?? "empty"}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
          >
            {active ? (
              <>
                <p className="text-[13px] font-medium text-foreground">{active.label}</p>
                <p className="mx-auto mt-0.5 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
                  {active.description}
                </p>
              </>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">
                Add a few items to draw the orbit.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* Ready-made instance for previews and docs. */
export function OrbitingIconsDemo() {
  return <OrbitingIcons />;
}

export default OrbitingIcons;
