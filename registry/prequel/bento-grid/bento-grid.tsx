"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Bell, Check, KeyRound, Search, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* A thin packet travels along each link; the centre glint turns slowly. */
const BENTO_CSS = `
@keyframes prequel-bento-flow {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}
.prequel-bento-flow {
  stroke-dasharray: 2 98;
  animation: prequel-bento-flow 5.5s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .prequel-bento-flow {
    animation: none;
    opacity: 0;
  }
}
`;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type BentoGridRealtime = {
  label: string;
  headline: string;
  latency: string;
  regions: string;
};

export type BentoGridSearchResult = {
  title: string;
  meta: string;
};

export type BentoGridSearch = {
  label: string;
  query: string;
  results: BentoGridSearchResult[];
  hint?: string;
};

export type BentoGridWebhooks = {
  label: string;
  headline: string;
  states: { label: string; tone: "ok" | "retry" | "muted" }[];
};

export type BentoGridAccess = {
  label: string;
  headline: string;
  members: { initials: string; name: string }[];
  role: string;
  note: string;
};

export type BentoGridAlerts = {
  label: string;
  headline: string;
  value: string;
  note: string;
  owner: string;
};

export type BentoGridProps = {
  className?: string;
  /** Section heading shown above the grid. */
  title?: string;
  /** One short paragraph under the heading. */
  description?: string;
  realtime?: BentoGridRealtime;
  search?: BentoGridSearch;
  webhooks?: BentoGridWebhooks;
  access?: BentoGridAccess;
  alerts?: BentoGridAlerts;
};

/* ------------------------------------------------------------------ */
/* defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_REALTIME: BentoGridRealtime = {
  label: "Realtime sync",
  headline: "Changes reach every open tab in 38 ms.",
  latency: "38 ms",
  regions: "6 regions",
};

const DEFAULT_SEARCH: BentoGridSearch = {
  label: "Search",
  query: "invoice",
  hint: "12 ms median",
  results: [
    { title: "Invoice 2041", meta: "Paid · 2 min ago" },
    { title: "Invoice settings", meta: "Billing · updated 14 Mar" },
    { title: "Invoices API", meta: "Docs · v2" },
  ],
};

const DEFAULT_WEBHOOKS: BentoGridWebhooks = {
  label: "Webhooks",
  headline: "Retries for 24 hours, then a dead-letter queue.",
  states: [
    { label: "Delivered", tone: "ok" },
    { label: "Retried 3×", tone: "retry" },
    { label: "24 h window", tone: "muted" },
  ],
};

const DEFAULT_ACCESS: BentoGridAccess = {
  label: "Access",
  headline: "Roles, SCIM and an audit trail.",
  members: [
    { initials: "AM", name: "Ama Mensah" },
    { initials: "LF", name: "Lucas Ferreira" },
    { initials: "MT", name: "Mei Tanaka" },
  ],
  role: "Admin",
  note: "SCIM synced 4 min ago",
};

const DEFAULT_ALERTS: BentoGridAlerts = {
  label: "Alerting",
  headline: "Route the signal, mute the noise.",
  value: "2 open",
  note: "p95 breach · 2 min",
  owner: "Acknowledged by Ama M.",
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function useTypewriter(
  text: string,
  opts: { start: boolean; reduce: boolean; speed: number }
) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!opts.start) return;
    if (opts.reduce) {
      setCount(text.length);
      return;
    }

    setCount(0);
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      index += 1;
      setCount(index);
      if (index < text.length) timer = setTimeout(tick, opts.speed);
    };

    timer = setTimeout(tick, 320);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [text, opts.start, opts.reduce, opts.speed]);

  return text.slice(0, count);
}

function highlight(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[2px] bg-foreground/10 px-0.5 text-foreground">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

type TileProps = {
  children: ReactNode;
  index: number;
  show: boolean;
  reduce: boolean;
  className?: string;
};

function Tile({ children, index, show, reduce, className }: TileProps) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{
        opacity: reduce || show ? 1 : 0,
        y: reduce || show ? 0 : 14,
        transition: {
          duration: reduce ? 0 : 0.55,
          delay: reduce ? 0 : index * 0.07,
          ease: EASE,
        },
      }}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/20 p-4 transition-colors duration-300 hover:border-muted-foreground/30 sm:p-5",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* tiles                                                               */
