"use client";

import { useRef, useState } from "react";
import { MotionConfig, motion, useInView, useReducedMotion } from "motion/react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type BreadcrumbItem = {
  label: string;
  /** Omit for the current page or for a record that has no route. */
  href?: string;
};

export type BreadcrumbProps = {
  className?: string;
  items?: BreadcrumbItem[];
  /** Collapse the middle of the trail when it holds more than this many crumbs. */
  maxItems?: number;
  title?: string;
  description?: string;
  status?: string;
  meta?: string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Showcase", href: "/showcase" },
  { label: "Origin", href: "/dashboards/origin" },
  { label: "Customers", href: "/dashboards/origin/customers" },
  { label: "Northwind Labs" },
  { label: "INV-2481" },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type Crumb =
  | { type: "item"; item: BreadcrumbItem; index: number }
  | { type: "ellipsis" };

function buildCrumbs(
  items: BreadcrumbItem[],
  maxItems: number,
  expanded: boolean
): Crumb[] {
  const head = items[0];
  if (!head) return [];

  const tailCount = Math.max(2, maxItems - 1);
  const hiddenCount = items.length - 1 - tailCount;
  const collapsed = !expanded && hiddenCount > 1;

  const crumbs: Crumb[] = [{ type: "item", item: head, index: 0 }];

  if (collapsed) {
    crumbs.push({ type: "ellipsis" });
  } else {
    for (let index = 1; index < items.length - tailCount; index += 1) {
      crumbs.push({ type: "item", item: items[index], index });
    }
  }

  for (let index = Math.max(1, items.length - tailCount); index < items.length; index += 1) {
    crumbs.push({ type: "item", item: items[index], index });
  }

  return crumbs;
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function Breadcrumb({
  className,
  items = DEFAULT_ITEMS,
  maxItems = 3,
  title = "INV-2481",
  description = "Issued 26 Oct 2026 for Northwind Labs. $4,820.00 due on 25 Nov, net 30.",
  status = "Paid",
  meta = "2 Nov 2026 · Visa ending 4412",
}: BreadcrumbProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const [expanded, setExpanded] = useState(false);

  const crumbs = buildCrumbs(items, maxItems, expanded);
  const lastIndex = items.length - 1;
  const canCollapse = items.length - Math.max(2, maxItems - 1) - 1 > 1;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: inView ? 1 : 0, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6",
          className
        )}
      >
        <motion.nav
          aria-label="Breadcrumb"
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.05 }}
        >
          <div className="flex items-start justify-between gap-3">
            <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-0.5 gap-y-1 text-[12.5px]">
              {crumbs.map((crumb, position) => {
                const separator =
                  position > 0 ? (
                    <ChevronRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                      strokeWidth={2}
                    />
                  ) : null;

                if (crumb.type === "ellipsis") {
                  return (
                    <li key="ellipsis" className="flex items-center gap-0.5">
                      {separator}
                      <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        aria-label={`Show ${items.length - crumbs.length + 1} hidden breadcrumbs`}
                        aria-expanded={expanded}
                        className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                }

                const { item, index } = crumb;
                const current = index === lastIndex;
                const content = current ? (
                  <span
                    aria-current="page"
                    className="inline-flex items-center gap-1.5 px-1 text-[13px] font-medium text-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full border border-foreground/50"
                    >
                      <span className="absolute right-[1px] top-[1px] h-[2px] w-[2px] rounded-full bg-foreground/70" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                ) : item.href ? (
                  <a
                    href={item.href}
                    className="rounded-sm px-1 py-0.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="px-1 text-muted-foreground">{item.label}</span>
                );

                return (
                  <li
                    key={`${item.label}-${index}`}
                    className="flex min-w-0 items-center gap-0.5"
                  >
                    {separator}
                    <motion.span
                      initial={reduce ? false : { opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: reduce ? 0 : 0.3,
                        ease: EASE,
                        delay: reduce ? 0 : 0.08 + position * 0.035,
                      }}
                      className="inline-flex min-w-0 items-center"
                    >
                      {content}
                    </motion.span>
                  </li>
                );
              })}
            </ol>
            {canCollapse && expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Less
              </button>
            ) : null}
          </div>
        </motion.nav>

        <div className="mt-4 h-px w-full bg-border" />

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: inView ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.12 }}
        >
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 max-w-md text-pretty text-[13px] leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
              {status}
            </span>
          </div>

          <p className="mt-4 text-[11.5px] tabular-nums text-muted-foreground">{meta}</p>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}

export default Breadcrumb;
