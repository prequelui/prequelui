"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Inbox,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type DataTableStatus = "succeeded" | "pending" | "refunded" | "failed";

export type DataTableRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  /** Transaction amount, in whole currency units. */
  amount: number;
  status: DataTableStatus;
  /** ISO date string, e.g. "2026-11-09". Sorts lexicographically. */
  date: string;
};

export type DataTableSortKey = "name" | "plan" | "amount" | "status" | "date";

export type DataTableProps = {
  className?: string;
  title?: string;
  description?: string;
  rows?: DataTableRow[];
  /** Number of rows per page. */
  pageSize?: number;
  formatAmount?: (amount: number) => string;
  searchPlaceholder?: string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data (no Math.random / Date.now at module load)  */
/* ------------------------------------------------------------------ */

const DEFAULT_ROWS: DataTableRow[] = [
  { id: "tx-01", name: "Amara Osei", email: "amara@brightloom.io", plan: "Scale", amount: 4120, status: "succeeded", date: "2026-11-09" },
  { id: "tx-02", name: "Jonas Weber", email: "jonas@tidewell.com", plan: "Scale", amount: 3380, status: "succeeded", date: "2026-11-08" },
  { id: "tx-03", name: "Priya Raman", email: "priya@kestrel.ai", plan: "Growth", amount: 1720, status: "pending", date: "2026-11-08" },
  { id: "tx-04", name: "Mateo Silva", email: "mateo@quillfeather.co", plan: "Growth", amount: 990, status: "succeeded", date: "2026-11-07" },
  { id: "tx-05", name: "Ingrid Halvorsen", email: "ingrid@northgate.studio", plan: "Starter", amount: 349, status: "failed", date: "2026-11-06" },
  { id: "tx-06", name: "Chen Wei", email: "chen@emberoak.com", plan: "Scale", amount: 2890, status: "succeeded", date: "2026-11-05" },
  { id: "tx-07", name: "Sofia Rossi", email: "sofia@verdant.io", plan: "Starter", amount: 290, status: "refunded", date: "2026-11-04" },
  { id: "tx-08", name: "Liam O'Connor", email: "liam@fernway.app", plan: "Growth", amount: 1180, status: "succeeded", date: "2026-11-03" },
  { id: "tx-09", name: "Yuki Tanaka", email: "yuki@oakridge.co", plan: "Starter", amount: 290, status: "pending", date: "2026-11-02" },
  { id: "tx-10", name: "Elena Petrova", email: "elena@mosaic.dev", plan: "Scale", amount: 5120, status: "succeeded", date: "2026-11-01" },
  { id: "tx-11", name: "Noah Berg", email: "noah@halden.co", plan: "Growth", amount: 840, status: "failed", date: "2026-10-31" },
  { id: "tx-12", name: "Amina Diallo", email: "amina@nimbus.cloud", plan: "Starter", amount: 290, status: "succeeded", date: "2026-10-30" },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const STATUS_ORDER: Record<DataTableStatus, number> = {
  succeeded: 0,
  pending: 1,
  refunded: 2,
  failed: 3,
};

const STATUS_META: Record<
  DataTableStatus,
  { label: string; classes: string; dot: string }
> = {
  succeeded: {
    label: "Succeeded",
    classes: "border-success/25 bg-success/10 text-success",
    dot: "bg-success",
  },
  pending: {
    label: "Pending",
    classes: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  refunded: {
    label: "Refunded",
    classes: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  failed: {
    label: "Failed",
    classes: "border-destructive/25 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

function compareStrings(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareRows(
  a: DataTableRow,
  b: DataTableRow,
  key: DataTableSortKey
) {
  switch (key) {
    case "amount":
      return a.amount - b.amount;
    case "date":
      return compareStrings(a.date, b.date);
    case "name":
      return compareStrings(a.name, b.name);
    case "plan":
      return compareStrings(a.plan, b.plan);
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  }
}

function defaultDirection(key: DataTableSortKey): "asc" | "desc" {
  return key === "amount" || key === "date" ? "desc" : "asc";
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function defaultFormatAmount(amount: number) {
  return "$" + amount.toLocaleString("en-US");
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Compact window of page numbers with ellipses for long lists. */
function pageItems(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) return range(1, total);
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  const items: Array<number | "ellipsis"> = [1];
  if (left > 2) items.push("ellipsis");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}

type Column = {
  key: DataTableSortKey;
  label: string;
  align: "left" | "right";
};

const COLUMNS: Column[] = [
  { key: "name", label: "Customer", align: "left" },
  { key: "plan", label: "Plan", align: "left" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", align: "left" },
  { key: "date", label: "Date", align: "right" },
];

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function DataTable({
  className,
  title = "Recent transactions",
  description = "Payments and subscriptions across your workspace.",
  rows = DEFAULT_ROWS,
  pageSize = 6,
  formatAmount = defaultFormatAmount,
  searchPlaceholder = "Search customers…",
}: DataTableProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView;

  const inputId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{
    key: DataTableSortKey;
    dir: "asc" | "desc";
  }>({ key: "date", dir: "desc" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp = compareRows(a, b, sort.key);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(startIndex, startIndex + pageSize);

  const rangeStart = sorted.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, sorted.length);

  const handleSort = (key: DataTableSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: defaultDirection(key) }
    );
    setPage(1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <div className="p-5 sm:p-6">
          {/* header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor={inputId} className="sr-only">
                Search transactions
              </label>
              <input
                id={inputId}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    key="clear"
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: reduce ? 0 : 0.15 }}
                    className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* table */}
          <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  {COLUMNS.map((col) => {
                    const active = sort.key === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={
                          active
                            ? sort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={cn(
                          "border-b border-border px-3 py-2.5 text-xs font-medium first:pl-0 last:pr-0",
                          col.align === "right" ? "text-right" : "text-left"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            "group inline-flex items-center gap-1 rounded-md px-1.5 py-1 -my-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            col.align === "right" && "flex-row-reverse",
                            active
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span>{col.label}</span>
                          {active ? (
                            sort.dir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-70" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <motion.tr
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduce ? 0 : 0.3 }}
                  >
                    <td colSpan={COLUMNS.length} className="px-3 py-14">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <Inbox className="h-6 w-6 text-muted-foreground/60" />
                        <p className="text-sm font-medium">No transactions found</p>
                        <p className="text-[13px] text-muted-foreground">
                          Nothing matches “{query}”. Try a different search.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setPage(1);
                          }}
                          className="mt-1 rounded-md px-2 py-1 text-[13px] font-medium text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Clear search
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  <AnimatePresence initial={false}>
                    {pageRows.map((row, index) => {
                      const meta = STATUS_META[row.status];
                      const isLast = index === pageRows.length - 1;
                      return (
                        <motion.tr
                          key={row.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: show ? 1 : 0 }}
                          exit={{
                            opacity: 0,
                            transition: { duration: reduce ? 0 : 0.15 },
                          }}
                          transition={{
                            opacity: {
                              duration: reduce ? 0 : 0.35,
                              delay: reduce ? 0 : index * 0.04,
                              ease: EASE,
                            },
                            layout: { duration: reduce ? 0 : 0.45, ease: EASE },
                          }}
                          className="group/row transition-colors hover:bg-muted/50"
                        >
                          <td
                            className={cn(
                              "py-3 pr-3 text-left first:pl-0",
                              isLast ? "border-b-0" : "border-b border-border"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-medium text-foreground">
                                {initials(row.name)}
                                {/* the lens glint: a dot that rides the avatar's rim on hover */}
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/row:opacity-100"
                                >
                                  <span className="absolute inset-0 transition-transform duration-700 ease-out group-hover/row:rotate-[120deg]">
                                    <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground" />
                                  </span>
                                </span>
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {row.name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {row.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 text-left",
                              isLast ? "border-b-0" : "border-b border-border"
                            )}
                          >
                            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {row.plan}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 text-right tabular-nums",
                              isLast ? "border-b-0" : "border-b border-border"
                            )}
                          >
                            <span className="text-sm font-medium">
                              {formatAmount(row.amount)}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 text-left",
                              isLast ? "border-b-0" : "border-b border-border"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                meta.classes
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  meta.dot
                                )}
                              />
                              {meta.label}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "py-3 pl-3 pr-0 text-right tabular-nums",
                              isLast ? "border-b-0" : "border-b border-border"
                            )}
                          >
                            <span className="text-sm text-muted-foreground">
                              {formatDate(row.date)}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* footer / pagination */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] tabular-nums text-muted-foreground">
              {sorted.length === 0
                ? "0 results"
                : `Showing ${rangeStart}–${rangeEnd} of ${sorted.length}`}
            </p>

            <nav
              aria-label="Pagination"
              className="flex items-center gap-1 self-start sm:self-auto"
            >
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageItems(currentPage, totalPages).map((item, i) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${i}`}
                    aria-hidden
                    className="px-1 text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => setPage(item)}
                    className={cn(
                      "h-8 min-w-8 rounded-md px-2 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      item === currentPage
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                aria-label="Next page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </motion.section>
    </MotionConfig>
  );
}

export default DataTable;
