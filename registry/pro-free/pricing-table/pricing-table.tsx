"use client";

import {
  Fragment,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { AlertTriangle, Check, Minus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type PricingPeriod = "monthly" | "yearly";

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  /** Price per editor when billed monthly. */
  monthlyPrice: number;
  /** Price per editor per month when billed yearly. */
  yearlyPrice: number;
  cta?: string;
  /** Small line under the CTA, e.g. "No card required". */
  note?: string;
  /** The featured plan gets the glow border and the column tint. */
  highlighted?: boolean;
  badge?: string;
};

export type PricingFeature = {
  label: string;
  /** Optional context shown under the label on wide screens. */
  hint?: string;
  /** One value per plan id: true, false, or a short string such as "25M". */
  values: Record<string, boolean | string>;
};

export type PricingFeatureGroup = {
  group: string;
  features: PricingFeature[];
};

export type PricingTableProps = {
  className?: string;
  title?: string;
  description?: string;
  plans?: PricingPlan[];
  groups?: PricingFeatureGroup[];
  defaultPeriod?: PricingPeriod;
  currency?: string;
  included?: string[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectPlan?: (plan: PricingPlan, period: PricingPeriod) => void;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "launch",
    name: "Launch",
    description: "For a first product team that needs the basics right.",
    monthlyPrice: 29,
    yearlyPrice: 23,
    cta: "Start 14-day trial",
    note: "No card required",
  },
  {
    id: "studio",
    name: "Studio",
    description: "For teams shipping to customers every week.",
    monthlyPrice: 79,
    yearlyPrice: 63,
    cta: "Start 14-day trial",
    note: "Most teams start here",
    highlighted: true,
    badge: "Most chosen",
  },
  {
    id: "scale",
    name: "Scale",
    description: "For platforms with procurement, audit and an SLA.",
    monthlyPrice: 149,
    yearlyPrice: 119,
    cta: "Talk to sales",
    note: "Annual invoicing available",
  },
];

const DEFAULT_GROUPS: PricingFeatureGroup[] = [
  {
    group: "Workspace",
    features: [
      {
        label: "Projects",
        values: { launch: "3", studio: "Unlimited", scale: "Unlimited" },
      },
      {
        label: "Editors",
        values: { launch: "5", studio: "25", scale: "Custom" },
      },
      {
        label: "Monthly events",
        values: { launch: "1M", studio: "25M", scale: "250M" },
      },
      {
        label: "Data retention",
        values: { launch: "30 days", studio: "12 months", scale: "Custom" },
      },
    ],
  },
  {
    group: "Collaboration",
    features: [
      {
        label: "Roles and permissions",
        values: { launch: false, studio: true, scale: true },
      },
      {
        label: "Comments and mentions",
        values: { launch: true, studio: true, scale: true },
      },
      {
        label: "Approval workflows",
        values: { launch: false, studio: false, scale: true },
      },
      {
        label: "Shared saved views",
        values: { launch: "3", studio: "Unlimited", scale: "Unlimited" },
      },
    ],
  },
  {
    group: "Reporting",
    features: [
      {
        label: "Funnels and retention",
        values: { launch: false, studio: true, scale: true },
      },
      {
        label: "Warehouse sync",
        values: { launch: false, studio: "Hourly", scale: "Streaming" },
      },
      {
        label: "Custom reports",
        values: { launch: "3", studio: "Unlimited", scale: "Unlimited" },
      },
      {
        label: "Scheduled exports",
        values: { launch: "Weekly", studio: "Daily", scale: "Any cadence" },
      },
    ],
  },
  {
    group: "Security",
    features: [
      {
        label: "SAML SSO",
        values: { launch: false, studio: true, scale: true },
      },
      {
        label: "SCIM provisioning",
        values: { launch: false, studio: false, scale: true },
      },
      {
        label: "Audit log",
        values: { launch: "90 days", studio: "12 months", scale: "Custom" },
      },
      {
        label: "Data residency",
        hint: "Choose where new workspaces are stored.",
        values: { launch: false, studio: false, scale: true },
      },
    ],
  },
  {
    group: "Support",
    features: [
      {
        label: "Support",
        values: { launch: "Email", studio: "Email + chat", scale: "Dedicated" },
      },
      {
        label: "Uptime SLA",
        values: { launch: "99.9%", studio: "99.9%", scale: "99.99%" },
      },
      {
        label: "Onboarding",
        values: { launch: "Docs", studio: "Guided", scale: "White-glove" },
      },
    ],
  },
];

const DEFAULT_INCLUDED = [
  "Unlimited viewers",
  "30-day version history",
  "Slack and email alerts",
  "Monthly usage export",
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function formatMoney(value: number, currency: string) {
  return `${currency}${Math.round(value).toLocaleString("en-US")}`;
}

function yearlyDiscount(plan: PricingPlan) {
  if (plan.monthlyPrice <= 0) return 0;
  return Math.round((1 - plan.yearlyPrice / plan.monthlyPrice) * 100);
}

/* ------------------------------------------------------------------ */
/* price: one digit at a time, both directions                         */
/* ------------------------------------------------------------------ */

function PriceDigit({
  char,
  period,
  reduce,
}: {
  char: string;
  period: PricingPeriod;
  reduce: boolean;
}) {
  return (
    <span className="relative inline-block overflow-hidden align-baseline">
      <span aria-hidden="true" className="invisible">
        {char}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={`${period}-${char}`}
          className="absolute inset-0 flex items-center justify-center"
          initial={
            reduce
              ? false
              : { y: period === "yearly" ? "72%" : "-72%", opacity: 0 }
          }
          animate={{ y: "0%", opacity: 1 }}
          exit={
            reduce
              ? { opacity: 0 }
              : { y: period === "yearly" ? "-72%" : "72%", opacity: 0 }
          }
          transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function MorphPrice({
  value,
  period,
  reduce,
}: {
  value: number;
  period: PricingPeriod;
  reduce: boolean;
}) {
  const chars = Math.round(value).toLocaleString("en-US").split("");

  return (
    <span aria-hidden="true" className="inline-flex items-baseline tabular-nums">
      {chars.map((char, index) =>
        /\d/.test(char) ? (
          <PriceDigit
            key={index}
            char={char}
            period={period}
            reduce={reduce}
          />
        ) : (
          <span key={index} className="inline-block">
            {char}
          </span>
        ),
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* featured plan: a slow band of light around the card                 */
/* ------------------------------------------------------------------ */

const GLOW_GRADIENT =
  "conic-gradient(from 0deg, transparent 0deg 70deg, color-mix(in oklab, var(--chart-1) 58%, transparent) 105deg, color-mix(in oklab, var(--chart-2) 46%, transparent) 135deg, transparent 175deg, transparent 360deg)";

function GlowFrame({
  reduce,
  className,
  children,
}: {
  reduce: boolean;
  className?: string;
  children: ReactNode;
}) {
  const spin = reduce
    ? undefined
    : ({ rotate: 360 } as const);
  const transition = reduce
    ? undefined
    : ({ duration: 16, repeat: Infinity, ease: "linear" } as const);

  return (
    <div className={cn("relative", className)}>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] rounded-2xl opacity-25 blur-md"
        style={{ background: GLOW_GRADIENT }}
        animate={spin}
        transition={transition}
      />
      <div className="relative overflow-hidden rounded-xl p-px">
        <motion.span
          aria-hidden="true"
          className="absolute -inset-[120%]"
          style={{ background: GLOW_GRADIENT }}
          animate={spin}
          transition={transition}
        />
        <div className="relative rounded-[11px] bg-card">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* one plan                                                            */
/* ------------------------------------------------------------------ */

function PlanHead({
  plan,
  period,
  currency,
  reduce,
  onSelect,
}: {
  plan: PricingPlan;
  period: PricingPeriod;
  currency: string;
  reduce: boolean;
  onSelect?: (plan: PricingPlan, period: PricingPeriod) => void;
}) {
  const monthly = plan.monthlyPrice;
  const yearly = plan.yearlyPrice;
  const price = period === "yearly" ? yearly : monthly;
  const annual = yearly * 12;
  const annualSaving = (monthly - yearly) * 12;
  const badge = plan.badge ?? "Most chosen";

  return (
    <div className="flex h-full flex-col p-4 text-left">
      <div className="flex min-h-[22px] items-center justify-between gap-2">
        <h3
          className="truncate text-[15px] font-semibold tracking-tight"
          title={plan.name}
        >
          {plan.name}
        </h3>
        {plan.highlighted ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10.5px] font-medium text-foreground">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 min-h-[34px] text-[11.5px] leading-4 text-muted-foreground">
        {plan.description}
      </p>

      <span className="sr-only">
        {plan.name}, {formatMoney(price, currency)} per editor per month,{" "}
        {period === "yearly"
          ? `billed ${formatMoney(annual, currency)} yearly.`
          : "billed monthly."}
      </span>

      <div className="mt-4 flex items-baseline gap-1">
        <span
          aria-hidden="true"
          className="text-[17px] font-medium text-muted-foreground"
        >
          {currency}
        </span>
        <span
          aria-hidden="true"
          className="text-[36px] font-semibold leading-none tracking-tight sm:text-[40px]"
        >
          <MorphPrice value={price} period={period} reduce={reduce} />
        </span>
      </div>

      <p className="mt-1.5 text-[10.5px] text-muted-foreground">
        per editor / month
      </p>

      <div className="mt-1 h-4 text-[10.5px] text-muted-foreground">
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={period}
            className="block tabular-nums"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
          >
            {period === "yearly"
              ? `Billed ${formatMoney(annual, currency)} yearly`
              : "Billed monthly"}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => onSelect?.(plan, period)}
        className={cn(
          "mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          plan.highlighted
            ? "bg-foreground text-background hover:opacity-90"
            : "border border-border bg-background text-foreground hover:bg-muted",
        )}
      >
        {plan.cta ?? "Choose plan"}
      </button>

      <p className="mt-2 text-[10.5px] text-muted-foreground">
        {period === "yearly" && annualSaving > 0
          ? `Saves ${formatMoney(annualSaving, currency)} a year`
          : plan.note}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* feature value                                                       */
/* ------------------------------------------------------------------ */

function FeatureValue({ value }: { value: boolean | string | undefined }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-foreground">
        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
        <span className="sr-only">Included</span>
      </span>
    );
  }

  if (value === false || value === undefined) {
    return (
      <span className="inline-flex items-center justify-center text-muted-foreground/45">
        <Minus aria-hidden="true" className="size-3.5" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }

  return (
    <span className="text-[12px] font-medium tabular-nums text-foreground">
      {value}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* loading + empty                                                     */
/* ------------------------------------------------------------------ */

function PricingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading plans"
      className="animate-pulse motion-reduce:animate-none"
    >
      <div className="h-7 w-48 rounded-md bg-muted" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" />
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((column) => (
          <div key={column} className="rounded-xl border border-border p-4">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="mt-3 h-3 w-full rounded bg-muted" />
            <div className="mt-6 h-10 w-24 rounded bg-muted" />
            <div className="mt-4 h-9 w-full rounded-lg bg-muted" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-4 rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function PricingTable({
  className,
  title = "Plans and limits",
  description = "Every plan bills per editor. Viewers, guests and read-only links are free.",
  plans = DEFAULT_PLANS,
  groups = DEFAULT_GROUPS,
  defaultPeriod = "yearly",
  currency = "$",
  included = DEFAULT_INCLUDED,
  loading = false,
  error = null,
  onRetry,
  onSelectPlan,
}: PricingTableProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const show = inView || reduce;

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const periodPill = `pricing-period-${uid}`;
  const planPill = `pricing-plan-${uid}`;

  const [period, setPeriod] = useState<PricingPeriod>(defaultPeriod);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<{
    plan: PricingPlan;
    period: PricingPeriod;
  } | null>(null);

  const activePlan =
    plans.find((plan) => plan.id === activeId) ??
    plans.find((plan) => plan.highlighted) ??
    plans[0];

  const discount = plans.reduce(
    (best, plan) => Math.max(best, yearlyDiscount(plan)),
    0,
  );

  const onDigit = (value: PricingPeriod) => setPeriod(value);

  const choosePlan = (plan: PricingPlan, chosenPeriod: PricingPeriod) => {
    setChosen({ plan, period: chosenPeriod });
    onSelectPlan?.(plan, chosenPeriod);
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={rootRef}
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: show ? 1 : 0, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        className={cn(
          "mx-auto w-full max-w-6xl p-5 text-foreground sm:p-8",
          className,
        )}
      >
        {loading ? (
          <PricingSkeleton />
        ) : error ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-[17px] font-semibold tracking-tight">
              Prices did not load
            </h2>
            <p className="mt-1.5 max-w-md text-[13px] leading-5 text-muted-foreground">
              {error}
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : plans.length === 0 || !activePlan ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center">
            <p className="text-[13.5px] font-medium">No plans to show</p>
            <p className="mt-1 max-w-sm text-[12.5px] leading-5 text-muted-foreground">
              Add at least one plan to render the table.
            </p>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0 max-w-xl">
                <h2 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
                  {title}
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div
                  role="group"
                  aria-label="Billing period"
                  className="inline-flex items-center rounded-full border border-border bg-muted p-0.5 text-[12px] font-medium"
                >
                  {(["monthly", "yearly"] as const).map((value) => {
                    const active = period === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onDigit(value)}
                        className={cn(
                          "relative rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {active ? (
                          <motion.span
                            aria-hidden="true"
                            layoutId={periodPill}
                            className="absolute inset-0 rounded-full bg-background shadow-sm"
                            transition={
                              reduce
                                ? { duration: 0 }
                                : { duration: 0.3, ease: EASE }
                            }
                          />
                        ) : null}
                        <span className="relative z-10">
                          {value === "monthly" ? "Monthly" : "Yearly"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  {discount > 0 ? (
                    <>
                      Yearly saves up to{" "}
                      <span className="font-medium text-foreground">
                        {discount}%
                      </span>{" "}
                      · prices in {currency === "$" ? "USD" : currency}
                    </>
                  ) : (
                    <>Prices in {currency === "$" ? "USD" : currency}</>
                  )}
                </p>
              </div>
            </header>

            {/* wide: the comparison table */}
            <div className="mt-7 hidden lg:block">
              <table className="w-full table-fixed border-collapse text-left">
                <caption className="sr-only">
                  Plan comparison: {plans.map((plan) => plan.name).join(", ")}.
                  Prices are per editor and month.
                </caption>
                <colgroup>
                  <col className="w-[28%]" />
                  {plans.map((plan) => (
                    <col
                      key={plan.id}
                      style={{ width: `${72 / Math.max(1, plans.length)}%` }}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="border-b border-border pb-5 pr-4 align-bottom"
                    >
                      <p className="text-[12px] font-medium text-foreground">
                        Compare plans
                      </p>
                      <p className="mt-1 text-[10.5px] leading-4 text-muted-foreground">
                        Per editor, per month. Prices exclude tax.
                      </p>
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        scope="col"
                        className={cn(
                          "border-b border-border px-2 pb-5 align-bottom",
                          plan.highlighted && "bg-foreground/[0.035]",
                        )}
                      >
                        {plan.highlighted ? (
                          <GlowFrame reduce={reduce}>
                            <PlanHead
                              plan={plan}
                              period={period}
                              currency={currency}
                              reduce={reduce}
                              onSelect={choosePlan}
                            />
                          </GlowFrame>
                        ) : (
                          <PlanHead
                            plan={plan}
                            period={period}
                            currency={currency}
                            reduce={reduce}
                            onSelect={choosePlan}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, groupIndex) => (
                    <Fragment key={group.group}>
                      <tr>
                        <th
                          scope="colgroup"
                          colSpan={plans.length + 1}
                          className={cn(
                            "pb-2 pt-5 text-[11px] font-medium text-muted-foreground",
                            groupIndex === 0
                              ? "pt-3"
                              : "border-t border-border",
                          )}
                        >
                          {group.group}
                        </th>
                      </tr>
                      {group.features.map((feature) => (
                        <tr key={feature.label} className="group/row">
                          <th
                            scope="row"
                            className="py-2.5 pr-4 text-left text-[12.5px] font-normal text-muted-foreground transition-colors group-hover/row:text-foreground"
                          >
                            <span className="block truncate" title={feature.label}>
                              {feature.label}
                            </span>
                            {feature.hint ? (
                              <span className="mt-0.5 hidden text-[10.5px] leading-4 text-muted-foreground lg:block">
                                {feature.hint}
                              </span>
                            ) : null}
                          </th>
                          {plans.map((plan) => (
                            <td
                              key={plan.id}
                              className={cn(
                                "px-2 py-2.5 text-center transition-colors group-hover/row:bg-muted/40",
                                plan.highlighted &&
                                  "bg-foreground/[0.035] group-hover/row:bg-muted/60",
                              )}
                            >
                              <FeatureValue value={feature.values[plan.id]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* narrow: one plan at a time, same rows */}
            <div className="mt-6 lg:hidden">
              <div
                role="group"
                aria-label="Choose a plan to compare"
                className="grid gap-0.5 rounded-lg border border-border bg-muted p-0.5"
                style={{
                  gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))`,
                }}
              >
                {plans.map((plan) => {
                  const active = plan.id === activePlan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveId(plan.id)}
                      className={cn(
                        "relative rounded-md px-2 py-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {active ? (
                        <motion.span
                          aria-hidden="true"
                          layoutId={planPill}
                          className="absolute inset-0 rounded-md bg-background shadow-sm"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { duration: 0.3, ease: EASE }
                          }
                        />
                      ) : null}
                      <span className="relative z-10 block truncate">
                        {plan.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={activePlan.id}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                  className="mt-3"
                >
                  {activePlan.highlighted ? (
                    <GlowFrame reduce={reduce}>
                      <PlanHead
                        plan={activePlan}
                        period={period}
                        currency={currency}
                        reduce={reduce}
                        onSelect={choosePlan}
                      />
                      <div className="px-4 pb-4">
                        <MobileFeatureRows
                          groups={groups}
                          planId={activePlan.id}
                        />
                      </div>
                    </GlowFrame>
                  ) : (
                    <div className="rounded-xl border border-border bg-card">
                      <PlanHead
                        plan={activePlan}
                        period={period}
                        currency={currency}
                        reduce={reduce}
                        onSelect={choosePlan}
                      />
                      <div className="px-4 pb-4">
                        <MobileFeatureRows
                          groups={groups}
                          planId={activePlan.id}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                Included in every plan
              </span>
              {included.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <Check
                    aria-hidden="true"
                    className="size-3 text-foreground/70"
                  />
                  {item}
                </span>
              ))}
              {chosen ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground"
                >
                  <Check aria-hidden="true" className="size-3 text-success" />
                  {chosen.plan.name} ·{" "}
                  {chosen.period === "yearly" ? "yearly billing" : "monthly billing"}
                </span>
              ) : null}
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              Billing period: {period}.{" "}
              {activePlan.name} costs {formatMoney(
                period === "yearly"
                  ? activePlan.yearlyPrice
                  : activePlan.monthlyPrice,
                currency,
              )}{" "}
              per editor per month.
            </p>
          </>
        )}
      </motion.div>
    </MotionConfig>
  );
}

function MobileFeatureRows({
  groups,
  planId,
}: {
  groups: PricingFeatureGroup[];
  planId: string;
}) {
  return (
    <div>
      {groups.map((group) => (
        <div key={group.group}>
          <p className="mt-4 text-[11px] font-medium text-muted-foreground">
            {group.group}
          </p>
          <div className="mt-1 divide-y divide-border border-y border-border">
            {group.features.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center justify-between gap-4 py-2"
              >
                <span className="min-w-0 truncate text-[12px] text-muted-foreground">
                  {feature.label}
                </span>
                <FeatureValue value={feature.values[planId]} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PricingTable;
