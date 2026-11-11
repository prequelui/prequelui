<p align="center">
  <a href="https://prequelui.terravidhal.me"><img src="https://prequelui.terravidhal.me/opengraph-image" alt="PrequelUI" width="720"></a>
</p>

<h1 align="center">PrequelUI</h1>

<p align="center">
  Animated, open-source blocks for <a href="https://ui.shadcn.com">shadcn/ui</a>.<br>
  Charts, metrics, tables, feeds and marketing sections that move with intent. Copy them in with the shadcn CLI, then make them yours.
</p>

<p align="center">
  <a href="https://prequelui.terravidhal.me/blocks">Browse the blocks</a> ·
  <a href="https://prequelui.terravidhal.me/docs">Docs</a> ·
  <a href="https://prequelui.terravidhal.me/docs/mcp">MCP server</a> ·
  <a href="https://prequelui.terravidhal.me/changelog">Changelog</a>
</p>

## Install a block

PrequelUI is a [shadcn registry](https://ui.shadcn.com/docs/registry). In a project that already uses shadcn/ui:

```bash
npx shadcn@latest add https://prequelui.terravidhal.me/r/area-chart.json
```

Or add the namespace once in `components.json`:

```json
{
  "registries": {
    "@prequelui": "https://prequelui.terravidhal.me/r/{name}.json"
  }
}
```

and install by name:

```bash
npx shadcn@latest add @prequelui/area-chart
```

The CLI copies the source into your project and installs what it needs (`motion`, `lucide-react`, the `cn` helper). You own the code.

## Blocks

| Block | What it does | Install |
| --- | --- | --- |
| [Activity heatmap](https://prequelui.terravidhal.me/blocks/activity-heatmap) | A contribution-style heatmap of daily activity over 26 weeks, with a diagonal reveal, weekday and month labels, hover/focus tooltips, and a Less-to-More legend. | `npx shadcn@latest add @prequelui/activity-heatmap` |
| [Area chart](https://prequelui.terravidhal.me/blocks/area-chart) | Revenue over time with a self-drawing line, morphing ranges, and a pointer crosshair. | `npx shadcn@latest add @prequelui/area-chart` |
| [Bar chart](https://prequelui.terravidhal.me/blocks/bar-chart) | A grouped monthly bar chart (this year vs last year) with toggleable legend series, a hovered-month tooltip, and a lens glint on the active bar. | `npx shadcn@latest add @prequelui/bar-chart` |
| [Conversion funnel](https://prequelui.terravidhal.me/blocks/conversion-funnel) | Visitors to paid with narrowing bars that fill in cascade, step-to-step drop-off percentages, and a slow flow shimmer on hover. | `npx shadcn@latest add @prequelui/conversion-funnel` |
| [Data table](https://prequelui.terravidhal.me/blocks/data-table) | A sortable transactions table with animated row reordering, live search, and compact pagination. | `npx shadcn@latest add @prequelui/data-table` |
| [Donut chart](https://prequelui.terravidhal.me/blocks/donut-chart) | Revenue by plan donut whose segments draw around the ring, with a count-up centre and a lens glint at the start angle. | `npx shadcn@latest add @prequelui/donut-chart` |
| [Feature bento](https://prequelui.terravidhal.me/blocks/feature-bento) | A five-tile bento grid of product features, each with a small live illustration: a self-drawing sparkline, a ticking counter, a toggling switch, a progress ring, and a typing command line. | `npx shadcn@latest add @prequelui/feature-bento` |
| [Goal progress](https://prequelui.terravidhal.me/blocks/goal-progress) | Quarter goals with linear progress bars that fill in sequence, milestone ticks, and a count-up percentage. | `npx shadcn@latest add @prequelui/goal-progress` |
| [KPI counter](https://prequelui.terravidhal.me/blocks/kpi-counter) | A row of KPI cards whose numbers spring into view, with delta badges and self-drawing sparklines. | `npx shadcn@latest add @prequelui/kpi-counter` |
| [Live feed](https://prequelui.terravidhal.me/blocks/live-feed) | A live activity feed where events slide in at the top, with relative timestamps, a pulsing live indicator, and pause on hover. | `npx shadcn@latest add @prequelui/live-feed` |
| [Pricing toggle](https://prequelui.terravidhal.me/blocks/pricing-toggle) | Three pricing plans with a monthly/yearly switch: prices morph digit by digit, the yearly saving badge slides in, and the recommended plan carries a slow border light. | `npx shadcn@latest add @prequelui/pricing-toggle` |
| [Radial gauge](https://prequelui.terravidhal.me/blocks/radial-gauge) | A 240° radial gauge with a self-drawing arc, a sweeping needle whose tip is a lens glint dot, tick marks around the dial, a count-up score, and a label with a delta beneath. | `npx shadcn@latest add @prequelui/radial-gauge` |
| [Stat ticker](https://prequelui.terravidhal.me/blocks/stat-ticker) | A horizontally scrolling ticker of live stats (MRR, signups, conversion, NPS) that loops seamlessly, fades at both edges, pauses on hover/focus, and flips each value with a vertical slide as it refreshes. | `npx shadcn@latest add @prequelui/stat-ticker` |
| [Stats Section](https://prequelui.terravidhal.me/blocks/stats-section) | A quiet marketing stats band with four large numbers that count up when scrolled into view. | `npx shadcn@latest add @prequelui/stats-section` |
| [Testimonial Marquee](https://prequelui.terravidhal.me/blocks/testimonial-marquee) | Two rows of testimonial cards drift in opposite directions with soft edge fades, pausing on hover or focus. | `npx shadcn@latest add @prequelui/testimonial-marquee` |
| [Uptime status](https://prequelui.terravidhal.me/blocks/uptime-status) | A status page with three services, each shown as 90 daily bars that rise in with a wave, hover/focus tooltips with date and status, an overall uptime count-up, and a legend. | `npx shadcn@latest add @prequelui/uptime-status` |

## Use it from your AI editor

PrequelUI ships an MCP server, so Claude Code, Cursor, VS Code or Windsurf can search the blocks and install them for you:

```bash
claude mcp add --transport http prequelui https://prequelui.terravidhal.me/mcp
```

Setup for the other editors: [prequelui.terravidhal.me/docs/mcp](https://prequelui.terravidhal.me/docs/mcp).

## What this repository contains

- `registry/prequel/<name>/`: the source of each block, exactly what the CLI copies.
- `registry.json`: the registry index (names, descriptions, dependencies).
- `lib/utils.ts`: the `cn` helper the blocks import.

The website itself (previews, docs, dashboards) lives in a separate repository.

Check everything locally:

```bash
npm install
npm run typecheck       # every block compiles
npm run registry:build  # builds public/r/*.json with the shadcn CLI
```

## Principles

- **Motion with a reason.** Every animation explains a change in the data. Nothing loops just to look busy.
- **Respectful by default.** Every block honours `prefers-reduced-motion`, works with the keyboard and in light and dark themes.
- **Plain shadcn code.** Tailwind classes, shadcn tokens, `motion` for animation. No wrapper library to learn.

## Contributing

Ideas, bug reports and new blocks are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

[MIT](LICENSE) © Vidhal ([terravidhal](https://github.com/terravidhal)). Free for personal and commercial projects.
