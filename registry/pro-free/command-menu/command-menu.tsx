"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  Check,
  CircleAlert,
  Command,
  CornerDownLeft,
  FileText,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  Link2,
  Rocket,
  Search,
  SearchX,
  Settings2,
  ShieldAlert,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const KBD =
  "inline-flex h-5 items-center rounded border border-border bg-muted px-1 font-mono text-[10px] leading-none text-muted-foreground";

export type CommandGroup = "Navigation" | "Actions" | "Recent";

export type CommandItem = {
  id: string;
  label: string;
  group: CommandGroup;
  hint?: string;
  shortcut?: string;
  keywords?: string[];
  icon?: LucideIcon;
  onSelect?: () => void;
};

export type CommandMenuUser = {
  name: string;
  initials: string;
};

export type CommandMenuProps = {
  className?: string;
  title?: string;
  workspace?: string;
  user?: CommandMenuUser;
  items?: CommandItem[];
  placeholder?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
};

const DEFAULT_USER: CommandMenuUser = { name: "Ama Mensah", initials: "AM" };

const DEFAULT_ITEMS: CommandItem[] = [
  {
    id: "nav-overview",
    label: "Overview",
    group: "Navigation",
    hint: "Team health and the weekly summary",
    shortcut: "G O",
    keywords: ["home", "dashboard", "health"],
    icon: LayoutDashboard,
  },
  {
    id: "nav-deployments",
    label: "Deployments",
    group: "Navigation",
    hint: "14 services · 3 in flight",
    shortcut: "G D",
    keywords: ["release", "ship", "services"],
    icon: Rocket,
  },
  {
    id: "nav-incidents",
    label: "Incidents",
    group: "Navigation",
    hint: "No open incidents right now",
    shortcut: "G I",
    keywords: ["alerts", "status", "on call"],
    icon: ShieldAlert,
  },
  {
    id: "nav-settings",
    label: "Settings",
    group: "Navigation",
    hint: "Members, billing and SSO",
    shortcut: "G S",
    keywords: ["team", "workspace", "sso"],
    icon: Settings2,
  },
  {
    id: "action-deploy-staging",
    label: "Deploy to staging",
    group: "Actions",
    hint: "Run the latest build on staging",
    shortcut: "⇧⌘D",
    keywords: ["ship", "release", "build"],
    icon: Rocket,
  },
  {
    id: "action-invite",
    label: "Invite teammate",
    group: "Actions",
    hint: "Send an invite by email",
    shortcut: "⇧⌘I",
    keywords: ["member", "team", "add"],
    icon: UserPlus,
  },
  {
    id: "action-api-key",
    label: "Create API key",
    group: "Actions",
    hint: "Scoped, revocable, expires in 90 days",
    keywords: ["token", "secret", "access"],
    icon: KeyRound,
  },
  {
    id: "action-copy-view",
    label: "Copy current view",
    group: "Actions",
    hint: "Share a link to this page",
    keywords: ["link", "url", "share"],
    icon: Link2,
  },
  {
    id: "recent-deploy",
    label: "Deploy #482 · api-gateway",
    group: "Recent",
    hint: "Shipped 12 minutes ago by Lucas Ferreira",
    keywords: ["gateway", "build", "release"],
    icon: GitBranch,
  },
  {
    id: "recent-incident",
    label: "INC-204 · checkout latency",
    group: "Recent",
    hint: "Resolved 2 hours ago",
    keywords: ["incident", "latency", "checkout"],
    icon: ShieldAlert,
  },
  {
    id: "recent-doc",
    label: "Q4 planning",
    group: "Recent",
    hint: "Edited yesterday by Mei Tanaka",
    keywords: ["document", "plan", "retention"],
    icon: FileText,
  },
];

const GROUP_ORDER: CommandGroup[] = ["Navigation", "Actions", "Recent"];

function fuzzyScore(text: string, query: string): number | null {
  const haystack = text.toLowerCase();
  if (!haystack) return null;

  const direct = haystack.indexOf(query);
  if (direct === 0) return 120 - haystack.length * 0.2;
  if (direct > 0) return 90 - direct - haystack.length * 0.2;

  let queryIndex = 0;
  let score = 0;
  let previous = -2;

  for (let i = 0; i < haystack.length && queryIndex < query.length; i += 1) {
    if (haystack[i] !== query[queryIndex]) continue;
    const isBoundary = i === 0 || /[\s\-_/.]/.test(haystack[i - 1]);
    score += isBoundary ? 9 : 3;
    if (i === previous + 1) score += 6;
    previous = i;
    queryIndex += 1;
  }

  return queryIndex === query.length ? score : null;
}

