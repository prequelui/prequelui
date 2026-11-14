"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  Activity,
  Bell,
  Code2,
  Database,
  Inbox,
  Network,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const HUB_KEY = "__hub";

/* the travelling light on each connection */
const KEYFRAMES = `
@keyframes prequel-beam-travel {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -1; }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type BeamNode = {
  id: string;
  label: string;
  /** One short sentence about what happens at this node. */
  detail: string;
  /** Optional Lucide icon; a plain node reads fine without one. */
  icon?: LucideIcon;
  /** Primary value shown in the inspector row. */
  value: string;
  /** Small context beneath the value. */
  meta: string;
};

export type AnimatedBeamProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Nodes feeding the gateway, stacked on the left. */
  sources?: BeamNode[];
  /** Nodes the gateway fans out to, stacked on the right. */
  destinations?: BeamNode[];
  /** Label under the gateway lens. */
  hubLabel?: string;
  /** Seconds for one light to cross a connection. Defaults to 3.4. */
  speed?: number;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_SOURCES: BeamNode[] = [
  {
    id: "ingest",
    label: "Ingest",
    detail: "HTTP and webhook intake, verified at the edge.",
    icon: Inbox,
    value: "4,218/min",
    meta: "1.4M today",
  },
  {
    id: "sdk",
    label: "SDK",
    detail: "Browser and server SDKs sending batched events.",
    icon: Code2,
    value: "2,906/min",
    meta: "18.2k active keys",
  },
  {
    id: "replay",
    label: "Replay",
    detail: "Retries drained from the dead-letter lane.",
    icon: RotateCcw,
    value: "37/min",
    meta: "0.9% of total",
  },
];

const DEFAULT_DESTINATIONS: BeamNode[] = [
  {
    id: "warehouse",
    label: "Warehouse",
    detail: "Append-only cold storage, partitioned by day.",
    icon: Database,
    value: "1.2 ms",
    meta: "p95 · 4.8 TB written",
  },
  {
    id: "alerts",
    label: "Alerts",
    detail: "Pager and chat delivery with signed payloads.",
    icon: Bell,
    value: "38 ms",
    meta: "p95 · 99.98% delivered",
  },
  {
    id: "analytics",
    label: "Analytics",
    detail: "Session and funnel rollups for the live boards.",
    icon: Activity,
    value: "21 ms",
    meta: "p95 · 312 ms lag",
  },
];

/* ------------------------------------------------------------------ */
/* geometry                                                            */
/* ------------------------------------------------------------------ */

type Point = { x: number; y: number };

type BeamEdge = {
  id: string;
  nodeId: string;
  d: string;
};

function curve(a: Point, b: Point) {
  const mid = a.x + (b.x - a.x) * 0.5;
  const x1 = a.x.toFixed(1);
  const y1 = a.y.toFixed(1);
  const x2 = b.x.toFixed(1);
  const y2 = b.y.toFixed(1);
  const xm = mid.toFixed(1);
  return `M ${x1} ${y1} C ${xm} ${y1} ${xm} ${y2} ${x2} ${y2}`;
}

/* ------------------------------------------------------------------ */
/* the block                                                           */
/* ------------------------------------------------------------------ */

export function AnimatedBeam({
  className,
  title = "Event routing",
  description = "Every event, checked once and delivered everywhere.",
  sources = DEFAULT_SOURCES,
  destinations = DEFAULT_DESTINATIONS,
  hubLabel = "Router",
  speed = 3.4,
}: AnimatedBeamProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;
  const headingId = useId();

  const safeSources = sources.length > 0 ? sources : DEFAULT_SOURCES;
  const safeDestinations =
    destinations.length > 0 ? destinations : DEFAULT_DESTINATIONS;
  const safeSpeed = Math.max(1, speed);

  const [edges, setEdges] = useState<BeamEdge[]>([]);
  const [selectedId, setSelectedId] = useState(
    () => safeSources[0]?.id ?? safeDestinations[0]?.id ?? "",
  );
  const [hoverId, setHoverId] = useState<string | null>(null);

  const allNodes = [...safeSources, ...safeDestinations];
  const activeId = hoverId ?? selectedId;
  const activeNode =
    allNodes.find((node) => node.id === activeId) ?? allNodes[0];

  const layoutKey = [
    ...safeSources.map((node) => node.id),
    HUB_KEY,
    ...safeDestinations.map((node) => node.id),
  ].join("|");

  /* Measure the real DOM nodes so the beams follow the responsive grid. */
  useEffect(() => {
    const container = diagramRef.current;
    if (!container) return;

    let frame = 0;

    const measure = () => {
      const box = container.getBoundingClientRect();
      const points = new Map<string, Point>();

      nodeEls.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        points.set(id, {
          x: rect.left - box.left + rect.width / 2,
          y: rect.top - box.top + rect.height / 2,
        });
      });

      const hub = points.get(HUB_KEY);
      if (!hub) return;

      const next: BeamEdge[] = [];
      for (const node of safeSources) {
        const point = points.get(node.id);
        if (point) {
          next.push({
            id: `in-${node.id}`,
            nodeId: node.id,
            d: curve(point, hub),
          });
        }
      }
      for (const node of safeDestinations) {
        const point = points.get(node.id);
        if (point) {
          next.push({
            id: `out-${node.id}`,
            nodeId: node.id,
            d: curve(hub, point),
          });
        }
      }

      setEdges(next);
    };

    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    schedule();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    observer?.observe(container);
    nodeEls.current.forEach((element) => observer?.observe(element));
    window.addEventListener("resize", schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [layoutKey, safeSources, safeDestinations]);

  const registerNode = (id: string) => (element: HTMLElement | null) => {
    if (element) nodeEls.current.set(id, element);
    else nodeEls.current.delete(id);
  };

  const rowCount = Math.max(safeSources.length, safeDestinations.length, 1);
  const hubRow = Math.ceil(rowCount / 2);

  const chip = (node: BeamNode, index: number, side: "left" | "right") => {
    const Icon = node.icon;
    const isActive = activeId === node.id;

    return (
      <motion.button
        key={node.id}
        ref={registerNode(node.id)}
        type="button"
        aria-pressed={selectedId === node.id}
        onClick={() => setSelectedId(node.id)}
        onPointerEnter={() => setHoverId(node.id)}
        onPointerLeave={() => setHoverId(null)}
        onFocus={() => setHoverId(node.id)}
        onBlur={() => setHoverId(null)}
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce || show ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: reduce ? 0 : 0.45,
          delay: reduce ? 0 : 0.12 + index * 0.06,
          ease: EASE,
        }}
        style={{ gridColumn: side === "left" ? 1 : 3, gridRow: index + 1 }}
        className={cn(
          "group flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          side === "left" ? "justify-end text-right" : "justify-start",
          isActive
            ? "border-foreground/25 bg-muted text-foreground"
            : "border-border bg-card text-muted-foreground hover:border-muted-foreground/35 hover:text-foreground"
        )}
      >
        {Icon ? (
          <Icon
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0"
            strokeWidth={1.6}
          />
        ) : null}
        <span className="truncate text-[11.5px] font-medium sm:text-[12px]">
          {node.label}
        </span>
      </motion.button>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <style>{KEYFRAMES}</style>
      <motion.div
        ref={rootRef}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={
          reduce || show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
        }
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn("w-full text-foreground", className)}
      >
        <section
          aria-labelledby={headingId}
          className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
        >
          <header className="flex flex-col gap-2.5 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h2
                id={headingId}
                className="text-[15px] font-medium tracking-[-0.01em] text-foreground"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-success"
              />
              Live
            </span>
          </header>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <div ref={diagramRef} className="relative">
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                fill="none"
              >
                {edges.map((edge, index) => {
                  const isActive =
                    activeId === edge.nodeId || hoverId === edge.nodeId;
                  return (
                    <g key={edge.id}>
                      <path
                        d={edge.d}
                        stroke="currentColor"
                        strokeWidth={1.25}
                        strokeLinecap="round"
                        className={cn(
                          "transition-colors duration-200",
                          isActive ? "text-foreground/45" : "text-border"
                        )}
                      />
                      {reduce ? null : (
                        <path
                          d={edge.d}
                          pathLength={1}
                          stroke="currentColor"
                          strokeWidth={2.25}
                          strokeLinecap="round"
                          strokeDasharray="0.14 0.86"
                          className={cn(
                            "transition-colors duration-200",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          )}
                          style={{
                            animation: `prequel-beam-travel ${safeSpeed}s linear infinite`,
                            animationDelay: `${index * 0.42}s`,
                          }}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              <div
                className="relative grid items-center gap-x-2 gap-y-2.5 sm:gap-x-4"
                style={{
                  gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
                  gridTemplateRows: `repeat(${rowCount}, minmax(0, auto))`,
                }}
              >
                {safeSources.map((node, index) =>
                  chip(node, index, "left")
                )}

                <div
                  className="flex flex-col items-center gap-2"
                  style={{ gridColumn: 2, gridRow: hubRow }}
                >
                  <div
                    ref={registerNode(HUB_KEY)}
                    className="relative grid h-14 w-14 place-items-center rounded-full border border-border bg-card text-foreground sm:h-16 sm:w-16"
                  >
                    <Network
                      aria-hidden="true"
                      className="h-5 w-5"
                      strokeWidth={1.5}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full border border-border bg-card"
                    >
                      <span className="h-1 w-1 translate-x-[0.5px] -translate-y-[0.5px] rounded-full bg-foreground" />
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {hubLabel}
                  </span>
                </div>

                {safeDestinations.map((node, index) =>
                  chip(node, index, "right")
                )}
              </div>
            </div>

            {activeNode ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  {activeNode.icon ? (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
                      <activeNode.icon
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        strokeWidth={1.6}
                      />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-foreground">
                      {activeNode.label}
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                      {activeNode.detail}
                    </p>
                  </div>
                </div>

                <dl className="flex shrink-0 items-center gap-5 sm:text-right">
                  <div>
                    <dt className="text-[10.5px] text-muted-foreground">
                      Rate
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-medium tabular-nums text-foreground">
                      {activeNode.value}
                    </dd>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-7 w-px bg-border"
                  />
                  <div>
                    <dt className="text-[10.5px] text-muted-foreground">
                      Context
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-medium tabular-nums text-foreground">
                      {activeNode.meta}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </section>
      </motion.div>
    </MotionConfig>
  );
}

export default AnimatedBeam;
