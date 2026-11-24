"use client";

import {
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowDownUp,
  ArrowUpRight,
  CalendarDays,
  Image as ImageIcon,
  Info,
  LayoutTemplate,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Rocket,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DAY = 86_400_000;
const PERIOD_END = Date.UTC(2026, 10, 12);

const GOOD = "var(--success)";
const NEEDS = "oklch(0.8 0.15 70)";
const POOR = "oklch(0.66 0.2 35)";
const AMBER = "oklch(0.8 0.15 70)";
const EMBER = "oklch(0.66 0.2 35)";

const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const TABLE_GRID =
  "grid grid-cols-[minmax(9rem,1.5fr)_repeat(3,minmax(5.5rem,1fr))_8.75rem] items-center gap-3";

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type VitalKey = "lcp" | "inp" | "cls" | "ttfb";
export type RouteVitalKey = "lcp" | "inp" | "cls";
export type VitalBand = "good" | "needs" | "poor";
export type VitalsDevice = "mobile" | "desktop";
export type VitalsSort = "traffic" | "slowest";

export type VitalDistribution = {
  /** Percentage of page loads in each band. */
  good: number;
  needs: number;
  poor: number;
  /** p75 in display units: seconds for LCP, ms for INP, unitless for CLS. */
  p75: number;
};

export type RouteSeries = Record<RouteVitalKey, number[]>;

export type VitalsAttributionItem = {
  label: string;
  element: string;
  detail: string;
  value: string;
  fix: string;
  saving: string;
};

export type VitalsAttribution = {
  lcp: VitalsAttributionItem;
  inp: VitalsAttributionItem;
  cls: VitalsAttributionItem;
};

export type RouteVitals = {
  id: string;
  path: string;
  label: string;
  visits: number;
  lcp: VitalDistribution;
  inp: VitalDistribution;
  cls: VitalDistribution;
  series: RouteSeries;
  attribution: VitalsAttribution;
};

export type SummaryMetric = {
  id: VitalKey;
  p75: number;
  /** Change vs the previous period, in display units. Negative is better. */
  delta: number;
  /** [good, needs improvement, poor] share of page loads. */
  shares: [number, number, number];
};

export type DeployMarker = {
  id: string;
  /** Index in the 28-day window. */
  day: number;
  version: string;
  label: string;
  metric: RouteVitalKey;
  impact: string;
};

export type VitalsDataset = {
  routes: RouteVitals[];
  summary: SummaryMetric[];
  deploys: DeployMarker[];
};

export type WebVitalsProps = {
  className?: string;
  site?: string;
  period?: number;
  dataSource?: string;
  mobile?: VitalsDataset;
  desktop?: VitalsDataset;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectRoute?: (route: RouteVitals, device: VitalsDevice) => void;
};

/* ------------------------------------------------------------------ */
/* metric metadata                                                     */
/* ------------------------------------------------------------------ */

type MetricMeta = {
  label: string;
  name: string;
  /** Good limit and poor limit, in display units. */
  thresholds: [number, number];
};

const METRIC_META: Record<VitalKey, MetricMeta> = {
  lcp: { label: "LCP", name: "Largest Contentful Paint", thresholds: [2.5, 4] },
  inp: { label: "INP", name: "Interaction to Next Paint", thresholds: [200, 500] },
  cls: { label: "CLS", name: "Cumulative Layout Shift", thresholds: [0.1, 0.25] },
  ttfb: { label: "TTFB", name: "Time to First Byte", thresholds: [800, 1800] },
};

const BAND_COLOR: Record<VitalBand, string> = {
  good: GOOD,
  needs: NEEDS,
  poor: POOR,
};

const BAND_LABEL: Record<VitalBand, string> = {
  good: "Good",
  needs: "Needs improvement",
  poor: "Poor",
};

const BAND_INK: Record<VitalBand, string> = {
  good: `color-mix(in oklab, ${GOOD} 60%, var(--foreground))`,
  needs: `color-mix(in oklab, ${NEEDS} 60%, var(--foreground))`,
  poor: `color-mix(in oklab, ${POOR} 60%, var(--foreground))`,
};

function formatVital(key: VitalKey, value: number): string {
  if (key === "lcp") return `${value.toFixed(1)} s`;
  if (key === "cls") return value.toFixed(2);
  return `${Math.round(value)} ms`;
}

function formatDelta(key: VitalKey, delta: number): string {
  if (delta === 0) return "no change";
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  if (key === "lcp") return `${sign}${abs.toFixed(1)} s`;
  if (key === "cls") return `${sign}${abs.toFixed(2)}`;
  return `${sign}${Math.round(abs)} ms`;
}

function bandOf(key: VitalKey, value: number): VitalBand {
  const [goodLimit, poorLimit] = METRIC_META[key].thresholds;
  if (value <= goodLimit) return "good";
  if (value <= poorLimit) return "needs";
  return "poor";
}

function bandScore(band: VitalBand): number {
  return band === "poor" ? 2 : band === "needs" ? 1 : 0;
}

function routeStatus(route: RouteVitals): VitalBand | "low" {
  if (route.visits < 200) return "low";
  const worst = Math.max(
    bandScore(bandOf("lcp", route.lcp.p75)),
    bandScore(bandOf("inp", route.inp.p75)),
    bandScore(bandOf("cls", route.cls.p75)),
  );
  return worst === 2 ? "poor" : worst === 1 ? "needs" : "good";
}

function dayLabel(index: number, period: number): string {
  const start = PERIOD_END - (period - 1) * DAY;
  return dateFormat.format(new Date(start + index * DAY));
}

/** Deterministic 28-day series with a gentle weekly rhythm and an optional deploy step. */
function wave(
  base: number,
  amplitude: number,
  options?: {
    dropDay?: number;
    drop?: number;
    liftDay?: number;
    lift?: number;
    decimals?: number;
  },
): number[] {
  return Array.from({ length: 28 }, (_, day) => {
    const rhythm = Math.sin((day / 28) * Math.PI * 2 - 1.2) * amplitude;
    const jitter = Math.cos(day * 1.7) * amplitude * 0.45;
    const drop =
      options?.dropDay !== undefined && day >= options.dropDay
        ? -(options.drop ?? 0)
        : 0;
    const lift =
      options?.liftDay !== undefined && day < options.liftDay
        ? (options.lift ?? 0)
        : 0;
    const value = Math.max(0, base + rhythm + jitter + drop + lift);
    return Number(value.toFixed(options?.decimals ?? 1));
  });
}

/* ------------------------------------------------------------------ */
/* deterministic demo data                                             */
/* ------------------------------------------------------------------ */

const MOBILE_ROUTES: RouteVitals[] = [
  {
    id: "home",
    path: "/",
    label: "Home",
    visits: 48210,
    lcp: { good: 84, needs: 12, poor: 4, p75: 1.8 },
    inp: { good: 88, needs: 9, poor: 3, p75: 142 },
    cls: { good: 91, needs: 7, poor: 2, p75: 0.04 },
    series: {
      lcp: wave(1.9, 0.2, { dropDay: 9, drop: 0.2 }),
      inp: wave(150, 12),
      cls: wave(0.05, 0.01, { decimals: 3 }),
    },
    attribution: {
      lcp: {
        label: "LCP element",
        element: "Hero image",
        detail: "home-hero-1600.avif loads before the text block",
        value: "980 KB",
        fix: 'Preload the hero and set fetchpriority="high".',
        saving: "−0.4 s",
      },
      inp: {
        label: "Main interaction",
        element: "Shop nav menu",
        detail: "Opening the menu queries the catalog",
        value: "212 ms",
        fix: "Prefetch the three top categories while idle.",
        saving: "−90 ms",
      },
      cls: {
        label: "Largest shift",
        element: "Promo bar",
        detail: "Injected above the header after hydration",
        value: "0.06",
        fix: "Reserve the 44 px bar in the static HTML.",
        saving: "−0.05",
      },
    },
  },
  {
    id: "shop",
    path: "/shop",
    label: "Shop",
    visits: 31480,
    lcp: { good: 63, needs: 26, poor: 11, p75: 2.6 },
    inp: { good: 74, needs: 19, poor: 7, p75: 176 },
    cls: { good: 58, needs: 30, poor: 12, p75: 0.09 },
    series: {
      lcp: wave(2.7, 0.28, { dropDay: 16, drop: 0.2 }),
      inp: wave(184, 16),
      cls: wave(0.1, 0.018, { decimals: 3 }),
    },
    attribution: {
      lcp: {
        label: "LCP element",
        element: "First product image",
        detail: "Grid loads 24 originals before the fold",
        value: "1.1 MB",
        fix: "Serve 480 px AVIF thumbnails with srcset.",
        saving: "−0.7 s",
      },
      inp: {
        label: "Main interaction",
        element: "Filter chips",
        detail: "Each tap re-renders the 24-card grid",
        value: "268 ms",
        fix: "Debounce the facet fetch and keep the grid mounted.",
        saving: "−110 ms",
      },
      cls: {
        label: "Largest shift",
        element: "Filter results",
        detail: "Grid height changes after the first paint",
        value: "0.11",
        fix: "Pin a three-row min-height while loading.",
        saving: "−0.08",
      },
    },
  },
  {
    id: "product",
    path: "/product/[slug]",
    label: "Product detail",
    visits: 39720,
    lcp: { good: 78, needs: 15, poor: 7, p75: 2.1 },
    inp: { good: 81, needs: 13, poor: 6, p75: 168 },
    cls: { good: 76, needs: 17, poor: 7, p75: 0.06 },
    series: {
      lcp: wave(2.4, 0.22, { dropDay: 9, drop: 0.6 }),
      inp: wave(176, 15, { dropDay: 21, drop: 14 }),
      cls: wave(0.075, 0.014, { dropDay: 24, drop: 0.02, decimals: 3 }),
    },
    attribution: {
      lcp: {
        label: "LCP element",
        element: "Hero image",
        detail: "product-hero-1200.jpg, Shopify CDN",
        value: "1.4 MB",
        fix: "Serve AVIF at 960 px and preload the first slide.",
        saving: "−0.6 s",
      },
      inp: {
        label: "Main interaction",
        element: "Add to cart button",
        detail: "Variant selector waits for the inventory fetch",
        value: "340 ms",
        fix: "Render the button before stock resolves, use an optimistic state.",
        saving: "−130 ms",
      },
      cls: {
        label: "Largest shift",
        element: "Cookie banner",
        detail: "Injected after first paint, pushes the breadcrumb",
        value: "0.18",
        fix: "Reserve 72 px or render the banner before hydration.",
        saving: "−0.12",
      },
    },
  },
  {
    id: "cart",
    path: "/cart",
    label: "Cart",
    visits: 12940,
    lcp: { good: 88, needs: 9, poor: 3, p75: 1.6 },
    inp: { good: 66, needs: 24, poor: 10, p75: 208 },
    cls: { good: 85, needs: 10, poor: 5, p75: 0.05 },
    series: {
      lcp: wave(1.7, 0.16),
      inp: wave(214, 20, { dropDay: 16, drop: 18 }),
      cls: wave(0.06, 0.012, { decimals: 3 }),
    },
    attribution: {
      lcp: {
        label: "LCP element",
        element: "Cart thumbnails",
        detail: "Four 320 px JPEGs above the fold",
        value: "640 KB",
        fix: "Serve 120 px AVIF thumbs for the cart row.",
        saving: "−0.3 s",
      },
      inp: {
        label: "Main interaction",
        element: "Quantity stepper",
        detail: "Each change posts to the cart API",
        value: "188 ms",
        fix: "Update the line locally and sync after 400 ms.",
        saving: "−120 ms",
      },
      cls: {
        label: "Largest shift",
        element: "Shipping estimate",
        detail: "Arrives after the totals render",
        value: "0.07",
        fix: "Reserve one line for the estimate.",
        saving: "−0.05",
      },
    },
  },
  {
    id: "checkout",
    path: "/checkout",
    label: "Checkout",
    visits: 9360,
    lcp: { good: 21, needs: 38, poor: 41, p75: 4.2 },
    inp: { good: 33, needs: 29, poor: 38, p75: 536 },
    cls: { good: 40, needs: 24, poor: 36, p75: 0.28 },
    series: {
      lcp: wave(4.3, 0.4, { dropDay: 24, drop: 0.3 }),
      inp: wave(548, 44, { dropDay: 21, drop: 40 }),
      cls: wave(0.3, 0.035, { decimals: 3 }),
    },
    attribution: {
      lcp: {
        label: "LCP element",
        element: "Payment logo strip",
        detail: "Six unoptimized PNGs block the form paint",
        value: "820 KB",
        fix: "Inline the SVG marks and defer the rest.",
        saving: "−1.3 s",
      },
      inp: {
        label: "Main interaction",
        element: "Pay now button",
        detail: "Fraud checks run before the spinner appears",
        value: "620 ms",
        fix: "Acknowledge the tap, then run checks asynchronously.",
        saving: "−280 ms",
      },
      cls: {
        label: "Largest shift",
        element: "Coupon field",
        detail: "Expands after validation and moves the total",
        value: "0.31",
        fix: "Reserve the field and total rows up front.",
        saving: "−0.2",
      },
    },
  },
  {
    id: "blog",
    path: "/blog/[slug]",
    label: "Article",
    visits: 18740,
    lcp: { good: 52, needs: 31, poor: 17, p75: 2.9 },
    inp: { good: 90, needs: 8, poor: 2, p75: 154 },
    cls: { good: 60, needs: 25, poor: 15, p75: 0.11 },
    series: {
      lcp: wave(3, 0.3, { dropDay: 16, drop: 0.15 }),
      inp: wave(160, 13),
      cls: wave(0.12, 0.02, { decimals: 3 }),
    },
    attribution: {
      lcp: {
        label: "LCP element",
        element: "Cover image",
        detail: "article-cover-2000.webp ships the full size",
        value: "1.2 MB",
        fix: "Serve 720 px with srcset and lazy-load below the fold.",
        saving: "−0.8 s",
      },
      inp: {
        label: "Main interaction",
        element: "Share button",
        detail: "Loads the share SDK on the first tap",
        value: "164 ms",
        fix: "Use the native share sheet instead.",
        saving: "−80 ms",
      },
      cls: {
        label: "Largest shift",
        element: "Embedded video",
        detail: "The iframe has no ratio until metadata loads",
        value: "0.13",
        fix: "Set a 16:9 box before mounting the iframe.",
        saving: "−0.1",
      },
    },
  },
  {
    id: "account",
    path: "/account",
    label: "Account",
    visits: 146,
    lcp: { good: 48, needs: 30, poor: 22, p75: 3.1 },
    inp: { good: 57, needs: 27, poor: 16, p75: 232 },
    cls: { good: 44, needs: 32, poor: 24, p75: 0.14 },
    series: {
      lcp: wave(3.2, 0.45, { dropDay: 21, drop: 0.15 }),
      inp: wave(238, 30),
      cls: wave(0.15, 0.03, { decimals: 3 }),
    },
    attribution: {
      lcp: {
        label: "LCP element",
        element: "Profile avatar",
        detail: "Only 146 visits this period, treat with care",
        value: "220 KB",
        fix: "Cache the avatar at 96 px.",
        saving: "−0.2 s",
      },
      inp: {
        label: "Main interaction",
        element: "Orders tab",
        detail: "Fetches the orders list on every focus",
        value: "312 ms",
        fix: "Cache the orders response for 60 seconds.",
        saving: "−140 ms",
      },
      cls: {
        label: "Largest shift",
        element: "Address form",
        detail: "Fields mount after the tab switch",
        value: "0.22",
        fix: "Keep a fixed form shell while loading.",
        saving: "−0.1",
      },
    },
  },
];
const DESKTOP_NUMBERS: Record<
  string,
  Pick<RouteVitals, "lcp" | "inp" | "cls">
> = {
  home: {
    lcp: { good: 90, needs: 8, poor: 2, p75: 1.2 },
    inp: { good: 93, needs: 5, poor: 2, p75: 78 },
    cls: { good: 95, needs: 4, poor: 1, p75: 0.02 },
  },
  shop: {
    lcp: { good: 76, needs: 18, poor: 6, p75: 1.6 },
    inp: { good: 86, needs: 11, poor: 3, p75: 112 },
    cls: { good: 82, needs: 13, poor: 5, p75: 0.05 },
  },
  product: {
    lcp: { good: 89, needs: 8, poor: 3, p75: 1.4 },
    inp: { good: 92, needs: 6, poor: 2, p75: 96 },
    cls: { good: 94, needs: 4, poor: 2, p75: 0.03 },
  },
  cart: {
    lcp: { good: 93, needs: 5, poor: 2, p75: 1.1 },
    inp: { good: 77, needs: 16, poor: 7, p75: 138 },
    cls: { good: 95, needs: 4, poor: 1, p75: 0.02 },
  },
  checkout: {
    lcp: { good: 41, needs: 36, poor: 23, p75: 3.2 },
    inp: { good: 48, needs: 31, poor: 21, p75: 312 },
    cls: { good: 52, needs: 26, poor: 22, p75: 0.19 },
  },
  blog: {
    lcp: { good: 72, needs: 20, poor: 8, p75: 1.9 },
    inp: { good: 91, needs: 7, poor: 2, p75: 88 },
    cls: { good: 78, needs: 15, poor: 7, p75: 0.06 },
  },
  account: {
    lcp: { good: 61, needs: 26, poor: 13, p75: 2.2 },
    inp: { good: 80, needs: 14, poor: 6, p75: 142 },
    cls: { good: 70, needs: 20, poor: 10, p75: 0.08 },
  },
};

const DESKTOP_ROUTES: RouteVitals[] = MOBILE_ROUTES.map((route) => {
  const numbers = DESKTOP_NUMBERS[route.id];
  if (!numbers) return route;
  return {
    ...route,
    ...numbers,
    series: {
      lcp: wave(numbers.lcp.p75 + 0.15, 0.16, { dropDay: 9, drop: 0.25 }),
      inp: wave(numbers.inp.p75 + 8, 9),
      cls: wave(numbers.cls.p75 + 0.01, 0.008, { decimals: 3 }),
    },
  };
});

const MOBILE_SUMMARY: SummaryMetric[] = [
  { id: "lcp", p75: 2.1, delta: -0.3, shares: [78, 15, 7] },
  { id: "inp", p75: 168, delta: 12, shares: [81, 13, 6] },
  { id: "cls", p75: 0.06, delta: -0.01, shares: [76, 17, 7] },
  { id: "ttfb", p75: 620, delta: -40, shares: [86, 10, 4] },
];

const DESKTOP_SUMMARY: SummaryMetric[] = [
  { id: "lcp", p75: 1.4, delta: -0.1, shares: [89, 8, 3] },
  { id: "inp", p75: 96, delta: -8, shares: [92, 6, 2] },
  { id: "cls", p75: 0.03, delta: 0, shares: [94, 4, 2] },
  { id: "ttfb", p75: 310, delta: -18, shares: [95, 4, 1] },
];

const MOBILE_DEPLOYS: DeployMarker[] = [
  {
    id: "v4.12",
    day: 9,
    version: "v4.12",
    label: "lazy hero",
    metric: "lcp",
    impact: "−0.6 s LCP",
  },
  {
    id: "v4.13",
    day: 16,
    version: "v4.13",
    label: "preconnect CDN",
    metric: "lcp",
    impact: "−0.2 s LCP",
  },
  {
    id: "v4.13-inp",
    day: 21,
    version: "v4.13",
    label: "defer chat widget",
    metric: "inp",
    impact: "−48 ms INP",
  },
  {
    id: "v4.15",
    day: 24,
    version: "v4.15",
    label: "reserve banner",
    metric: "cls",
    impact: "−0.04 CLS",
  },
];

const DESKTOP_DEPLOYS: DeployMarker[] = [
  {
    id: "v4.12",
    day: 9,
    version: "v4.12",
    label: "lazy hero",
    metric: "lcp",
    impact: "−0.2 s LCP",
  },
  {
    id: "v4.13",
    day: 16,
    version: "v4.13",
    label: "preconnect CDN",
    metric: "lcp",
    impact: "−0.1 s LCP",
  },
  {
    id: "v4.13-inp",
    day: 21,
    version: "v4.13",
    label: "defer chat widget",
    metric: "inp",
    impact: "−18 ms INP",
  },
  {
    id: "v4.15",
    day: 24,
    version: "v4.15",
    label: "reserve banner",
    metric: "cls",
    impact: "−0.02 CLS",
  },
];

const MOBILE_DATASET: VitalsDataset = {
  routes: MOBILE_ROUTES,
  summary: MOBILE_SUMMARY,
  deploys: MOBILE_DEPLOYS,
};

const DESKTOP_DATASET: VitalsDataset = {
  routes: DESKTOP_ROUTES,
  summary: DESKTOP_SUMMARY,
  deploys: DESKTOP_DEPLOYS,
};

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */

const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

function Grain({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 mix-blend-multiply dark:mix-blend-screen",
        className,
      )}
      style={{
        backgroundImage: GRAIN_URL,
        backgroundSize: "160px 160px",
        opacity: 0.055,
      }}
    />
  );
}

function LensMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-4", className)}
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle
        cx="12"
        cy="12"
        r="3.4"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.55"
      />
      <circle cx="17.2" cy="6.8" r="1.6" fill="currentColor" />
    </svg>
  );
}

function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

function StatusBadge({ status }: { status: VitalBand | "low" }) {
  const color = status === "low" ? AMBER : BAND_COLOR[status];
  const label = status === "low" ? "Low data" : BAND_LABEL[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{
        color: `color-mix(in oklab, ${color} 60%, var(--foreground))`,
        backgroundColor: `color-mix(in oklab, ${color} 13%, transparent)`,
      }}
    >
      <Dot color={color} />
      {label}
    </span>
  );
}

function Delta({
  value,
  metric,
  className,
}: {
  value: number;
  metric: VitalKey;
  className?: string;
}) {
  const better = value < 0;
  const flat = value === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        flat
          ? "text-muted-foreground"
          : better
            ? "text-success"
            : "text-destructive",
        className,
      )}
      title={`${formatDelta(metric, value)} vs the previous period`}
    >
      {!flat &&
        (better ? (
          <ArrowDownRight aria-hidden="true" className="size-3" />
        ) : (
          <ArrowUpRight aria-hidden="true" className="size-3" />
        ))}
      {formatDelta(metric, value)}
    </span>
  );
}

