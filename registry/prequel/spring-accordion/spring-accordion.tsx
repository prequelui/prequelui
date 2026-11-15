"use client";

import { useId, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SPRING = { type: "spring", stiffness: 320, damping: 33 } as const;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type SpringAccordionItem = {
  id: string;
  title: string;
  /** Short value shown at the right of the row, e.g. "Admins". */
  meta?: string;
  /** Main explanation, one or two sentences. */
  body: string;
  /** Optional smaller line under the body. */
  footnote?: string;
};

export type SpringAccordionProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  items?: SpringAccordionItem[];
  /** Id open on first render. Defaults to the first item. */
  defaultOpen?: string;
  /** Keep several rows open at once. Defaults to false. */
  allowMultiple?: boolean;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS: SpringAccordionItem[] = [
  {
    id: "invites",
    title: "Who can invite members",
    meta: "Admins",
    body: "Owners and admins can send invites directly. Members can request one, and the request lands in the admin queue with a short note from them.",
    footnote: "Changed by Ama Mensah on 4 November.",
  },
  {
    id: "sessions",
    title: "Session lifetime",
    meta: "12 hours",
    body: "Every device is signed out after 12 hours of inactivity. Active sessions renew quietly while the tab stays open.",
    footnote: "Shorter lifetimes also apply to shared devices.",
  },
  {
    id: "retention",
    title: "Data retention",
    meta: "180 days",
    body: "Events and request logs are kept for 180 days, then removed on the next nightly pass. Exports are not affected.",
  },
  {
    id: "exports",
    title: "Export permissions",
    meta: "Owners",
    body: "Only owners can export member data. Admins can download reports, but the raw customer table stays restricted.",
    footnote: "Every export is written to the audit log.",
  },
];

/* ------------------------------------------------------------------ */
/* row                                                                 */
/* ------------------------------------------------------------------ */

type RowProps = {
  item: SpringAccordionItem;
  index: number;
  open: boolean;
  show: boolean;
  reduce: boolean;
  idBase: string;
  onToggle: (id: string) => void;
};

function AccordionRow({
  item,
  index,
  open,
  show,
  reduce,
  idBase,
  onToggle,
}: RowProps) {
  const buttonId = `${idBase}-button-${item.id}`;
  const panelId = `${idBase}-panel-${item.id}`;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 8 }}
      transition={{
        duration: reduce ? 0 : 0.45,
        ease: EASE,
        delay: reduce ? 0 : index * 0.05,
      }}
      className="border-b border-border last:border-b-0"
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(item.id)}
          className="group flex w-full items-center gap-3 rounded-lg py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4"
        >
          <span
            className={cn(
              "min-w-0 flex-1 break-words text-[14px] font-medium leading-5 tracking-[-0.01em] transition-colors",
              open
                ? "text-foreground"
                : "text-foreground/85 group-hover:text-foreground"
            )}
          >
            {item.title}
          </span>

          {item.meta ? (
            <span className="hidden shrink-0 text-[12px] tabular-nums text-muted-foreground sm:inline">
              {item.meta}
            </span>
          ) : null}

          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : SPRING}
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
              open
                ? "border-foreground/25 text-foreground"
                : "border-border text-muted-foreground group-hover:border-muted-foreground/40 group-hover:text-foreground"
            )}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </motion.span>
        </button>
      </h3>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : SPRING}
        className="overflow-hidden"
      >
        <div className="pb-4 pr-8 sm:pb-5 sm:pr-10">
          <p className="break-words text-[13px] leading-6 text-muted-foreground">
            {item.body}
          </p>
          {item.meta ? (
            <p className="mt-1.5 text-[12px] tabular-nums text-muted-foreground sm:hidden">
              {item.meta}
            </p>
          ) : null}
          {item.footnote ? (
            <p className="mt-2 break-words text-[12px] leading-5 text-muted-foreground/80">
              {item.footnote}
            </p>
          ) : null}
        </div>
      </motion.div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function SpringAccordion({
  className,
  title = "Workspace policies",
  subtitle = "Changes apply to all 27 members.",
  items = DEFAULT_ITEMS,
  defaultOpen,
  allowMultiple = false,
}: SpringAccordionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = reduce || inView;

  const uid = useId().replace(/:/g, "");
  const idBase = `spring-accordion-${uid}`;

  const [openIds, setOpenIds] = useState<string[]>(() => {
    const initial =
      defaultOpen && items.some((item) => item.id === defaultOpen)
        ? [defaultOpen]
        : items.length > 0
          ? [items[0].id]
          : [];
    return allowMultiple ? initial : initial.slice(0, 1);
  });

  const toggle = (id: string) => {
    setOpenIds((current) => {
      if (current.includes(id)) {
        return current.filter((openId) => openId !== id);
      }
      return allowMultiple ? [...current, id] : [id];
    });
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {subtitle}
              </p>
            </div>
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
              {items.length} {items.length === 1 ? "policy" : "policies"}
            </span>
          </div>

          {items.length > 0 ? (
            <ul className="mt-4 border-t border-border">
              {items.map((item, index) => (
                <AccordionRow
                  key={item.id}
                  item={item}
                  index={index}
                  open={openIds.includes(item.id)}
                  show={show}
                  reduce={reduce}
                  idBase={idBase}
                  onToggle={toggle}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-[13px] text-muted-foreground">
              No policies defined yet.
            </p>
          )}
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default SpringAccordion;
