"use client";

import { useId, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type FaqSectionItem = {
  /** Stable id used for ARIA wiring and the open state. */
  id: string;
  /** Topic matched by the filter chips, e.g. "Install". */
  topic: string;
  question: string;
  /** Plain text; wrap commands or code in backticks. */
  answer: string;
};

export type FaqSectionProps = {
  className?: string;
  title?: string;
  intro?: string;
  contactText?: string;
  contactLabel?: string;
  contactHref?: string;
  items?: FaqSectionItem[];
  /** Topics rendered as filter chips. Defaults to Billing, Install, Licence. */
  topics?: string[];
  /** Show the topic filter. Defaults to true. */
  showFilter?: boolean;
  /** Allow more than one panel open at a time. Defaults to false. */
  allowMultiple?: boolean;
  /** Ids open on first render. Defaults to the first question. */
  defaultOpenIds?: string[];
};

/* ------------------------------------------------------------------ */
/* deterministic demo content                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_TITLE = "Questions, answered plainly.";
const DEFAULT_INTRO =
  "PrequelUI is MIT-licensed, installs with one command, and copies code you can read. Here is what people ask before adding their first block.";
const DEFAULT_CONTACT_TEXT =
  "Can't find your answer? Ask on GitHub — the same place the source lives.";
const DEFAULT_CONTACT_LABEL = "Ask on GitHub";
const DEFAULT_CONTACT_HREF = "https://github.com/prequelui";

const DEFAULT_TOPICS = ["Billing", "Install", "Licence"];

const DEFAULT_ITEMS: FaqSectionItem[] = [
  {
    id: "first-block",
    topic: "Install",
    question: "How do I add my first block?",
    answer:
      "Run `npx shadcn@latest add https://prequelui.terravidhal.me/r/area-chart.json`. The CLI copies the component into your project, so you can edit it, rename it, or remove the parts you don't need. It expects React 19, Tailwind CSS 4, and motion.",
  },
  {
    id: "updates",
    topic: "Install",
    question: "What happens when I update a block?",
    answer:
      "Re-run the add command with `--overwrite` to pull the latest version. If you have already edited the file, the CLI asks before replacing it — diff your changes first and merge by hand where it matters.",
  },
  {
    id: "app-router",
    topic: "Install",
    question: "Do the blocks work in the App Router?",
    answer:
      "Yes. Every block starts with `\"use client\"`, so it drops into a server-rendered page without a wrapper. Keep data fetching on the server and pass plain props down to the block.",
  },
  {
    id: "client-work",
    topic: "Licence",
    question: "Can I use the blocks in paid client work?",
    answer:
      "Yes. PrequelUI ships under the MIT licence, which covers commercial and client projects. Keep the licence notice in the repository and you are free to ship, rebrand, and extend the components.",
  },
  {
    id: "attribution",
    topic: "Licence",
    question: "Do I have to show attribution?",
    answer:
      "No visible credit is required. The MIT notice in the source files is enough, and you can move components into any folder structure your project already uses.",
  },
  {
    id: "pro-plan",
    topic: "Billing",
    question: "If the blocks are MIT, why is there a Pro plan?",
    answer:
      "Pro is a separate paid product for complete dashboards: every page, plus notifications, a command menu, export and colour themes. The free blocks stay free and complete — Pro never gates the code you already have.",
  },
  {
    id: "cancel",
    topic: "Billing",
    question: "What happens to my blocks if I stop paying for Pro?",
    answer:
      "Nothing. Free blocks are copied into your project and stay yours under the MIT licence. Cancelling Pro only ends access to Pro dashboards and their updates, with no export lock-in.",
  },
];

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Renders `inline code` spans inside an answer string. */
function AnswerText({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={index}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground [overflow-wrap:anywhere]"
          >
            {part}
          </code>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* plus that turns into a minus                                        */
/* ------------------------------------------------------------------ */

function PlusMinus({ open, reduce }: { open: boolean; reduce: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
    >
      <motion.span
        className="relative flex h-4 w-4 items-center justify-center"
        initial={false}
        animate={{ rotate: open ? 90 : 0 }}
        transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
      >
        <motion.span
          className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current"
          initial={false}
          animate={{ scaleX: open ? 0 : 1 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
        />
        <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current" />
      </motion.span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* one question                                                        */
/* ------------------------------------------------------------------ */

type FaqRowProps = {
  item: FaqSectionItem;
  index: number;
  open: boolean;
  show: boolean;
  reduce: boolean;
  onToggle: (id: string) => void;
  idPrefix: string;
};

function FaqRow({
  item,
  index,
  open,
  show,
  reduce,
  onToggle,
  idPrefix,
}: FaqRowProps) {
  const buttonId = `${idPrefix}-question-${item.id}`;
  const panelId = `${idPrefix}-answer-${item.id}`;
  const number = String(index + 1).padStart(2, "0");

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{
        opacity: show ? 1 : 0,
        y: show ? 0 : 8,
      }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{
        duration: reduce ? 0 : 0.28,
        ease: EASE,
        delay: reduce ? 0 : Math.min(index, 6) * 0.04,
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
          className="group flex w-full items-start gap-3 rounded-lg py-4 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4 sm:py-5"
        >
          <span
            className={cn(
              "w-5 shrink-0 pt-0.5 text-[11px] font-medium tabular-nums transition-colors",
              open
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {number}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 break-words text-[14.5px] font-medium leading-6 tracking-[-0.01em] transition-colors",
              open
                ? "text-foreground"
                : "text-foreground/85 group-hover:text-foreground"
            )}
          >
            {item.question}
          </span>
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
              open
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            <PlusMinus open={open} reduce={reduce} />
          </span>
        </button>
      </h3>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
        className="overflow-hidden"
      >
        <div className="break-words pb-4 pl-8 pr-6 text-[13.5px] leading-6 text-muted-foreground sm:pb-5 sm:pl-9">
          <AnswerText text={item.answer} />
        </div>
      </motion.div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function FaqSection({
  className,
  title = DEFAULT_TITLE,
  intro = DEFAULT_INTRO,
  contactText = DEFAULT_CONTACT_TEXT,
  contactLabel = DEFAULT_CONTACT_LABEL,
  contactHref = DEFAULT_CONTACT_HREF,
  items = DEFAULT_ITEMS,
  topics = DEFAULT_TOPICS,
  showFilter = true,
  allowMultiple = false,
  defaultOpenIds,
}: FaqSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = reduce || inView;

  const uid = useId().replace(/:/g, "");
  const headingId = `${uid}-heading`;
  const pillId = `${uid}-filter-pill`;

  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<string[]>(() => {
    const initial =
      defaultOpenIds ?? (items.length > 0 ? [items[0].id] : []);
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

  const entries = items.map((item, index) => ({ item, index }));
  const filtered =
    activeTopic === null
      ? entries
      : entries.filter(({ item }) => item.topic === activeTopic);

  const filtersVisible = showFilter && topics.length > 0;

  const countFor = (topic: string) =>
    items.filter((item) => item.topic === topic).length;

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={ref}
        aria-labelledby={title ? headingId : undefined}
        aria-label={title ? undefined : "Frequently asked questions"}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={
          show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 14 }
        }
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-8 lg:p-10",
          className
        )}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          <div className="lg:sticky lg:top-10 lg:self-start">
            {title ? (
              <h2
                id={headingId}
                className="text-balance text-2xl font-semibold tracking-tight sm:text-[28px] sm:leading-[1.15]"
              >
                {title}
              </h2>
            ) : null}
            {intro ? (
              <p className="mt-3 max-w-sm text-pretty text-[13.5px] leading-6 text-muted-foreground">
                {intro}
              </p>
            ) : null}

            <div className="mt-7 border-t border-border pt-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-background"
                >
                  <span className="absolute right-[5px] top-[5px] h-1 w-1 rounded-full bg-foreground/70" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-5 text-muted-foreground">
                    {contactText}
                  </p>
                  <a
                    href={contactHref}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {contactLabel}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Replies within two working days.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {filtersVisible ? (
              <div
                role="group"
                aria-label="Filter questions by topic"
                className="mb-4 flex flex-wrap items-center gap-1.5"
              >
                <FilterChip
                  label="All"
                  count={items.length}
                  active={activeTopic === null}
                  pillId={pillId}
                  reduce={reduce}
                  onClick={() => setActiveTopic(null)}
                />
                {topics.map((topic) => (
                  <FilterChip
                    key={topic}
                    label={topic}
                    count={countFor(topic)}
                    active={activeTopic === topic}
                    pillId={pillId}
                    reduce={reduce}
                    onClick={() => setActiveTopic(topic)}
                  />
                ))}
              </div>
            ) : null}

            {filtered.length > 0 ? (
              <ul className="relative border-t border-border">
                <AnimatePresence mode="popLayout">
                  {filtered.map(({ item, index }) => (
                    <FaqRow
                      key={item.id}
                      item={item}
                      index={index}
                      open={openIds.includes(item.id)}
                      show={show}
                      reduce={reduce}
                      onToggle={toggle}
                      idPrefix={uid}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <div className="border-t border-border py-6">
                <p className="text-[13px] leading-5 text-muted-foreground">
                  {activeTopic
                    ? `Nothing filed under ${activeTopic} yet.`
                    : "No questions here yet."}
                </p>
                {activeTopic ? (
                  <button
                    type="button"
                    onClick={() => setActiveTopic(null)}
                    className="mt-2 rounded-sm text-[13px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Show all topics
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/* filter chip                                                         */
/* ------------------------------------------------------------------ */

type FilterChipProps = {
  label: string;
  count: number;
  active: boolean;
  pillId: string;
  reduce: boolean;
  onClick: () => void;
};

function FilterChip({
  label,
  count,
  active,
  pillId,
  reduce,
  onClick,
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-transparent text-background"
          : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
      )}
    >
      {active ? (
        <motion.span
          layoutId={pillId}
          className="absolute inset-0 rounded-full bg-foreground"
          transition={
            reduce ? { duration: 0 } : { type: "tween", duration: 0.28, ease: EASE }
          }
        />
      ) : null}
      <span className="relative z-10 break-words">{label}</span>
      <span
        className={cn(
          "relative z-10 text-[11px] tabular-nums",
          active && "opacity-80"
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default FaqSection;
