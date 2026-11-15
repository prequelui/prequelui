"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type PaginationProps = {
  className?: string;
  /** Controlled current page. */
  page?: number;
  defaultPage?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type PageEntry = number | "gap";

function buildPages(current: number, total: number): PageEntry[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const anchors = [1, total, current - 1, current, current + 1]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);

  const pages: PageEntry[] = [];
  anchors.forEach((value, index) => {
    if (index > 0 && value - anchors[index - 1] > 1) pages.push("gap");
    pages.push(value);
  });
  return pages;
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function Pagination({
  className,
  page,
  defaultPage = 7,
  totalPages = 143,
  totalItems = 2847,
  pageSize = 20,
  onPageChange,
}: PaginationProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const pillId = useId();

  const [internalPage, setInternalPage] = useState(defaultPage);
  const current = Math.min(totalPages, Math.max(1, page ?? internalPage));
  const pages = useMemo(() => buildPages(current, totalPages), [current, totalPages]);

  const start = totalItems === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(totalItems, current * pageSize);
  const progress = totalPages > 1 ? current / totalPages : 1;

  const goTo = (next: number) => {
    const target = Math.min(totalPages, Math.max(1, next));
    if (target === current) return;
    if (page === undefined) setInternalPage(target);
    onPageChange?.(target);
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.nav
        ref={ref}
        aria-label="Pagination"
        initial={{ opacity: 0, y: reduce ? 0 : 14 }}
        animate={{ opacity: inView ? 1 : 0, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5",
          className
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[12.5px] text-muted-foreground">
            Showing{" "}
            <span className="font-medium tabular-nums text-foreground">
              {start}–{end}
            </span>{" "}
            of <span className="tabular-nums text-foreground">{totalItems.toLocaleString("en-US")}</span>
          </p>
          <p className="hidden text-[11.5px] tabular-nums text-muted-foreground sm:block">
            Page {current} of {totalPages} · {pageSize} per page
          </p>
        </div>

        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current <= 1}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex min-w-0 items-center justify-center gap-0.5">
            <div className="hidden items-center gap-0.5 sm:flex">
              {pages.map((entry, index) =>
                entry === "gap" ? (
                  <span
                    key={`gap-${index}`}
                    aria-hidden="true"
                    className="flex h-8 w-7 items-center justify-center text-[12px] text-muted-foreground/70"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => goTo(entry)}
                    aria-label={`Go to page ${entry}`}
                    aria-current={entry === current ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12.5px] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      entry === current
                        ? "text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {entry === current ? (
                      <motion.span
                        layoutId={pillId}
                        className="absolute inset-0 rounded-md bg-foreground"
                        transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
                      />
                    ) : null}
                    <span className="relative z-10">{entry}</span>
                  </button>
                )
              )}
            </div>

            <span className="text-[12px] tabular-nums text-muted-foreground sm:hidden">
              Page {current} of {totalPages}
            </span>
          </div>

          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current >= totalPages}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 h-px w-full bg-border" />

        <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: reduce ? progress : 0 }}
            animate={{ scaleX: inView ? progress : 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
            style={{ transformOrigin: "left center" }}
            className="h-full rounded-full bg-foreground/40"
          />
        </div>
      </motion.nav>
    </MotionConfig>
  );
}

export default Pagination;