/* ------------------------------------------------------------------ */

const HUB = { x: 180, y: 78 };
const NODES = [
  { x: 50, y: 32 },
  { x: 72, y: 124 },
  { x: 300, y: 28 },
  { x: 310, y: 120 },
  { x: 180, y: 24 },
];
const LINKS = [
  "M180 78 C140 62 92 46 50 32",
  "M180 78 C142 98 108 116 72 124",
  "M180 78 C230 58 262 42 300 28",
  "M180 78 C236 94 274 110 310 120",
  "M180 78 C180 60 180 40 180 24",
];

type RealtimeTileProps = {
  data: BentoGridRealtime;
  index: number;
  show: boolean;
  reduce: boolean;
};

function RealtimeTile({ data, index, show, reduce }: RealtimeTileProps) {
  return (
    <Tile index={index} show={show} reduce={reduce} className="lg:col-span-7 lg:row-span-2">
      <p className="text-[12px] font-medium text-muted-foreground">{data.label}</p>
      <h3 className="mt-1 max-w-[34ch] text-[15px] font-medium leading-snug text-card-foreground">
        {data.headline}
      </h3>

      <div className="mt-4 min-h-0 flex-1">
        <svg
          viewBox="0 0 360 156"
          className="block h-auto w-full"
          role="img"
          aria-label="A central sync node connected to five edge nodes, with a packet travelling along each link."
        >
          {LINKS.map((d, linkIndex) => (
            <g key={d}>
              <motion.path
                d={d}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.25}
                strokeLinecap="round"
                initial={{ pathLength: reduce ? 1 : 0 }}
                animate={{ pathLength: reduce ? 1 : show ? 1 : 0 }}
                transition={{
                  duration: reduce ? 0 : 0.9,
                  delay: reduce ? 0 : linkIndex * 0.07,
                  ease: EASE,
                }}
              />
              {!reduce ? (
                <motion.path
                  d={d}
                  pathLength={100}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  className="prequel-bento-flow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: show ? 0.45 : 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4 + linkIndex * 0.08,
                  }}
                />
              ) : null}
            </g>
          ))}

          {NODES.map((node, nodeIndex) => (
            <motion.circle
              key={`${node.x}-${node.y}`}
              cx={node.x}
              cy={node.y}
              r={3.2}
              fill="var(--card)"
              stroke="var(--muted-foreground)"
              strokeWidth={1.4}
              initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.5 }}
              animate={{ opacity: reduce ? 1 : show ? 1 : 0, scale: 1 }}
              transition={{
                duration: reduce ? 0 : 0.35,
                delay: reduce ? 0 : 0.45 + nodeIndex * 0.06,
                ease: EASE,
              }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
            />
          ))}

          <circle
            cx={HUB.x}
            cy={HUB.y}
            r={13}
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth={1.5}
          />
          <circle cx={HUB.x} cy={HUB.y} r={3.2} fill="var(--foreground)" />
          <motion.g
            initial={false}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
            style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }}
          >
            <circle cx={HUB.x} cy={HUB.y - 7} r={1.35} fill="var(--foreground)" />
          </motion.g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span>
          <span className="font-medium tabular-nums text-foreground">{data.latency}</span>{" "}
          p95
        </span>
        <span>{data.regions}</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
          All routes healthy
        </span>
      </div>
    </Tile>
  );
}

type SearchTileProps = {
  data: BentoGridSearch;
  index: number;
  show: boolean;
  reduce: boolean;
};

