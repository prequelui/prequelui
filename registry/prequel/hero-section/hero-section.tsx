"use client";

import { useId, useRef } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types + demo defaults                                              */
/* ------------------------------------------------------------------ */

export type HeroSectionAction = {
  label: string;
  href: string;
};

export type HeroSectionAnnouncement = {
  label: string;
  href: string;
};

export type HeroSectionProps = {
  className?: string;
  announcement?: HeroSectionAnnouncement;
  title?: string;
  description?: string;
  primaryAction?: HeroSectionAction;
  secondaryAction?: HeroSectionAction;
  /** Address shown in the product frame. */
  dashboardUrl?: string;
};

const DEFAULT_ANNOUNCEMENT: HeroSectionAnnouncement = {
  label: "v1.4 · 17 free blocks, MIT licensed",
  href: "https://prequelui.terravidhal.me",
};

const DEFAULT_TITLE = "Ship a dashboard your users actually open.";
const DEFAULT_DESCRIPTION =
  "Animated dashboard blocks for shadcn/ui. Typed, themeable, and built to be owned — copy one in, keep the code, and make it yours.";

const DEFAULT_PRIMARY: HeroSectionAction = {
  label: "Browse free blocks",
  href: "https://prequelui.terravidhal.me",
};

const DEFAULT_SECONDARY: HeroSectionAction = {
  label: "Star on GitHub",
  href: "https://github.com/prequelui/prequelui",
};

const DEFAULT_DASHBOARD_URL = "app.northwindlabs.com/overview";

/* ------------------------------------------------------------------ */
/* mini dashboard geometry (static, deterministic)                    */
/* ------------------------------------------------------------------ */

type Point = { x: number; y: number };

const CHART_VALUES = [
  0.28, 0.34, 0.31, 0.4, 0.38, 0.46, 0.52, 0.49, 0.58, 0.62, 0.71, 0.68,
  0.78, 0.84,
];

const CHART_X0 = 182;
const CHART_X1 = 646;
const CHART_TOP = 288;
const CHART_BASE = 434;

