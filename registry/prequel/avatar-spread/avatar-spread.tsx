"use client";

import { useRef, useState } from "react";
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

export type AvatarSpreadPerson = {
  id: string;
  name: string;
  role?: string;
  /** online shows a green dot, away a grey one, busy a red one. */
  status?: "online" | "away" | "busy";
};

export type AvatarSpreadProps = {
  className?: string;
  title?: string;
  description?: string;
  people?: AvatarSpreadPerson[];
  /** Person that gets the filled avatar. Defaults to the first person. */
  currentId?: string;
  /** Extra people who do not get an avatar of their own. Defaults to 3. */
  moreCount?: number;
  /** Short line under the group. Defaults to a real-looking team count. */
  note?: string;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_PEOPLE: AvatarSpreadPerson[] = [
  { id: "ama", name: "Ama Mensah", role: "Product", status: "online" },
  { id: "lucas", name: "Lucas Ferreira", role: "Design", status: "online" },
  { id: "mei", name: "Mei Tanaka", role: "Engineering", status: "away" },
  { id: "jonas", name: "Jonas Weber", role: "Data", status: "online" },
  { id: "priya", name: "Priya Nair", role: "Support", status: "busy" },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const STATUS_COLOR: Record<NonNullable<AvatarSpreadPerson["status"]>, string> = {
  online: "bg-success",
  away: "bg-muted-foreground",
  busy: "bg-destructive",
};

const STATUS_LABEL: Record<NonNullable<AvatarSpreadPerson["status"]>, string> = {
  online: "online",
  away: "away",
  busy: "in a meeting",
};

/* ------------------------------------------------------------------ */
/* one avatar                                                          */
/* ------------------------------------------------------------------ */

type AvatarButtonProps = {
  person: AvatarSpreadPerson;
  index: number;
  total: number;
  spread: boolean;
  show: boolean;
  reduce: boolean;
  current: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
};

function AvatarButton({
  person,
  index,
  total,
  spread,
  show,
  reduce,
  current,
  hovered,
  onHover,
}: AvatarButtonProps) {
  const status = person.status ?? "away";
  const offset = index - (total - 1) / 2;

  return (
    <motion.button
      type="button"
      onMouseEnter={() => onHover(person.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(person.id)}
      onBlur={() => onHover(null)}
      aria-label={`${person.name}${person.role ? `, ${person.role}` : ""}, ${STATUS_LABEL[status]}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{
        opacity: show || reduce ? 1 : 0,
        y: show || reduce ? 0 : 8,
        x: spread && !reduce ? index * 15 : 0,
        rotate: spread && !reduce ? offset * 2.6 : 0,
      }}
      transition={{
        duration: reduce ? 0 : 0.45,
        ease: EASE,
        delay: reduce ? 0 : index * 0.05,
        x: reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 340, damping: 28, mass: 0.7 },
        rotate: reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 340, damping: 28, mass: 0.7 },
      }}
      style={{ zIndex: hovered ? 30 : total - index }}
      className={cn(
        "group relative -ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-[11px] font-semibold tracking-tight first:ml-0",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none",
        current
          ? "bg-foreground text-background"
          : "bg-muted text-foreground hover:bg-secondary",
        "sm:h-10 sm:w-10 sm:text-[12px]"
      )}
    >
      <span aria-hidden="true">{initials(person.name)}</span>

      <span
        aria-hidden="true"
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
          STATUS_COLOR[status]
        )}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {person.name}
        {current ? " · you" : ""}
      </span>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function AvatarSpread({
  className,
  title = "In this file",
  description = "Pricing page · design review",
  people = DEFAULT_PEOPLE,
  currentId,
  moreCount = 3,
  note,
}: AvatarSpreadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const safePeople = people.length > 0 ? people : DEFAULT_PEOPLE;
  const [spread, setSpread] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const shown = safePeople.slice(0, 6);
  const extra = Math.max(0, moreCount) + Math.max(0, safePeople.length - shown.length);
  const active = shown.find((person) => person.id === hovered) ?? shown[0];
  const activeStatus = active?.status ?? "online";
  const current = currentId ?? shown[0]?.id;

  const online = shown.filter((person) => person.status === "online").length;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={inView || reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-6",
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
            <span
              aria-hidden="true"
              className="relative flex h-2 w-2 items-center justify-center"
            >
              <span aria-hidden="true" className="absolute h-2 w-2 rounded-full bg-success/25" />
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-success" />
            </span>
            <span className="tabular-nums">{online} editing</span>
          </span>
        </div>

        <div
          className="mt-6 flex min-h-[44px] items-center"
          onMouseEnter={() => setSpread(true)}
          onMouseLeave={() => {
            setSpread(false);
            setHovered(null);
          }}
          onFocusCapture={() => setSpread(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setSpread(false);
              setHovered(null);
            }
          }}
        >
          <div className="flex items-center pr-14">
            {shown.map((person, index) => (
              <AvatarButton
                key={person.id}
                person={person}
                index={index}
                total={shown.length}
                spread={spread}
                show={inView}
                reduce={reduce}
                current={person.id === current}
                hovered={person.id === hovered}
                onHover={setHovered}
              />
            ))}

            {extra > 0 ? (
              <motion.span
                aria-hidden="true"
                initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: inView || reduce ? 1 : 0,
                  scale: inView || reduce ? 1 : 0.8,
                  x: spread && !reduce ? shown.length * 15 : 0,
                }}
                transition={{
                  duration: reduce ? 0 : 0.4,
                  ease: EASE,
                  delay: reduce ? 0 : shown.length * 0.05,
                  x: reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 340, damping: 28, mass: 0.7 },
                }}
                style={{ zIndex: 0 }}
                className="relative -ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-border bg-background text-[10.5px] font-medium tabular-nums text-muted-foreground sm:h-10 sm:w-10"
              >
                +{extra}
              </motion.span>
            ) : null}
          </div>
        </div>

        <p className="mt-5 min-h-9 text-[12.5px] leading-5 text-muted-foreground">
          {active ? (
            <>
              <span className="font-medium text-foreground">{active.name}</span>
              {active.role ? ` · ${active.role}` : ""} ·{" "}
              <span
                className={cn(
                  activeStatus === "online" ? "text-success" : undefined
                )}
              >
                {STATUS_LABEL[activeStatus]}
              </span>
              . {note ?? `Everyone else can comment until Friday.`}
            </>
          ) : (
            note ?? "Everyone else can comment until Friday."
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5">
          <span className="text-[11.5px] text-muted-foreground">
            Hover the stack to fan it out
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
            live
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span className="tabular-nums">updated 4 min ago</span>
          </span>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

export default AvatarSpread;
