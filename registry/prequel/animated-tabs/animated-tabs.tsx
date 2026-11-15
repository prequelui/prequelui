"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type AnimatedTabRow = {
  label: string;
  value: string;
};

export type AnimatedTab = {
  id: string;
  label: string;
  /** Headline value shown inside the panel. */
  value: string;
  /** One line under the value, e.g. "+12.6% vs last week". */
  note: string;
  /** Label/value rows under the headline. */
  rows: AnimatedTabRow[];
};

export type AnimatedTabsProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  tabs?: AnimatedTab[];
  /** Tab selected on first render. Defaults to the first tab. */
  defaultTab?: string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_TABS: AnimatedTab[] = [
  {
    id: "requests",
    label: "Requests",
    value: "2.41M",
    note: "+12.6% vs last week",
    rows: [
      { label: "Average latency", value: "184 ms" },
      { label: "Error rate", value: "0.07%" },
      { label: "Busiest hour", value: "14:00" },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    value: "486 GB",
    note: "62% of the 780 GB plan",
    rows: [
      { label: "Objects", value: "1.28M" },
      { label: "Egress this month", value: "92 GB" },
      { label: "Backups", value: "14" },
    ],
  },
  {
    id: "seats",
    label: "Seats",
    value: "27",
    note: "3 invites waiting",
    rows: [
      { label: "Active today", value: "19" },
      { label: "Administrators", value: "4" },
      { label: "Last joined", value: "2 days ago" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* panel                                                               */
/* ------------------------------------------------------------------ */

function TabPanel({ tab }: { tab: AnimatedTab }) {
  return (
    <div className="rounded-lg bg-muted/40 p-4 sm:p-5">
      <p className="text-[12px] font-medium text-muted-foreground">
        {tab.label}
      </p>
      <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight tabular-nums">
        {tab.value}
      </p>
      <p className="mt-1.5 text-[12.5px] text-muted-foreground">{tab.note}</p>

      <dl className="mt-4 border-t border-border">
        {tab.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2 last:border-b-0"
          >
            <dt className="min-w-0 text-[12.5px] text-muted-foreground">
              {row.label}
            </dt>
            <dd className="shrink-0 text-[12.5px] font-medium tabular-nums text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function AnimatedTabs({
  className,
  title = "Project health",
  subtitle = "Northwind Labs · production",
  tabs = DEFAULT_TABS,
  defaultTab,
}: AnimatedTabsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = reduce || inView;

  const uid = useId().replace(/:/g, "");
  const pillId = `animated-tabs-pill-${uid}`;
  const idBase = `animated-tabs-${uid}`;

  const [active, setActive] = useState(() => {
    if (defaultTab && tabs.some((tab) => tab.id === defaultTab)) {
      return defaultTab;
    }
    return tabs[0]?.id ?? "";
  });

  const found = tabs.findIndex((tab) => tab.id === active);
  const index = found < 0 ? 0 : found;
  const current = tabs[index];

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [height, setHeight] = useState<number | null>(null);

  /* The track keeps every panel mounted, so measure the active one to let the
     container follow its height on the same spring as the slide. */
  useEffect(() => {
    const el = panelRefs.current[index];
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, tabs]);

  const select = (id: string) => {
    setActive(id);
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    position: number
  ) => {
    if (tabs.length === 0) return;
    let next = position;
    if (event.key === "ArrowRight") {
      next = (position + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      next = (position - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={rootRef}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={
          show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 16 }
        }
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {subtitle}
              </p>
            </div>

            {tabs.length > 0 ? (
              <div
                role="tablist"
                aria-label={title}
                aria-orientation="horizontal"
                className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {tabs.map((tab, position) => {
                  const selected = position === index;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        tabRefs.current[position] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`${idBase}-tab-${position}`}
                      aria-selected={selected}
                      aria-controls={`${idBase}-panel-${position}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => select(tab.id)}
                      onKeyDown={(event) => onKeyDown(event, position)}
                      className={cn(
                        "relative flex-none rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {selected ? (
                        <motion.span
                          layoutId={pillId}
                          aria-hidden="true"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : {
                                  type: "spring",
                                  stiffness: 420,
                                  damping: 36,
                                }
                          }
                          className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border"
                        />
                      ) : null}
                      <span className="relative z-10 whitespace-nowrap">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {current ? (
            <div className="mt-5">
              {reduce ? (
                <div>
                  {tabs.map((tab, position) => (
                    <div
                      key={tab.id}
                      id={`${idBase}-panel-${position}`}
                      role="tabpanel"
                      aria-labelledby={`${idBase}-tab-${position}`}
                      hidden={position !== index}
                      tabIndex={position === index ? 0 : -1}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <TabPanel tab={tab} />
                    </div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={false}
                  animate={height === null ? undefined : { height }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 33,
                  }}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={false}
                    animate={{ x: `-${index * 100}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 34,
                    }}
                    className="flex w-full"
                  >
                    {tabs.map((tab, position) => (
                      <div
                        key={tab.id}
                        ref={(el) => {
                          panelRefs.current[position] = el;
                        }}
                        id={`${idBase}-panel-${position}`}
                        role="tabpanel"
                        aria-labelledby={`${idBase}-tab-${position}`}
                        aria-hidden={position !== index}
                        inert={position !== index}
                        tabIndex={position === index ? 0 : -1}
                        className="w-full shrink-0 focus-visible:outline-none"
                      >
                        <TabPanel tab={tab} />
                      </div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </div>
          ) : (
            <p className="mt-5 text-[13px] text-muted-foreground">
              No views to show yet.
            </p>
          )}
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default AnimatedTabs;