function smoothPath(points: Point[]) {
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x},${point.y}`;
      const previous = points[index - 1];
      const cx = (previous.x + point.x) / 2;
      return `C${cx},${previous.y} ${cx},${point.y} ${point.x},${point.y}`;
    })
    .join(" ");
}

const CHART_POINTS: Point[] = CHART_VALUES.map((value, index) => ({
  x: CHART_X0 + ((CHART_X1 - CHART_X0) * index) / (CHART_VALUES.length - 1),
  y: CHART_BASE - (CHART_BASE - CHART_TOP) * value,
}));

const CHART_LINE = smoothPath(CHART_POINTS);
const CHART_LAST = CHART_POINTS[CHART_POINTS.length - 1];
const CHART_AREA = `${CHART_LINE} L${CHART_X1},${CHART_BASE} L${CHART_X0},${CHART_BASE} Z`;

const NAV_ITEMS = [
  { label: "Revenue", y: 94 },
  { label: "Customers", y: 128 },
  { label: "Reports", y: 162 },
] as const;

const KPI_CARDS = [
  {
    x: 164,
    label: "Net revenue",
    value: "$84,260",
    delta: "+12.4%",
    note: "vs Oct",
  },
  {
    x: 420,
    label: "Active accounts",
    value: "2,847",
    delta: "+8.2%",
    note: "vs Oct",
  },
  {
    x: 676,
    label: "Uptime",
    value: "99.97%",
    delta: "+0.02%",
    note: "last 90 days",
  },
] as const;

const ACTIVITY = [
  {
    initials: "HC",
    name: "Halo Cloud",
    note: "Annual plan",
    amount: "$4,800",
    cy: 286,
  },
  {
    initials: "BS",
    name: "Bluebird Studio",
    note: "Seat upgrade",
    amount: "$1,260",
    cy: 334,
  },
  {
    initials: "SS",
    name: "Sable Systems",
    note: "Invoice paid",
    amount: "$3,400",
    cy: 382,
  },
] as const;

/* ------------------------------------------------------------------ */
/* border light: one quiet pass, then gone                            */
/* ------------------------------------------------------------------ */

function FrameLight({ show, reduce }: { show: boolean; reduce: boolean }) {
  const play = show && !reduce;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl p-px"
      style={{
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        maskComposite: "exclude",
      }}
    >
      <motion.span
        className="absolute -inset-[120%] block"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, var(--foreground) 336deg, transparent 360deg)",
        }}
        initial={{ rotate: 0, opacity: 0 }}
        animate={
          play
            ? { rotate: [0, 0, 360, 360], opacity: [0, 0.85, 0.85, 0] }
            : { rotate: 0, opacity: 0 }
        }
        transition={
          play
            ? { duration: 3.2, times: [0, 0.12, 0.82, 1], ease: "linear" }
            : { duration: 0 }
        }
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* the dashboard inside the browser frame                             */
/* ------------------------------------------------------------------ */

function MiniDashboard({
  uid,
  show,
  reduce,
}: {
  uid: string;
  show: boolean;
  reduce: boolean;
}) {
  const gradientId = `hero-area-${uid}`;

  return (
    <svg
      viewBox="0 0 960 520"
      role="img"
      aria-label="Product preview: Northwind Labs revenue dashboard with net revenue of $84,260, up 12.4 percent, 2,847 active accounts, 99.97 percent uptime, and a rising recurring revenue chart."
      className="block h-auto w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--chart-1)"
            stopOpacity={0.16}
          />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* sidebar */}
      <line x1={132} y1={0} x2={132} y2={520} stroke="var(--border)" />

      <g>
        <circle
          cx={26}
          cy={32}
          r={7}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={1.4}
        />
        <circle cx={28.6} cy={29.4} r={1.5} fill="var(--foreground)" />
        <text
          x={42}
          y={36}
          fill="var(--foreground)"
          fontSize={11.5}
          fontWeight={600}
          letterSpacing="-0.2"
        >
          Northwind
        </text>
      </g>

      <rect
        x={12}
        y={60}
        width={108}
        height={26}
        rx={6}
        fill="var(--muted)"
      />
      <rect
        x={22}
        y={69}
        width={8}
        height={8}
        rx={2}
        fill="var(--foreground)"
      />
      <text
        x={38}
        y={77}
        fill="var(--foreground)"
        fontSize={10.5}
        fontWeight={500}
      >
        Overview
      </text>

      {NAV_ITEMS.map((item) => (
        <g key={item.label}>
          <rect
            x={22}
            y={item.y + 9}
            width={8}
            height={8}
            rx={2}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            opacity={0.8}
          />
          <text
            x={38}
            y={item.y + 17}
            fill="var(--muted-foreground)"
            fontSize={10.5}
          >
            {item.label}
          </text>
        </g>
      ))}

      <line x1={20} y1={206} x2={112} y2={206} stroke="var(--border)" />
      <rect
        x={22}
        y={231}
        width={8}
        height={8}
        rx={2}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        opacity={0.8}
      />
      <text
        x={38}
        y={239}
        fill="var(--muted-foreground)"
        fontSize={10.5}
      >
        Settings
      </text>

      {/* page header */}
      <text
        x={164}
        y={47}
        fill="var(--foreground)"
        fontSize={21}
        fontWeight={600}
        letterSpacing="-0.4"
      >
        Overview
      </text>
      <text x={164} y={67} fill="var(--muted-foreground)" fontSize={10.5}>
        Nov 1 – Nov 30, 2026
      </text>

      <rect
        x={666}
        y={30}
        width={58}
        height={24}
        rx={12}
        fill="var(--muted)"
      />
      <circle cx={680} cy={42} r={2.5} fill="var(--success)" />
      <text
        x={688}
        y={45.5}
        fill="var(--foreground)"
        fontSize={9.5}
        fontWeight={500}
      >
        Live
      </text>

      <rect
        x={740}
        y={30}
        width={176}
        height={24}
        rx={7}
        fill="var(--muted)"
      />
      <rect
        x={799}
        y={32}
        width={58}
        height={20}
        rx={5}
        fill="var(--card)"
        stroke="var(--border)"
      />
      <text
        x={770}
        y={45.5}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={9.5}
      >
        7D
      </text>
      <text
        x={828}
        y={45.5}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={9.5}
        fontWeight={500}
      >
        30D
      </text>
      <text
        x={883}
        y={45.5}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={9.5}
      >
        12M
      </text>

      {/* KPI cards */}
      {KPI_CARDS.map((card) => (
        <g key={card.label}>
          <rect
            x={card.x}
            y={92}
            width={240}
            height={100}
            rx={10}
            fill="var(--card)"
            stroke="var(--border)"
          />
          <text
            x={card.x + 16}
            y={116}
            fill="var(--muted-foreground)"
            fontSize={10.5}
            fontWeight={500}
          >
            {card.label}
          </text>
          <text
            x={card.x + 16}
            y={146}
            fill="var(--foreground)"
            fontSize={22}
            fontWeight={600}
            letterSpacing="-0.6"
            className="tabular-nums"
          >
            {card.value}
          </text>
          <text
            x={card.x + 16}
            y={167}
            fill="var(--success)"
            fontSize={10.5}
            fontWeight={500}
            className="tabular-nums"
          >
            {card.delta}
          </text>
          <text
            x={card.x + 60}
            y={167}
            fill="var(--muted-foreground)"
            fontSize={10.5}
          >
            {card.note}
          </text>
        </g>
      ))}

      {/* revenue chart */}
      <rect
        x={164}
        y={210}
        width={500}
        height={276}
        rx={10}
        fill="var(--card)"
        stroke="var(--border)"
      />
      <text
        x={182}
        y={238}
        fill="var(--foreground)"
        fontSize={12}
        fontWeight={600}
      >
        Recurring revenue
      </text>
      <text x={182} y={255} fill="var(--muted-foreground)" fontSize={9.5}>
        Monthly · USD
      </text>
      <text
        x={646}
        y={242}
        textAnchor="end"
        fill="var(--foreground)"
        fontSize={17}
        fontWeight={600}
        letterSpacing="-0.4"
        className="tabular-nums"
      >
        $84,260
      </text>
      <text
        x={646}
        y={258}
        textAnchor="end"
        fill="var(--success)"
        fontSize={9.5}
        fontWeight={500}
        className="tabular-nums"
      >
        +12.4%
      </text>

      {[288, 330, 372, 414].map((gridY) => (
        <line
          key={gridY}
          x1={182}
          y1={gridY}
          x2={646}
          y2={gridY}
          stroke="var(--border)"
          strokeWidth={0.8}
          strokeDasharray="3 4"
        />
      ))}
      <line
        x1={182}
        y1={434}
        x2={646}
        y2={434}
        stroke="var(--border)"
        strokeWidth={1}
      />

      <motion.path
        d={CHART_AREA}
        fill={`url(#${gradientId})`}
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{
          duration: reduce ? 0 : 0.7,
          delay: reduce ? 0 : 0.45,
          ease: EASE,
        }}
      />
      <motion.path
        d={CHART_LINE}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: show ? 1 : 0 }}
        transition={{
          duration: reduce ? 0 : 1.1,
          delay: reduce ? 0 : 0.25,
          ease: EASE,
        }}
      />
      <motion.g
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{
          duration: reduce ? 0 : 0.4,
          delay: reduce ? 0 : 1.05,
          ease: EASE,
        }}
      >
        <circle
          cx={CHART_LAST.x}
          cy={CHART_LAST.y}
          r={4}
          fill="var(--card)"
          stroke="var(--chart-1)"
          strokeWidth={2}
        />
        <circle
          cx={CHART_LAST.x}
          cy={CHART_LAST.y}
          r={1.6}
          fill="var(--chart-1)"
        />
      </motion.g>

      <text x={182} y={458} fill="var(--muted-foreground)" fontSize={9}>
        Oct 1
      </text>
      <text
        x={337}
        y={458}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={9}
      >
        Oct 15
      </text>
      <text
        x={491}
        y={458}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={9}
      >
        Nov 1
      </text>
      <text
        x={646}
        y={458}
        textAnchor="end"
        fill="var(--muted-foreground)"
        fontSize={9}
      >
        Nov 30
      </text>

      {/* activity list */}
      <rect
        x={680}
        y={210}
        width={236}
        height={276}
        rx={10}
        fill="var(--card)"
        stroke="var(--border)"
      />
      <text
        x={698}
        y={238}
        fill="var(--foreground)"
        fontSize={12}
        fontWeight={600}
      >
        Recent activity
      </text>
      <text x={698} y={255} fill="var(--muted-foreground)" fontSize={9.5}>
        Last 7 days
      </text>

      {ACTIVITY.map((item, index) => (
        <g key={item.name}>
          {index > 0 ? (
            <line
              x1={698}
              y1={item.cy - 24}
              x2={898}
              y2={item.cy - 24}
              stroke="var(--border)"
            />
          ) : null}
          <circle
            cx={710}
            cy={item.cy}
            r={11}
            fill="var(--muted)"
            stroke="var(--border)"
          />
          <text
            x={710}
            y={item.cy + 3.5}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize={8}
            fontWeight={600}
          >
            {item.initials}
          </text>
          <text
            x={730}
            y={item.cy - 2}
            fill="var(--foreground)"
            fontSize={10.5}
            fontWeight={500}
          >
            {item.name}
          </text>
          <text
            x={730}
            y={item.cy + 11}
            fill="var(--muted-foreground)"
            fontSize={9}
          >
            {item.note}
          </text>
          <text
            x={898}
            y={item.cy - 2}
            textAnchor="end"
            fill="var(--foreground)"
            fontSize={10.5}
            fontWeight={500}
            className="tabular-nums"
          >
            {item.amount}
          </text>
          <text
            x={898}
            y={item.cy + 11}
            textAnchor="end"
            fill="var(--muted-foreground)"
            fontSize={9}
          >
            Paid
          </text>
        </g>
      ))}

      <line x1={698} y1={410} x2={898} y2={410} stroke="var(--border)" />
      <text x={698} y={436} fill="var(--muted-foreground)" fontSize={9.5}>
        View all activity
      </text>
      <path
        d="M890 432 l4 4 -4 4"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                              */
