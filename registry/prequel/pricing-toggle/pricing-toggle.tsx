"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type BillingPeriod = "monthly" | "yearly";

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  /** Price per month when billed monthly. */
  monthlyPrice: number;
  /** Price per month when billed yearly. */
  yearlyPrice: number;
  features: string[];
  cta?: string;
  recommended?: boolean;
};

export type PricingToggleProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  plans?: PricingPlan[];
  defaultPeriod?: BillingPeriod;
  /** Percentage shown on the yearly saving badge. Defaults to 20. */
  yearlyDiscount?: number;
  /** Currency symbol placed before every price. Defaults to "$". */
  currency?: string;
  onSelectPlan?: (plan: PricingPlan, period: BillingPeriod) => void;
};

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_TITLE = "Simple pricing for every stage";
const DEFAULT_SUBTITLE =
  "Start free, then pick the plan that fits your team. No hidden fees, cancel whenever you like.";

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For small projects and side ideas finding their feet.",
    monthlyPrice: 19,
    yearlyPrice: 15,
    features: [
      "Up to 3 projects",
      "10 GB storage",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start free",
  },
  {
    id: "studio",
    name: "Studio",
    description: "For growing teams that ship every week.",
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: [
      "Unlimited projects",
      "100 GB storage",
      "Advanced analytics",
      "Custom domains",
      "Priority support",
    ],
    cta: "Start free trial",
    recommended: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For organisations that need control and room to grow.",
    monthlyPrice: 99,
    yearlyPrice: 79,
    features: [
      "Everything in Studio",
      "1 TB storage",
      "SSO and audit logs",
      "Dedicated support",
      "99.9% uptime SLA",
    ],
    cta: "Contact sales",
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function formatAmount(value: number, currency: string) {
  return `${currency}${Math.round(value).toLocaleString("en-US")}`;
}

/* ------------------------------------------------------------------ */
/* digit-by-digit price morph                                          */
/* ------------------------------------------------------------------ */

function AnimatedDigit({
  char,
  index,
  reduce,
}: {
  char: string;
  index: number;
  reduce: boolean;
}) {
  return (
    <span className="relative inline-block overflow-hidden align-baseline">
      {/* invisible glyph keeps the slot at its final width */}
      <span className="invisible">{char}</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={char}
          className="absolute inset-0 flex items-center justify-center"
          initial={reduce ? false : { y: "80%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-80%", opacity: 0 }}
          transition={{
            duration: reduce ? 0 : 0.34,
            ease: EASE,
            delay: reduce ? 0 : index * 0.025,
          }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function AnimatedPrice({
  value,
  reduce,
}: {
  value: number;
  reduce: boolean;
}) {
  const chars = Math.round(value).toLocaleString("en-US").split("");

  return (
    <span aria-hidden="true" className="inline-flex items-baseline tabular-nums">
      {chars.map((char, index) =>
        /\d/.test(char) ? (
          <AnimatedDigit
            key={index}
            char={char}
            index={index}
            reduce={reduce}
          />
        ) : (
          <span key={index} className="inline-block">
            {char}
          </span>
        )
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* recommended plan: a slow light travelling around the border         */
/* ------------------------------------------------------------------ */

function BorderLight({ reduce }: { reduce: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl p-px"
      style={{
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        maskComposite: "exclude",
      }}
    >
      <motion.span
        className="absolute -inset-[110%] block opacity-60"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 18deg, var(--foreground) 46deg, transparent 74deg)",
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* one plan card                                                       */
/* ------------------------------------------------------------------ */

type PricingCardProps = {
  plan: PricingPlan;
  index: number;
  yearly: boolean;
  show: boolean;
  reduce: boolean;
  currency: string;
  onSelect?: (plan: PricingPlan, period: BillingPeriod) => void;
};

function PricingCard({
  plan,
  index,
  yearly,
  show,
  reduce,
  currency,
  onSelect,
}: PricingCardProps) {
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  const annual = Math.round(plan.yearlyPrice * 12);
  const period: BillingPeriod = yearly ? "yearly" : "monthly";

  return (
    <motion.li
      initial={{ opacity: 0, y: reduce ? 0 : 18 }}
      animate={{ opacity: show ? 1 : 0, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.55,
        ease: EASE,
        delay: reduce ? 0 : index * 0.08,
      }}
      className={cn(
        "relative flex h-full min-w-0 flex-col rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6",
        plan.recommended ? "border-foreground/20" : "border-border"
      )}
    >
      {plan.recommended ? <BorderLight reduce={reduce} /> : null}

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-medium tracking-tight">
            {plan.name}
          </h3>
          {plan.recommended ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-2 py-0.5 text-[10.5px] font-medium tracking-wide text-foreground/80">
              <span
                aria-hidden="true"
                className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full border border-current"
              >
                <span className="absolute right-[1px] top-[1px] h-[2px] w-[2px] rounded-full bg-current" />
              </span>
              Recommended
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 min-h-10 text-[13px] leading-5 text-muted-foreground">
          {plan.description}
        </p>

        <p className="sr-only">
          {plan.name} plan, {formatAmount(price, currency)} per month,{" "}
          {yearly
            ? `billed ${formatAmount(annual, currency)} yearly`
            : "billed monthly"}
          .
        </p>

        <div
          aria-hidden="true"
          className="mt-4 flex items-baseline gap-1"
        >
          <span className="text-[22px] font-medium text-muted-foreground">
            {currency}
          </span>
          <span className="text-[38px] font-semibold leading-none tracking-tight text-card-foreground sm:text-[42px]">
            <AnimatedPrice value={price} reduce={reduce} />
          </span>
          <span className="text-[12.5px] text-muted-foreground">/ mo</span>
        </div>

        <div
          aria-hidden="true"
          className="mt-1.5 h-4 text-[11.5px] text-muted-foreground"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={period}
              className="block"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            >
              {yearly
                ? `Billed ${formatAmount(annual, currency)} yearly`
                : "Billed monthly"}
            </motion.span>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => onSelect?.(plan, period)}
          className={cn(
            "mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            plan.recommended
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "border border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          {plan.cta ?? "Get started"}
        </button>

        <div className="my-4 h-px w-full bg-border" />

        <ul className="flex flex-col gap-2.5">
          {plan.features.map((feature, featureIndex) => (
            <motion.li
              key={feature}
              initial={reduce ? false : { opacity: 0, x: -4 }}
              animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
              transition={{
                duration: reduce ? 0 : 0.4,
                ease: EASE,
                delay: reduce ? 0 : index * 0.08 + featureIndex * 0.035 + 0.1,
              }}
              className="flex items-start gap-2 text-[13px] leading-5 text-muted-foreground"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground">
                <Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span className="min-w-0">{feature}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function PricingToggle({
  className,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  plans = DEFAULT_PLANS,
  defaultPeriod = "monthly",
  yearlyDiscount = 20,
  currency = "$",
  onSelectPlan,
}: PricingToggleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod);
  const yearly = period === "yearly";

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className={cn("w-full", className)}>
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: inView ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: inView ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: 0.1 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
        >
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Bill yearly instead of monthly"
            onClick={() => setPeriod(yearly ? "monthly" : "yearly")}
            className="relative inline-grid w-[184px] grid-cols-2 items-center rounded-full border border-border bg-muted p-1 text-[12.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm"
              initial={false}
              animate={{ x: yearly ? "100%" : "0%" }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.32, ease: EASE }
              }
            />
            <span
              className={cn(
                "relative z-10 py-1.5 text-center transition-colors",
                yearly ? "text-muted-foreground" : "text-foreground"
              )}
            >
              Monthly
            </span>
            <span
              className={cn(
                "relative z-10 py-1.5 text-center transition-colors",
                yearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Yearly
            </span>
          </button>

          <AnimatePresence initial={false}>
            {yearly ? (
              <motion.span
                key="saving"
                initial={reduce ? false : { opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
                transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
                className="inline-flex items-center rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success"
              >
                Save {yearlyDiscount}%
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              index={index}
              yearly={yearly}
              show={inView}
              reduce={reduce}
              currency={currency}
              onSelect={onSelectPlan}
            />
          ))}
        </ul>
      </div>
    </MotionConfig>
  );
}

export default PricingToggle;