function SearchTile({ data, index, show, reduce }: SearchTileProps) {
  const typed = useTypewriter(data.query, {
    start: show,
    reduce,
    speed: 62,
  });
  const done = reduce ? true : typed.length >= data.query.length;

  return (
    <Tile index={index} show={show} reduce={reduce} className="lg:col-span-5 lg:row-span-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted-foreground">{data.label}</p>
        <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 truncate text-[12.5px] text-foreground">
          {reduce ? data.query : typed}
          {!done ? (
            <span aria-hidden="true" className="ml-0.5 inline-block h-3 w-px bg-foreground align-middle" />
          ) : null}
        </span>
        <span className="sr-only">{data.query}</span>
      </div>

      <div className="mt-3 flex min-h-[132px] flex-1 flex-col gap-1">
        {data.results.map((result, rowIndex) => (
          <motion.div
            key={`${result.title}-${rowIndex}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{
              opacity: reduce || done ? 1 : 0,
              y: reduce || done ? 0 : 6,
            }}
            transition={{
              duration: reduce ? 0 : 0.35,
              delay: reduce ? 0 : rowIndex * 0.06,
              ease: EASE,
            }}
            className="flex min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/70"
          >
            <span className="min-w-0 truncate text-[12.5px] font-medium text-card-foreground">
              {highlight(result.title, data.query)}
            </span>
            <span className="shrink-0 text-[10.5px] text-muted-foreground">
              {result.meta}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-[11px] text-muted-foreground">
        <span>{data.results.length} results</span>
        <span className="tabular-nums">{data.hint}</span>
      </div>
    </Tile>
  );
}

const STATE_TONES: Record<BentoGridWebhooks["states"][number]["tone"], string> = {
  ok: "bg-success/10 text-success",
  retry: "bg-muted text-muted-foreground",
  muted: "bg-foreground/[0.04] text-muted-foreground",
};

type WebhooksTileProps = {
  data: BentoGridWebhooks;
  index: number;
  show: boolean;
  reduce: boolean;
};

function WebhooksTile({ data, index, show, reduce }: WebhooksTileProps) {
  return (
    <Tile index={index} show={show} reduce={reduce} className="sm:col-span-1 lg:col-span-4">
      <div className="flex items-center gap-1.5">
        <Webhook className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="text-[12px] font-medium text-muted-foreground">{data.label}</p>
      </div>
      <h3 className="mt-1 text-[13.5px] font-medium leading-snug text-card-foreground">
        {data.headline}
      </h3>

      <div className="mt-3 flex flex-1 items-center">
        <svg
          viewBox="0 0 300 72"
          className="block h-auto w-full"
          role="img"
          aria-label="A webhook route with one retry before the event is delivered."
        >
          <motion.path
            d="M24 36 H276"
            fill="none"
            stroke="var(--border)"
            strokeWidth={1.25}
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: reduce ? 1 : show ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
          />
          <motion.path
            d="M118 36 C118 62 182 62 182 36"
            fill="none"
            stroke="var(--border)"
            strokeWidth={1.1}
            strokeDasharray="3 4"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: reduce ? 1 : show ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: 0.35 }}
          />
          {!reduce ? (
            <motion.path
              d="M24 36 H276"
              pathLength={100}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="prequel-bento-flow"
              initial={{ opacity: 0 }}
              animate={{ opacity: show ? 0.5 : 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
          ) : null}
          <circle cx={24} cy={36} r={4} fill="var(--card)" stroke="var(--muted-foreground)" strokeWidth={1.4} />
          <circle cx={118} cy={36} r={3.5} fill="var(--card)" stroke="var(--border)" strokeWidth={1.4} />
          <circle cx={182} cy={36} r={3.5} fill="var(--card)" stroke="var(--border)" strokeWidth={1.4} />
          <circle cx={276} cy={36} r={7} fill="var(--card)" stroke="var(--border)" strokeWidth={1.4} />
          <path
            d="M272.8 36.2l2.2 2.2 4.1-4.4"
            fill="none"
            stroke="var(--success)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {data.states.map((state) => (
          <span
            key={state.label}
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums",
              STATE_TONES[state.tone]
            )}
          >
            {state.label}
          </span>
        ))}
      </div>
    </Tile>
  );
}

type AccessTileProps = {
  data: BentoGridAccess;
  index: number;
  show: boolean;
  reduce: boolean;
};

function AccessTile({ data, index, show, reduce }: AccessTileProps) {
  return (
    <Tile index={index} show={show} reduce={reduce} className="sm:col-span-1 lg:col-span-3">
      <div className="flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="text-[12px] font-medium text-muted-foreground">{data.label}</p>
      </div>
      <h3 className="mt-1 text-[13.5px] font-medium leading-snug text-card-foreground">
        {data.headline}
      </h3>

      <div className="mt-auto flex flex-col gap-2.5 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex -space-x-2">
            {data.members.map((member) => (
              <span
                key={member.initials}
                title={member.name}
                className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-[9.5px] font-medium text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5"
              >
                {member.initials}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            <Check className="h-2.5 w-2.5 text-success" aria-hidden="true" />
            {data.role}
          </span>
        </div>
        <p className="text-[10.5px] text-muted-foreground">{data.note}</p>
      </div>
    </Tile>
  );
}

type AlertsTileProps = {
  data: BentoGridAlerts;
  index: number;
  show: boolean;
  reduce: boolean;
};

function AlertsTile({ data, index, show, reduce }: AlertsTileProps) {
  return (
    <Tile index={index} show={show} reduce={reduce} className="sm:col-span-2 lg:col-span-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <p className="text-[12px] font-medium text-muted-foreground">{data.label}</p>
          </div>
          <h3 className="mt-1 text-[13.5px] font-medium leading-snug text-card-foreground">
            {data.headline}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums text-muted-foreground">
          {data.value}
        </span>
      </div>

      <div className="mt-2 flex flex-1 items-center">
        <svg
          viewBox="0 0 320 76"
          className="block h-auto w-full"
          role="img"
          aria-label="A latency waveform with a single sharp breach above the baseline."
        >
          <line
            x1={0}
            x2={320}
            y1={48}
            y2={48}
            stroke="var(--border)"
            strokeDasharray="2 5"
          />
          <motion.path
            d="M0 48 H58 L66 48 L72 36 L78 58 L84 48 H150 L158 48 L166 14 L174 68 L182 48 H320"
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: reduce ? 1 : show ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.25, ease: EASE }}
          />
          <motion.circle
            cx={166}
            cy={14}
            r={3}
            fill="var(--card)"
            stroke="var(--foreground)"
            strokeWidth={1.4}
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: reduce ? 1 : show ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 1 }}
          />
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="text-foreground">{data.note}</span>
        <span>{data.owner}</span>
      </div>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function BentoGrid({
  className,
  title = "The quiet parts of every release, in one surface.",
  description = "Realtime sync, search, webhooks, access and alerting, wired together and observed from the same place.",
  realtime = DEFAULT_REALTIME,
  search = DEFAULT_SEARCH,
  webhooks = DEFAULT_WEBHOOKS,
  access = DEFAULT_ACCESS,
  alerts = DEFAULT_ALERTS,
}: BentoGridProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView || reduce;

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6",
        className
      )}
    >
      <style>{BENTO_CSS}</style>

      <div className="mb-4 flex flex-col gap-1 sm:mb-5">
        <h2
          id={titleId}
          className="text-balance text-[20px] font-semibold tracking-tight sm:text-[22px]"
        >
          {title}
        </h2>
        <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:auto-rows-[minmax(150px,auto)] lg:grid-cols-12">
        <RealtimeTile data={realtime} index={0} show={show} reduce={reduce} />
        <SearchTile data={search} index={1} show={show} reduce={reduce} />
        <WebhooksTile data={webhooks} index={2} show={show} reduce={reduce} />
        <AccessTile data={access} index={3} show={show} reduce={reduce} />
        <AlertsTile data={alerts} index={4} show={show} reduce={reduce} />
      </div>
    </section>
  );
}

/* Ready-made instance for previews and docs. */
export function BentoGridDemo() {
  return <BentoGrid />;
}

export default BentoGrid;