/* ------------------------------------------------------------------ */

export function HeroSection({
  className,
  announcement = DEFAULT_ANNOUNCEMENT,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  primaryAction = DEFAULT_PRIMARY,
  secondaryAction = DEFAULT_SECONDARY,
  dashboardUrl = DEFAULT_DASHBOARD_URL,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const uid = useId().replace(/:/g, "");

  const inView = useInView(sectionRef, { once: true, margin: "-10% 0px" });
  const frameInView = useInView(frameRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const revealed = inView || reduce;
  const frameShow = frameInView || reduce;

  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start 90%", "start 30%"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [12, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [20, 0]);

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        aria-labelledby={titleId}
        className={cn("w-full text-foreground", className)}
      >
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <motion.a
            href={announcement.href}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={
              revealed
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reduce ? 0 : 12 }
            }
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
            className="group inline-flex max-w-full items-center gap-2 border-b border-transparent pb-0.5 text-[12.5px] text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70"
            />
            <span className="min-w-0 truncate">{announcement.label}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5"
            />
          </motion.a>

          <motion.h1
            id={titleId}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={
              revealed
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reduce ? 0 : 14 }
            }
            transition={{
              duration: reduce ? 0 : 0.55,
              ease: EASE,
              delay: reduce ? 0 : 0.06,
            }}
            className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={
              revealed
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reduce ? 0 : 14 }
            }
            transition={{
              duration: reduce ? 0 : 0.55,
              ease: EASE,
              delay: reduce ? 0 : 0.12,
            }}
            className="mt-5 max-w-xl text-pretty text-[15px] leading-7 text-muted-foreground sm:text-[17px]"
          >
            {description}
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={
              revealed
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reduce ? 0 : 14 }
            }
            transition={{
              duration: reduce ? 0 : 0.55,
              ease: EASE,
              delay: reduce ? 0 : 0.18,
            }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <a
              href={primaryAction.href}
              className="group inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-center text-[13.5px] font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {primaryAction.label}
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
              />
            </a>
            <a
              href={secondaryAction.href}
              className="inline-flex min-h-11 max-w-full items-center justify-center rounded-full border border-border bg-background px-5 text-center text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {secondaryAction.label}
            </a>
          </motion.div>

          <div
            ref={frameRef}
            className="mt-12 sm:mt-16 lg:mt-20"
            style={{ perspective: "1600px" }}
          >
            <motion.div
              style={
                reduce
                  ? { transformOrigin: "50% 100%" }
                  : { rotateX, scale, y, transformOrigin: "50% 100%" }
              }
              className="relative"
            >
              <FrameLight show={frameShow} reduce={reduce} />

              <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xl">
                <div
                  aria-hidden="true"
                  className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2.5 sm:px-4"
                >
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full border border-border bg-muted-foreground/25" />
                    <span className="h-2 w-2 rounded-full border border-border bg-muted-foreground/25" />
                    <span className="h-2 w-2 rounded-full border border-border bg-muted-foreground/25" />
                  </div>
                  <div className="mx-auto flex min-w-0 max-w-[260px] flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{dashboardUrl}</span>
                  </div>
                  <div className="w-8 shrink-0 sm:w-14" />
                </div>

                <MiniDashboard uid={uid} show={frameShow} reduce={reduce} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}

export default HeroSection;