function scoreItem(item: CommandItem, query: string): number | null {
  if (!query) return 1;

  const fields: Array<{ text: string; weight: number }> = [
    { text: item.label, weight: 3 },
    { text: item.hint ?? "", weight: 1.2 },
    { text: (item.keywords ?? []).join(" "), weight: 1.5 },
    { text: item.group, weight: 0.4 },
  ];

  let best: number | null = null;
  for (const field of fields) {
    const score = fuzzyScore(field.text, query);
    if (score == null) continue;
    const weighted = score * field.weight;
    best = best == null ? weighted : Math.max(best, weighted);
  }
  return best;
}

function CommandSkeleton({ reduce }: { reduce: boolean }) {
  return (
    <div role="status" aria-live="polite" className="space-y-0.5 p-1">
      <span className="sr-only">Loading commands…</span>
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="flex min-h-10 items-center gap-2.5 rounded-md px-2.5 py-2"
        >
          <span
            className={cn(
              "h-4 w-4 shrink-0 rounded bg-muted",
              !reduce && "animate-pulse"
            )}
          />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span
              className={cn(
                "block h-2.5 rounded bg-muted",
                row % 2 ? "w-1/3" : "w-2/5",
                !reduce && "animate-pulse"
              )}
            />
            <span
              className={cn(
                "block h-2 rounded bg-muted",
                row % 2 ? "w-1/2" : "w-3/5",
                !reduce && "animate-pulse"
              )}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function CommandEmpty({
  query,
  onClear,
  onRetry,
}: {
  query: string;
  onClear: () => void;
  onRetry?: () => void;
}) {
  const trimmed = query.trim();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-muted/40 text-muted-foreground">
        <SearchX className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-2.5 text-[13px] font-medium">
        {trimmed ? `No commands match “${trimmed}”` : "No commands yet"}
      </p>
      <p className="mt-1 max-w-xs text-[12px] leading-5 text-muted-foreground">
        {trimmed
          ? "Try a page name, a teammate, or an action like “deploy”."
          : "Pages and actions show up here once the workspace has a few."}
      </p>
      {trimmed ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 h-7 rounded-md border border-border bg-background px-2.5 text-[11.5px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear search
        </button>
      ) : onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-7 rounded-md border border-border bg-background px-2.5 text-[11.5px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Check again
        </button>
      ) : null}
    </div>
  );
}

function CommandError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 px-3 py-5 sm:flex-row sm:items-center"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
        <CircleAlert className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Commands are unavailable</p>
        <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
          {message}
        </p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="h-8 shrink-0 rounded-md border border-border bg-background px-3 text-[12px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function CommandMenu({
  className,
  title = "Command menu",
  workspace = "Northwind Labs",
  user = DEFAULT_USER,
  items = DEFAULT_ITEMS,
  placeholder = "Search pages, actions and recent work…",
  loading = false,
  error,
  onRetry,
}: CommandMenuProps) {
  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const inView = useInView(rootRef, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `${uid}-title`;
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;

  const firstActiveScroll = useRef(true);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modifier, setModifier] = useState("⌘");

  useEffect(() => {
    const platform =
      typeof navigator === "undefined" ? "" : navigator.platform ?? "";
    setModifier(/Mac|iPhone|iPad|iPod/i.test(platform) ? "⌘" : "Ctrl");
  }, []);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3400);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (firstActiveScroll.current) {
      firstActiveScroll.current = false;
      return;
    }
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, query]);

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matched = items
      .map((item) => ({ item, score: scoreItem(item, normalized) }))
      .filter(
        (entry): entry is { item: CommandItem; score: number } =>
          entry.score != null
      );

    return GROUP_ORDER.map((group) => ({
      group,
      items: matched
        .filter((entry) => entry.item.group === group)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.item),
    })).filter((group) => group.items.length > 0);
  }, [items, query]);

  const flat = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups]
  );

  const flatIndexById = useMemo(() => {
    const map = new Map<string, number>();
    flat.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [flat]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((index) =>
      flat.length === 0 ? 0 : Math.min(index, flat.length - 1)
    );
  }, [flat.length]);

  const optionId = (id: string) =>
    `${uid}-option-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const clearQuery = () => {
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const runItem = (item: CommandItem) => {
    item.onSelect?.();
    setFeedback(
      item.group === "Actions" ? `Ran “${item.label}”` : `Opened “${item.label}”`
    );
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        flat.length === 0 ? 0 : (index + 1) % flat.length
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flat[activeIndex];
      if (!loading && !error && item) runItem(item);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        clearQuery();
      } else {
        inputRef.current?.blur();
      }
    }
  };

  const hasResults = !loading && !error && flat.length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={rootRef}
        aria-busy={loading}
        aria-labelledby={titleId}
        initial={{
          opacity: reduce ? 1 : 0,
          y: reduce ? 0 : 14,
        }}
        animate={{
          opacity: reduce || inView ? 1 : 0,
          y: reduce || inView ? 0 : 14,
        }}
        transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>

        <div className="flex h-10 items-center justify-between gap-3 border-b border-border px-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border bg-background"
            >
              <span className="h-1.5 w-1.5 rounded-full border border-foreground/70" />
              <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-foreground" />
            </span>
            <span
              className="truncate text-[12px] font-medium"
              title={workspace}
            >
              {workspace}
            </span>
            <span className="text-[11px] text-muted-foreground">/</span>
            <span
              className="truncate text-[12px] text-muted-foreground"
              title={title}
            >
              {title}
            </span>
          </div>
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-medium text-foreground ring-1 ring-border"
            title={user.name}
            aria-label={`Signed in as ${user.name}`}
          >
            {user.initials}
          </span>
        </div>

        <div className="flex items-center gap-2.5 border-b border-border px-3 transition-shadow focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
          <Search
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor={inputId} className="sr-only">
            Search commands
          </label>
          <input
            id={inputId}
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={hasResults}
            aria-haspopup="listbox"
            aria-controls={hasResults ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              hasResults && flat[activeIndex]
                ? optionId(flat[activeIndex].id)
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full min-w-0 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <kbd className={cn(KBD, "hidden shrink-0 sm:inline-flex")}>
              {modifier}K
            </kbd>
          )}
        </div>

        <div className="min-h-[240px]">
          {loading ? (
            <CommandSkeleton reduce={reduce} />
          ) : error ? (
            <CommandError message={error} onRetry={onRetry} />
          ) : flat.length === 0 ? (
            <CommandEmpty
              query={query}
              onClear={clearQuery}
              onRetry={onRetry}
            />
          ) : (
            <div
              id={listId}
              ref={listRef}
              role="listbox"
              aria-label="Commands"
              className="max-h-[320px] overflow-y-auto p-1.5"
            >
              {filteredGroups.map((group) => (
                <div
                  key={group.group}
                  role="group"
                  aria-label={group.group}
                  className="mb-1 last:mb-0"
                >
                  <div className="flex items-center justify-between px-2 pb-1 pt-2">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {group.group}
                    </p>
                    <span className="text-[10px] tabular-nums text-muted-foreground/70">
                      {group.items.length}
                    </span>
                  </div>
                  {group.items.map((item) => {
                    const index = flatIndexById.get(item.id) ?? 0;
                    const active = index === activeIndex;
                    const Icon = item.icon ?? Command;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        id={optionId(item.id)}
                        role="option"
                        aria-selected={active}
                        tabIndex={-1}
                        data-command-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => runItem(item)}
                        title={
                          item.hint
                            ? `${item.label} — ${item.hint}`
                            : item.label
                        }
                        className={cn(
                          "relative flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          !active && "hover:bg-muted/50"
                        )}
                      >
                        {active ? (
                          <motion.span
                            aria-hidden="true"
                            layoutId={`${uid}-active`}
                            transition={{
                              duration: reduce ? 0 : 0.18,
                              ease: EASE,
                            }}
                            className="absolute inset-0 rounded-md bg-muted"
                          />
                        ) : null}
                        <Icon
                          className={cn(
                            "relative z-10 h-4 w-4 shrink-0",
                            active
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                          aria-hidden="true"
                        />
                        <span className="relative z-10 min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium leading-tight">
                            {item.label}
                          </span>
                          {item.hint ? (
                            <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-muted-foreground">
                              {item.hint}
                            </span>
                          ) : null}
                        </span>
                        {item.shortcut ? (
                          <kbd
                            className={cn(
                              KBD,
                              "relative z-10 hidden shrink-0 sm:inline-flex"
                            )}
                          >
                            {item.shortcut}
                          </kbd>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          <div aria-live="polite" className="flex min-w-0 items-center gap-1.5">
            <AnimatePresence mode="wait" initial={false}>
              {feedback ? (
                <motion.span
                  key="feedback"
                  initial={{ opacity: 0, y: reduce ? 0 : 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -3 }}
                  transition={{ duration: reduce ? 0 : 0.15, ease: EASE }}
                  className="flex min-w-0 items-center gap-1.5"
                >
                  <Check
                    className="h-3 w-3 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <span className="truncate text-foreground">{feedback}</span>
                </motion.span>
              ) : (
                <motion.span
                  key="count"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.15 }}
                  className="tabular-nums"
                >
                  {flat.length} {flat.length === 1 ? "command" : "commands"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className={KBD}>↑</kbd>
              <kbd className={KBD}>↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
              run
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className={KBD}>esc</kbd>
              clear
            </span>
          </div>
        </div>
      </motion.section>
    </MotionConfig>
  );
}

export default CommandMenu;