function DistBar({
  dist,
  metric,
  className,
}: {
  dist: VitalDistribution;
  metric: RouteVitalKey;
  className?: string;
}) {
  const total = dist.good + dist.needs + dist.poor || 1;
  const label = `${METRIC_META[metric].label} p75 ${formatVital(
    metric,
    dist.p75,
  )}. Good ${dist.good}%, needs improvement ${dist.needs}%, poor ${
    dist.poor
  }%.`;
  return (
    <div className={cn("min-w-0", className)} role="img" aria-label={label}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs font-medium tabular-nums">
          {formatVital(metric, dist.p75)}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {dist.good}% good
        </span>
      </div>
      <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <span
          style={{ width: `${(dist.good / total) * 100}%`, backgroundColor: GOOD }}
        />
        <span
          style={{ width: `${(dist.needs / total) * 100}%`, backgroundColor: NEEDS }}
        />
        <span
          style={{ width: `${(dist.poor / total) * 100}%`, backgroundColor: POOR }}
        />
      </div>
    </div>
  );
}

/** Rolls the summary p75 between devices instead of snapping. */
function RollValue({ value, metric }: { value: number; metric: VitalKey }) {
  const reduce = Boolean(useReducedMotion());
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);

  useEffect(() => {
    if (reduce) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.45,
      ease: EASE,
      onUpdate: (next) => {
        shown.current = next;
        setDisplay(next);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <>{formatVital(metric, display)}</>;
}

function SummaryCard({ metric }: { metric: SummaryMetric }) {
  const meta = METRIC_META[metric.id];
  const total = metric.shares[0] + metric.shares[1] + metric.shares[2] || 1;
  const shares: [string, number, string][] = [
    ["Good", metric.shares[0], GOOD],
    ["Needs", metric.shares[1], NEEDS],
    ["Poor", metric.shares[2], POOR],
  ];
  return (
    <div className="min-w-0 bg-card p-4">
      <p className="truncate text-xs font-medium" title={meta.name}>
        {meta.label}
        <span className="ml-1.5 font-normal text-muted-foreground">
          {meta.name}
        </span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
        <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
          <RollValue value={metric.p75} metric={metric.id} />
        </span>
        <Delta value={metric.delta} metric={metric.id} />
      </div>

      <div
        className="relative mt-3"
        role="img"
        aria-label={`${meta.label}: p75 ${formatVital(
          metric.id,
          metric.p75,
        )}; good ${metric.shares[0]}%, needs improvement ${
          metric.shares[1]
        }%, poor ${metric.shares[2]}%.`}
      >
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <span
            style={{
              width: `${(metric.shares[0] / total) * 100}%`,
              backgroundColor: GOOD,
            }}
          />
          <span
            style={{
              width: `${(metric.shares[1] / total) * 100}%`,
              backgroundColor: NEEDS,
            }}
          />
          <span
            style={{
              width: `${(metric.shares[2] / total) * 100}%`,
              backgroundColor: POOR,
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
        {shares.map(([label, share, color]) => (
          <span key={label} className="flex items-center gap-1">
            <Dot color={color} />
            {label}
            <span className="tabular-nums text-foreground/80">{share}%</span>
          </span>
        ))}
        <span className="tabular-nums">
          p75 {formatVital(metric.id, metric.p75)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 28-day p75 chart                                                    */
/* ------------------------------------------------------------------ */

function P75Chart({
  series,
  metric,
  deploys,
  period,
  show,
  reduce,
  narrow,
}: {
  series: number[];
  metric: RouteVitalKey;
  deploys: DeployMarker[];
  period: number;
  show: boolean;
  reduce: boolean;
  narrow: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [deployFocus, setDeployFocus] = useState<string | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const meta = METRIC_META[metric];
  const activeDeploys = deploys.filter(
    (deploy) => deploy.metric === metric && deploy.day < series.length,
  );

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setFrameWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const W = Math.max(280, Math.round(frameWidth));
  const H = 232;
  const pad = narrow
    ? { left: 38, right: 10, top: 22, bottom: 30 }
    : { left: 44, right: 16, top: 22, bottom: 30 };
  const max = Math.max(...series, meta.thresholds[1]) * 1.18;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (index: number) =>
    pad.left +
    (series.length <= 1 ? 0 : (index / (series.length - 1)) * innerW);
  const y = (value: number) => pad.top + (1 - value / max) * innerH;
  const path = series
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${x(index).toFixed(2)} ${y(value).toFixed(
          2,
        )}`,
    )
    .join(" ");
  const area = `${path} L ${x(series.length - 1).toFixed(2)} ${(
    pad.top + innerH
  ).toFixed(2)} L ${pad.left.toFixed(2)} ${(pad.top + innerH).toFixed(2)} Z`;

  const xTicks = narrow ? [0, 13, 27] : [0, 7, 14, 21, 27];
  const yTicks = [0, max / 2, max];
  const latest = series[series.length - 1] ?? 0;
  const activeIndex = hover;
  const activeValue = activeIndex === null ? latest : series[activeIndex] ?? latest;
  const activeBand = bandOf(metric, activeValue);

  function moveCursor(direction: -1 | 1) {
    if (series.length === 0) return;
    setHover((current) => {
      const base = current ?? series.length - 1;
      return Math.min(Math.max(base + direction, 0), series.length - 1);
    });
  }

  function handleKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveCursor(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveCursor(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setHover(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHover(series.length - 1);
    } else if (event.key === "Escape") {
      setHover(null);
      setDeployFocus(null);
    }
  }

  function handlePointer(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = (px - pad.left) / innerW;
    const index = Math.round(ratio * (series.length - 1));
    setHover(Math.min(Math.max(index, 0), series.length - 1));
  }

  const tooltipLeft = activeIndex === null ? 0 : (x(activeIndex) / W) * 100;
  const tooltipShift =
    activeIndex === null
      ? "0"
      : activeIndex < 4
        ? "0"
        : activeIndex > series.length - 5
          ? "-100%"
          : "-50%";

  return (
    <div className="mt-3">
      <div
        ref={chartRef}
        className="relative overflow-x-auto rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none"
        tabIndex={0}
        role="group"
        aria-label={`${meta.name} p75 for ${period} days. Use the left and right arrow keys to inspect a day.`}
        onKeyDown={handleKey}
        onFocus={(event) => {
          if (event.target !== event.currentTarget) return;
          setHover((current) => current ?? series.length - 1);
        }}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
          }
          setHover(null);
        }}
      >
        <div className="relative" style={{ minWidth: W }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full select-none"
            role="img"
            aria-label={`${meta.name} p75 daily values. Latest ${formatVital(
              metric,
              latest,
            )}. Good limit ${formatVital(
              metric,
              meta.thresholds[0],
            )}, poor limit ${formatVital(metric, meta.thresholds[1])}.`}
            onPointerMove={handlePointer}
            onPointerLeave={() => setHover(null)}
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={pad.left}
                  x2={W - pad.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--border)"
                  strokeWidth="0.7"
                  strokeDasharray={tick === 0 ? undefined : "2 4"}
                />
                <text
                  x={pad.left - 6}
                  y={y(tick) + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {formatVital(metric, tick)}
                </text>
              </g>
            ))}

            {xTicks
              .filter((index) => index < series.length)
              .map((index) => (
                <text
                  key={index}
                  x={x(index)}
                  y={H - 9}
                  textAnchor={
                    index === 0
                      ? "start"
                      : index === series.length - 1
                        ? "end"
                        : "middle"
                  }
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {dayLabel(index, period)}
                </text>
              ))}

            {meta.thresholds.map((threshold, index) => (
              <g key={threshold}>
                <line
                  x1={pad.left}
                  x2={W - pad.right}
                  y1={y(threshold)}
                  y2={y(threshold)}
                  stroke={index === 0 ? NEEDS : POOR}
                  strokeWidth="0.9"
                  strokeDasharray="5 4"
                  opacity="0.6"
                />
                <text
                  x={W - pad.right}
                  y={y(threshold) - 4}
                  textAnchor="end"
                  fontSize="10"
                  fill={index === 0 ? BAND_INK.needs : BAND_INK.poor}
                >
                  {formatVital(metric, threshold)}
                </text>
              </g>
            ))}

            <motion.path
              d={area}
              fill={`color-mix(in oklab, ${EMBER} 12%, transparent)`}
              initial={false}
              animate={{ opacity: show || reduce ? 1 : 0 }}
              transition={{
                duration: reduce ? 0 : 0.5,
                delay: reduce ? 0 : 0.35,
                ease: EASE,
              }}
            />

            {activeDeploys.map((deploy) => {
              const focused = deployFocus === deploy.id;
              return (
                <g key={deploy.id} opacity={focused ? 1 : 0.75}>
                  <line
                    x1={x(deploy.day)}
                    x2={x(deploy.day)}
                    y1={pad.top}
                    y2={pad.top + innerH}
                    stroke={AMBER}
                    strokeWidth={focused ? 1.5 : 1}
                    strokeDasharray="3 4"
                  />
                  <circle
                    cx={x(deploy.day)}
                    cy={pad.top}
                    r={focused ? 4 : 3}
                    fill={AMBER}
                  />
                  <text
                    x={x(deploy.day)}
                    y={pad.top - 7}
                    textAnchor="middle"
                    fontSize="10"
                    fill={BAND_INK.needs}
                  >
                    {deploy.version}
                  </text>
                </g>
              );
            })}

            <motion.path
              d={path}
              fill="none"
              stroke={EMBER}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: show || reduce ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.95, ease: EASE }}
            />

            {activeIndex !== null && series[activeIndex] !== undefined && (
              <g>
                <line
                  x1={x(activeIndex)}
                  x2={x(activeIndex)}
                  y1={pad.top}
                  y2={pad.top + innerH}
                  stroke="var(--foreground)"
                  strokeWidth="0.8"
                  strokeDasharray="2 3"
                  opacity="0.35"
                />
                <circle
                  cx={x(activeIndex)}
                  cy={y(series[activeIndex])}
                  r="7"
                  fill="none"
                  stroke={EMBER}
                  strokeWidth="0.8"
                  opacity="0.45"
                />
                <circle
                  cx={x(activeIndex)}
                  cy={y(series[activeIndex])}
                  r="3.5"
                  fill={EMBER}
                  stroke="var(--card)"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>

          {activeIndex !== null && series[activeIndex] !== undefined && (
            <div
              className="pointer-events-none absolute top-1 z-10 w-40 rounded-lg border border-border bg-popover/95 p-2.5 shadow-lg backdrop-blur-sm"
              style={{
                left: `${tooltipLeft}%`,
                transform: `translateX(${tooltipShift})`,
              }}
            >
              <p className="font-mono text-xs text-muted-foreground">
                {dayLabel(activeIndex, period)}
              </p>
              <div className="mt-0.5 flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {formatVital(metric, series[activeIndex])}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: BAND_INK[activeBand] }}
                >
                  {BAND_LABEL[activeBand]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                p75 · {meta.label} · {period} days
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-4 rounded-full"
            style={{ backgroundColor: EMBER }}
          />
          Daily p75
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-4 border-t border-dashed"
            style={{ borderColor: NEEDS }}
          />
          Needs improvement
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-4 border-t border-dashed"
            style={{ borderColor: POOR }}
          />
          Poor
        </span>
        <span className="ml-auto font-mono text-xs tabular-nums">
          {activeIndex === null
            ? `latest ${formatVital(metric, latest)}`
            : dayLabel(activeIndex, period)}
        </span>
      </div>

      {activeDeploys.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeDeploys.map((deploy) => (
            <button
              key={deploy.id}
              type="button"
              title={`${deploy.version} ${deploy.label} · ${deploy.impact}`}
              onMouseEnter={() => setDeployFocus(deploy.id)}
              onMouseLeave={() => setDeployFocus(null)}
              onFocus={() => setDeployFocus(deploy.id)}
              onBlur={() => setDeployFocus(null)}
              onClick={() => setHover(deploy.day)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Rocket
                aria-hidden="true"
                className="size-3"
                style={{ color: AMBER }}
              />
              <span className="font-mono text-foreground/80">
                {deploy.version}
              </span>
              {deploy.label}
              <span className="font-mono tabular-nums" style={{ color: BAND_INK.good }}>
                {deploy.impact}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* side panels                                                         */
/* ------------------------------------------------------------------ */

function AttributionPanel({ route }: { route: RouteVitals }) {
  if (route.visits < 200) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full"
            style={{
              color: AMBER,
              backgroundColor: `color-mix(in oklab, ${AMBER} 13%, transparent)`,
            }}
          >
            <AlertTriangle aria-hidden="true" className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Not enough data</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Fewer than 200 visits for{" "}
              <span className="font-mono text-foreground/80">{route.path}</span>{" "}
              in this period. The p75 needs 200 page loads to settle, so the
              attribution below is withheld.
            </p>
          </div>
        </div>
        <div className="mt-3 border-l-2 border-border/70 py-0.5 pl-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {numberFormat.format(route.visits)} page loads recorded. Pick a
            route with more traffic from the table to see its LCP element, main
            interaction and largest shift.
          </p>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <LensMark className="size-3.5" />
          Field data is grouped by route pattern.
        </div>
      </div>
    );
  }

  const items = [
    {
      key: "lcp" as const,
      Icon: ImageIcon,
      color: BAND_COLOR[bandOf("lcp", route.lcp.p75)],
      data: route.attribution.lcp,
    },
    {
      key: "inp" as const,
      Icon: MousePointerClick,
      color: BAND_COLOR[bandOf("inp", route.inp.p75)],
      data: route.attribution.inp,
    },
    {
      key: "cls" as const,
      Icon: LayoutTemplate,
      color: BAND_COLOR[bandOf("cls", route.cls.p75)],
      data: route.attribution.cls,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity aria-hidden="true" className="size-3.5" />
            Attribution
          </p>
          <h3
            className="mt-0.5 truncate font-mono text-sm font-semibold"
            title={route.path}
          >
            {route.path}
          </h3>
        </div>
        <StatusBadge status={routeStatus(route)} />
      </div>

      <ul>
        {items.map((item) => (
          <li key={item.key} className="border-t border-border px-4 py-3 first:border-t-0">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.data.label}
              </span>
              <span
                className="font-mono text-xs font-medium tabular-nums"
                style={{ color: BAND_INK[bandOf(item.key, route[item.key].p75)] }}
              >
                {item.data.value}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium">{item.data.element}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {item.data.detail}
            </p>
            <div
              className="mt-2 border-l-2 py-0.5 pl-2.5"
              style={{
                borderColor: `color-mix(in oklab, ${item.color} 45%, var(--border))`,
                backgroundColor: `color-mix(in oklab, ${item.color} 6%, transparent)`,
              }}
            >
              <p className="text-xs leading-relaxed">
                <span className="font-medium">Fix</span> — {item.data.fix}
              </p>
              <span
                className="mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-xs tabular-nums"
                style={{
                  color: `color-mix(in oklab, ${item.color} 65%, var(--foreground))`,
                  backgroundColor: `color-mix(in oklab, ${item.color} 12%, transparent)`,
                }}
              >
                <ArrowDownRight aria-hidden="true" className="size-3" />
                {item.data.saving}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-1.5 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
        Attribution is sampled from the same field data as the p75.
      </p>
    </div>
  );
}

function BudgetPanel({ route, period }: { route: RouteVitals; period: number }) {
  const rows = (["lcp", "inp", "cls"] as const).map((key) => {
    const value = route[key].p75;
    const limit = METRIC_META[key].thresholds[0];
    const band = bandOf(key, value);
    const difference = limit - value;
    return { key, value, limit, band, difference };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Budget headroom</p>
        <span className="font-mono text-xs text-muted-foreground">
          {period} days
        </span>
      </div>
      <ul className="mt-2.5 space-y-2.5">
        {rows.map((row) => {
          const ratio = Math.min(1, row.value / row.limit);
          const color = BAND_COLOR[row.band];
          return (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">{METRIC_META[row.key].label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {formatVital(row.key, row.value)}
                  <span className="text-foreground/60">
                    {" "}
                    / {formatVital(row.key, row.limit)}
                  </span>
                </span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="h-full rounded-full"
                  style={{ width: `${ratio * 100}%`, backgroundColor: color }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.difference >= 0 ? (
                  <>
                    {formatVital(row.key, row.difference)} under the good
                    budget
                  </>
                ) : (
                  <span style={{ color: BAND_INK.poor }}>
                    {formatVital(row.key, Math.abs(row.difference))} over the
                    good budget
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* states                                                              */
/* ------------------------------------------------------------------ */

function VitalsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 space-y-4 motion-safe:animate-pulse"
    >
      <span className="sr-only">Loading Core Web Vitals…</span>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="bg-card p-4">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="mt-2 h-7 w-20 rounded bg-muted" />
              <div className="mt-3 h-2 w-full rounded-full bg-muted" />
              <div className="mt-2 h-3 w-36 rounded bg-muted/70" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="h-4 w-40 rounded bg-muted" />
          </div>
          <div className="space-y-px">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="h-9 flex-1 rounded bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <div className="h-48 rounded-lg bg-muted/60" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-2 h-3 w-48 rounded bg-muted/70" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index}>
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="mt-2 h-4 w-full rounded bg-muted/70" />
                <div className="mt-1 h-3 w-3/4 rounded bg-muted/60" />
                <div className="mt-2 h-14 rounded-lg bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-border bg-card px-4 py-14 text-center">
      <span
        className="grid size-10 place-items-center rounded-full"
        style={{
          color: POOR,
          backgroundColor: `color-mix(in oklab, ${POOR} 12%, transparent)`,
        }}
      >
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold">Field data could not load</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Retry
      </button>
    </div>
  );
}

function EmptyCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-4 py-14 text-center">
      <span className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground">
        <LensMark className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold">No routes reported yet</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        The Chrome UX Report needs at least 200 page loads per route before it
        publishes a p75. Check back after the next crawl.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Check again
      </button>
    </div>
  );
}

function RouteCell({ route }: { route: RouteVitals }) {
  const status = routeStatus(route);
  const color = status === "low" ? AMBER : BAND_COLOR[status];
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <p
          className="truncate font-mono text-[13px] font-medium"
          title={route.path}
        >
          {route.path}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {route.label} · {numberFormat.format(route.visits)} visits
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main block                                                          */
/* ------------------------------------------------------------------ */

/**
 * Core Web Vitals monitor. A summary strip carries the four field metrics as
 * good / needs improvement / poor distributions with the p75 marker; the
 * route table reacts to selection and opens a 28-day p75 chart with deploy
 * markers, threshold lines and an attribution panel for the selected route.
 * The device toggle swaps a desktop dataset. Light, dark, container widths
 * from 360 px, keyboard and reduced motion are all handled.
 */
export function WebVitals({
  className,
  site = "kiteandco.com",
  period = 28,
  dataSource = "Field data (p75)",
  mobile = MOBILE_DATASET,
  desktop = DESKTOP_DATASET,
  loading = false,
  error = null,
  onRetry,
  onSelectRoute,
}: WebVitalsProps) {
  const [device, setDevice] = useState<VitalsDevice>("mobile");
  const [selectedId, setSelectedId] = useState("product");
  const [sort, setSort] = useState<VitalsSort>("traffic");
  const [metric, setMetric] = useState<RouteVitalKey>("lcp");
  const [width, setWidth] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const innerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const layoutKey = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const show = useInView(sectionRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const dataset = device === "mobile" ? mobile : desktop;
  const routes = dataset.routes;
  const narrow = width === 0 || width < 640;
  const twoCol = width >= 1040;
  const summaryCols =
    width === 0
      ? "grid-cols-2 lg:grid-cols-4"
      : width < 300
        ? "grid-cols-1"
        : width < 900
          ? "grid-cols-2"
          : "grid-cols-4";

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sortedRoutes = useMemo(() => {
    const copy = [...routes];
    if (sort === "traffic") {
      return copy.sort((a, b) => b.visits - a.visits);
    }
    const score = (status: VitalBand | "low") =>
      status === "poor" ? 2 : status === "needs" ? 1 : status === "low" ? -1 : 0;
    return copy.sort((a, b) => {
      const diff = score(routeStatus(b)) - score(routeStatus(a));
      if (diff !== 0) return diff;
      return b.lcp.p75 - a.lcp.p75;
    });
  }, [routes, sort]);

  const selectedRoute =
    routes.find((route) => route.id === selectedId) ?? sortedRoutes[0];
  const selectedLow = selectedRoute ? selectedRoute.visits < 200 : false;
  const totalVisits = routes.reduce((sum, route) => sum + route.visits, 0);

  function selectRoute(route: RouteVitals) {
    setSelectedId(route.id);
    onSelectRoute?.(route, device);
    setAnnouncement(
      `${route.path} selected. ${numberFormat.format(
        route.visits,
      )} visits, LCP ${formatVital("lcp", route.lcp.p75)}, INP ${formatVital(
        "inp",
        route.inp.p75,
      )}, CLS ${formatVital("cls", route.cls.p75)}.`,
    );
  }

  function chooseDevice(next: VitalsDevice) {
    setDevice(next);
    const nextDataset = next === "mobile" ? mobile : desktop;
    if (!nextDataset.routes.some((route) => route.id === selectedId)) {
      setSelectedId(
        nextDataset.routes.find((route) => route.id === "product")?.id ??
          nextDataset.routes[0]?.id ??
          "",
      );
    }
    const lcp = nextDataset.summary.find((item) => item.id === "lcp");
    setAnnouncement(
      `${next === "mobile" ? "Mobile" : "Desktop"} field data. LCP p75 ${
        lcp ? formatVital("lcp", lcp.p75) : "unavailable"
      }.`,
    );
  }

  const metricTabs: RouteVitalKey[] = ["lcp", "inp", "cls"];

  function handleMetricKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (selectedLow) return;
    const last = metricTabs.length - 1;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    } else {
      return;
    }
    event.preventDefault();
    setMetric(metricTabs[next]);
    tabRefs.current[next]?.focus();
  }

  function handleRowKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (sortedRoutes.length === 0) return;
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = Math.min(index + 1, sortedRoutes.length - 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = Math.max(index - 1, 0);
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = sortedRoutes.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const target = sortedRoutes[next];
    setSelectedId(target.id);
    onSelectRoute?.(target, device);
    setAnnouncement(`${target.path} selected.`);
    rowRefs.current.get(target.id)?.focus();
  }

  return (
    <section
      ref={sectionRef}
      className={cn("bg-background text-foreground", className)}
    >
      <div
        ref={innerRef}
        className="mx-auto w-full max-w-[1400px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Activity aria-hidden="true" className="size-3.5" />
              Performance
              <span aria-hidden="true">/</span>
              Core Web Vitals
            </p>
            <h2 className="mt-1 flex flex-wrap items-baseline gap-x-2 text-lg font-semibold tracking-tight">
              Core Web Vitals
              <span
                className="min-w-0 max-w-full truncate text-sm font-normal text-muted-foreground"
                title={site}
              >
                {site}
              </span>
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {numberFormat.format(totalVisits)} page loads
              </span>
              <span aria-hidden="true" className="h-3 w-px bg-border" />
              <span>Updated Nov 12, 09:40</span>
              <span aria-hidden="true" className="h-3 w-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-success"
                />
                {period}-day rolling window
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Device"
              className="flex items-center rounded-lg border border-border bg-background p-0.5"
            >
              {(["mobile", "desktop"] as const).map((option) => {
                const active = device === option;
                const Icon = option === "mobile" ? Smartphone : Monitor;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseDevice(option)}
                    className={cn(
                      "relative inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`${layoutKey}-device-pill`}
                        className="absolute inset-0 rounded-md bg-muted"
                        transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      <Icon aria-hidden="true" className="size-3.5" />
                      {option === "mobile" ? "Mobile" : "Desktop"}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              Last {period} days
            </span>

            <span
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium"
              style={{
                borderColor: `color-mix(in oklab, ${EMBER} 28%, var(--border))`,
                backgroundColor: `color-mix(in oklab, ${EMBER} 7%, transparent)`,
                color: `color-mix(in oklab, ${EMBER} 55%, var(--foreground))`,
              }}
            >
              <Dot color={EMBER} />
              {dataSource}
            </span>
          </div>
        </header>

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {error ? (
          <ErrorCard message={error} onRetry={onRetry} />
        ) : loading ? (
          <VitalsSkeleton />
        ) : routes.length === 0 ? (
          <EmptyCard onRetry={onRetry} />
        ) : (
          <>
            <div className="relative mt-5 overflow-hidden rounded-xl border border-border bg-card">
              <Grain className="z-10" />
              <div
                className={cn(
                  "relative grid gap-px bg-border",
                  summaryCols,
                )}
              >
                {dataset.summary.map((item) => (
                  <SummaryCard key={item.id} metric={item} />
                ))}
              </div>
            </div>

            <div
              className={cn(
                "mt-4 grid min-w-0 gap-4",
                twoCol
                  ? "grid-cols-[minmax(0,1fr)_330px]"
                  : "grid-cols-1",
              )}
            >
              <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                  <p className="text-xs font-medium">
                    Routes
                    <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                      {routes.length}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      p75 · field data
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSort((current) =>
                          current === "traffic" ? "slowest" : "traffic",
                        )
                      }
                      aria-label={`Sort routes, currently by ${
                        sort === "traffic" ? "traffic" : "slowest"
                      }`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <ArrowDownUp aria-hidden="true" className="size-3" />
                      {sort === "traffic" ? "Traffic" : "Slowest p75"}
                    </button>
                  </div>
                </div>

                {!narrow && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "border-b border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
                      TABLE_GRID,
                    )}
                  >
                    <span>Route</span>
                    <span>LCP</span>
                    <span>INP</span>
                    <span>CLS</span>
                    <span className="text-right">Status</span>
                  </div>
                )}

                <div className="max-h-[30rem] divide-y divide-border overflow-y-auto overscroll-contain">
                  {sortedRoutes.map((route, index) => {
                    const selected = route.id === selectedRoute?.id;
                    const status = routeStatus(route);
                    return (
                      <motion.button
                        key={route.id}
                        ref={(node) => {
                          if (node) rowRefs.current.set(route.id, node);
                          else rowRefs.current.delete(route.id);
                        }}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectRoute(route)}
                        onKeyDown={(event) => handleRowKeyDown(event, index)}
                        layout={reduce ? false : "position"}
                        initial={
                          reduce ? false : { opacity: 0, y: 5 }
                        }
                        animate={
                          show || reduce ? { opacity: 1, y: 0 } : undefined
                        }
                        transition={{
                          duration: reduce ? 0 : 0.4,
                          delay: reduce ? 0 : index * 0.035,
                          ease: EASE,
                          layout: {
                            duration: reduce ? 0 : 0.3,
                            ease: EASE,
                          },
                        }}
                        className={cn(
                          "group relative w-full text-left outline-none transition-colors",
                          "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                          selected && "bg-muted/50",
                          narrow
                            ? "block px-3 py-3"
                            : cn("px-3 py-2.5", TABLE_GRID),
                        )}
                      >
                        {selected && (
                          <motion.span
                            aria-hidden="true"
                            layoutId={`${layoutKey}-active-rail`}
                            className="absolute top-1/2 left-0 h-8 w-0.5 -translate-y-1/2 rounded-full"
                            style={{ backgroundColor: EMBER }}
                            transition={{
                              duration: reduce ? 0 : 0.25,
                              ease: EASE,
                            }}
                          />
                        )}

                        {narrow ? (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <RouteCell route={route} />
                              <StatusBadge status={status} />
                            </div>
                            <div className="mt-2.5 grid grid-cols-1 gap-2">
                              {metricTabs.map((key) => (
                                <div
                                  key={key}
                                  className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2"
                                >
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {METRIC_META[key].label}
                                  </span>
                                  <DistBar dist={route[key]} metric={key} />
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <RouteCell route={route} />
                            <DistBar dist={route.lcp} metric="lcp" />
                            <DistBar dist={route.inp} metric="inp" />
                            <DistBar dist={route.cls} metric="cls" />
                            <div className="flex justify-end">
                              <StatusBadge status={status} />
                            </div>
                          </>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {selectedRoute && (
                  <div className="border-t border-border">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Selected route
                        </p>
                        <h3
                          className="mt-0.5 flex flex-wrap items-baseline gap-x-2 font-mono text-sm font-semibold"
                          title={selectedRoute.path}
                        >
                          <span className="min-w-0 truncate">
                            {selectedRoute.path}
                          </span>
                          <span className="font-sans text-xs font-normal text-muted-foreground">
                            {selectedRoute.label}
                          </span>
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {numberFormat.format(selectedRoute.visits)} visits
                          </span>{" "}
                          · p75 over {period} days
                        </p>
                      </div>

                      <div
                        role="tablist"
                        aria-label="Chart metric"
                        className="flex items-center rounded-lg border border-border bg-background p-0.5"
                      >
                        {metricTabs.map((key, index) => {
                          const active = metric === key;
                          return (
                            <button
                              key={key}
                              ref={(node) => {
                                tabRefs.current[index] = node;
                              }}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              tabIndex={active ? 0 : -1}
                              disabled={selectedLow}
                              onClick={() => setMetric(key)}
                              onKeyDown={(event) =>
                                handleMetricKeyDown(event, index)
                              }
                              className={cn(
                                "relative inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                                active
                                  ? "text-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {active && (
                                <motion.span
                                  layoutId={`${layoutKey}-metric-pill`}
                                  className="absolute inset-0 rounded-md bg-muted"
                                  transition={{
                                    duration: reduce ? 0 : 0.2,
                                    ease: EASE,
                                  }}
                                />
                              )}
                              <span className="relative">
                                {METRIC_META[key].label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      {selectedLow ? (
                        <div className="mt-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                          <span
                            className="grid size-8 place-items-center rounded-full"
                            style={{
                              color: AMBER,
                              backgroundColor: `color-mix(in oklab, ${AMBER} 12%, transparent)`,
                            }}
                          >
                            <AlertTriangle
                              aria-hidden="true"
                              className="size-4"
                            />
                          </span>
                          <p className="mt-2 text-sm font-medium">
                            Not enough data for {selectedRoute.path}
                          </p>
                          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                            Fewer than 200 visits in the last {period} days. The
                            28-day p75 chart is hidden until the route collects
                            more field data.
                          </p>
                        </div>
                      ) : (
                        <P75Chart
                          series={selectedRoute.series[metric]}
                          metric={metric}
                          deploys={dataset.deploys}
                          period={period}
                          show={show}
                          reduce={reduce}
                          narrow={narrow}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <aside className="min-w-0 space-y-4">
                {selectedRoute ? (
                  <>
                    <AttributionPanel route={selectedRoute} />
                    {!selectedLow && (
                      <BudgetPanel route={selectedRoute} period={period} />
                    )}
                  </>
                ) : null}
              </aside>
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Info aria-hidden="true" className="size-3 shrink-0" />
              p75 of page loads from the Chrome UX Report. Thresholds follow
              web.dev/vitals. Routes under 200 visits are marked low data.
              <span className="ml-auto flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-muted px-1 font-mono">
                  Enter
                </kbd>
                select
                <kbd className="rounded border border-border bg-muted px-1 font-mono">
                  ←
                </kbd>
                <kbd className="rounded border border-border bg-muted px-1 font-mono">
                  →
                </kbd>
                inspect chart
              </span>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default WebVitals;

