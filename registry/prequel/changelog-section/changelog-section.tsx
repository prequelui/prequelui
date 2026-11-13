"use client";

import { useId, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type ChangelogChangeTag = "new" | "improved" | "fixed";

export type ChangelogChange = {
  tag: ChangelogChangeTag;
  /** One concrete line describing the change. */
  text: string;
};

export type ChangelogRelease = {
  id: string;
  version: string;
  /** Display date, e.g. "Oct 28, 2026". */
  date: string;
  /** One-line title for the release. */
  title: string;
  changes: ChangelogChange[];
};

export type ChangelogSectionProps = {
  className?: string;
  title?: string;
  description?: string;
  releases?: ChangelogRelease[];
  /** Id of the release expanded on first render. Defaults to the newest one. */
  defaultOpenId?: string;
  feedHref?: string;
  feedLabel?: string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_RELEASES: ChangelogRelease[] = [
  {
    id: "v2-4-0",
    version: "v2.4.0",
    date: "Nov 10, 2026",
    title: "Saved views, background exports, and a quieter sidebar",
    changes: [
      {
        tag: "new",
        text: "Saved views pin filters, sorting, and columns, then share the whole layout with a link.",
      },
      {
        tag: "improved",
        text: "CSV exports run in the background and land in your inbox when they are ready.",
      },
      {
        tag: "improved",
        text: "The sidebar remembers which sections you keep open, separately for each workspace.",
      },
      {
        tag: "fixed",
        text: "Date ranges no longer slip by a day for timezones west of UTC.",
      },
    ],
  },
  {
    id: "v2-3-2",
    version: "v2.3.2",
    date: "Oct 27, 2026",
    title: "Timezone fixes and a faster command menu",
    changes: [
      {
        tag: "fixed",
        text: "Scheduled reports now use the workspace timezone instead of the browser one.",
      },
      {
        tag: "improved",
        text: "The command menu opens in 40 ms and indexes the last 12 months by default.",
      },
      {
        tag: "fixed",
        text: "Session expiry no longer interrupts an export that is already running.",
      },
    ],
  },
  {
    id: "v2-3-0",
    version: "v2.3.0",
    date: "Oct 13, 2026",
    title: "Audit log, custom roles, and bulk actions",
    changes: [
      {
        tag: "new",
        text: "Audit log with 90-day retention, filterable by member and by resource.",
      },
      {
        tag: "new",
        text: "Custom roles let you grant read-only access to a single project.",
      },
      {
        tag: "improved",
        text: "Bulk actions now act on 500 rows at once, with a progress indicator.",
      },
      {
        tag: "fixed",
        text: "Long workspace names truncate instead of pushing the avatar off-screen.",
      },
    ],
  },
  {
    id: "v2-2-0",
    version: "v2.2.0",
    date: "Sep 29, 2026",
    title: "Search, keyboard-first",
    changes: [
      {
        tag: "new",
        text: "Search across projects, invoices, and people from one box.",
      },
      {
        tag: "new",
        text: "Press ? anywhere to see every shortcut in the product.",
      },
      {
        tag: "improved",
        text: "Focus returns to the button that opened a dialog when it closes.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* tag styles                                                          */
/* ------------------------------------------------------------------ */

const TAG_META: Record<
  ChangelogChangeTag,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "border-success/25 bg-success/10 text-foreground",
  },
  improved: {
    label: "Improved",
    className: "border-chart-2/30 bg-chart-2/10 text-foreground",
  },
  fixed: {
    label: "Fixed",
    className: "border-border bg-muted text-muted-foreground",
  },
};

/* ------------------------------------------------------------------ */
/* one release                                                         */
/* ------------------------------------------------------------------ */

type ReleaseItemProps = {
  release: ChangelogRelease;
  index: number;
  total: number;
  open: boolean;
  reduce: boolean;
  onToggle: () => void;
};

function ReleaseItem({
  release,
  index,
  total,
  open,
  reduce,
  onToggle,
}: ReleaseItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const panelId = useId();
  const inView = useInView(itemRef, {
    once: true,
    margin: "-8% 0px -18% 0px",
  });
  const reached = reduce || inView;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isOnly = total === 1;

  return (
    <motion.li
      ref={itemRef}
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: reached ? 1 : 0, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.5,
        ease: EASE,
        delay: reduce ? 0 : Math.min(index, 3) * 0.05,
      }}
      className={cn("relative pl-7 sm:pl-8", !isLast && "pb-2")}
    >
      {/* rail segment: base line plus a foreground line that draws in */}
      {!isOnly ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-[7.5px] w-px",
            isFirst ? "top-[17px]" : "top-0",
            isLast ? "h-[17px]" : "bottom-0"
          )}
        >
          <span className="absolute inset-0 bg-border" />
          <motion.span
            className="absolute inset-0 origin-top bg-foreground/25"
            initial={false}
            animate={{ scaleY: reached ? 1 : 0 }}
            transition={{
              duration: reduce ? 0 : 0.9,
              ease: EASE,
              delay: reduce ? 0 : 0.15,
            }}
          />
        </div>
      ) : null}

      {/* the newest entry carries the lens; older entries are plain dots */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-[9px] flex h-4 w-4 items-center justify-center"
      >
        {isFirst ? (
          <>
            <span className="absolute inset-0 rounded-full border border-border bg-card" />
            <motion.span
              className="absolute inset-[3px] rounded-full bg-foreground"
              initial={false}
              animate={{ scale: reached ? 1 : 0, opacity: reached ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
            />
            <motion.span
              className="absolute right-[4px] top-[4px] h-[3px] w-[3px] rounded-full bg-muted-foreground/50"
              initial={false}
              animate={{ opacity: reached ? 0 : 1 }}
              transition={{ duration: reduce ? 0 : 0.25 }}
            />
            <motion.span
              className="absolute right-[4px] top-[4px] h-[3px] w-[3px] rounded-full bg-card"
              initial={false}
              animate={{ opacity: reached ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.25 }}
            />
          </>
        ) : (
          <motion.span
            className="absolute inset-[5px] rounded-full bg-foreground/30"
            initial={false}
            animate={{ scale: reached ? 1 : 0, opacity: reached ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
          />
        )}
      </span>

      <div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          className={cn(
            "-mx-2 flex w-[calc(100%+1rem)] flex-col rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            open ? "bg-muted/30" : "hover:bg-muted/40"
          )}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold tracking-tight tabular-nums">
              {release.version}
            </span>
            {isFirst ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-success"
                />
                Latest
              </span>
            ) : null}
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {release.date}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none",
                open ? "rotate-180" : "rotate-0"
              )}
            />
          </span>
          <span className="mt-1 block text-[13.5px] font-medium leading-snug text-card-foreground/80">
            {release.title}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="panel"
              id={panelId}
              role="region"
              aria-label={`${release.version} changes`}
              initial={{ opacity: 0, y: reduce ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -4 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}
            >
              <ul className="mt-1 space-y-2.5 border-t border-border px-2 pb-2 pt-3">
                {release.changes.map((change, changeIndex) => {
                  const meta = TAG_META[change.tag];
                  return (
                    <li
                      key={`${release.id}-${changeIndex}`}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className={cn(
                          "mt-px inline-flex min-w-[64px] shrink-0 items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-wide",
                          meta.className
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="min-w-0 text-[13px] leading-relaxed text-muted-foreground">
                        {change.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function ChangelogSection({
  className,
  title = "Changelog",
  description = "Product changes, written the week they ship. New builds land every other Tuesday.",
  releases = DEFAULT_RELEASES,
  defaultOpenId,
  feedHref = "https://github.com/prequelui/prequelui/releases",
  feedLabel = "All releases",
}: ChangelogSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const inView = useInView(sectionRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = reduce || inView;
  const [openId, setOpenId] = useState<string | null>(
    defaultOpenId ?? releases[0]?.id ?? null
  );

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        aria-labelledby={titleId}
        className={cn(
          "rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-7",
          className
        )}
      >
        <motion.header
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: show ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[20px] font-semibold tracking-tight sm:text-[22px]"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <a
            href={feedHref}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {feedLabel}
            <ArrowUpRight
              aria-hidden="true"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
            />
          </a>
        </motion.header>

        {releases.length > 0 ? (
          <ol className="mt-6">
            {releases.map((release, index) => (
              <ReleaseItem
                key={release.id}
                release={release}
                index={index}
                total={releases.length}
                open={openId === release.id}
                reduce={reduce}
                onToggle={() =>
                  setOpenId((current) =>
                    current === release.id ? null : release.id
                  )
                }
              />
            ))}
          </ol>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
            Nothing shipped yet. The first release lands soon.
          </p>
        )}
      </section>
    </MotionConfig>
  );
}

export default ChangelogSection;
