# Contributing to PrequelUI

Thanks for helping. PrequelUI is a small, curated set of animated blocks for shadcn/ui, so quality matters more than quantity.

## Reporting a bug

Open an issue with the block name, what you expected, what happened, and your browser. A screen recording helps a lot for animation bugs.

## Proposing a block

Open an issue first and describe the block: what data it shows, and what the motion explains. We would rather agree on the idea before you spend time on code.

## Writing a block

A block lives in `registry/prequel/<name>/<name>.tsx` and has an entry in `registry.json`.

- **Stack:** React 19, Tailwind CSS v4, shadcn/ui tokens (`bg-background`, `text-muted-foreground`, `border`…), `motion` for animation, `lucide-react` for icons. Import `cn` from `@/lib/utils`.
- **Self-contained:** one file, realistic sample data as default props, everything customisable through props.
- **Motion:** purposeful and short, eased out, no bounce. Respect `prefers-reduced-motion` (`useReducedMotion` from `motion/react`).
- **Accessible:** semantic markup, visible focus, labels for charts (`aria-label` or a text alternative), works with the keyboard.
- **Themes:** looks right in light and dark mode, using tokens only (no hard-coded greys).
- **Responsive:** no horizontal overflow from 320 px wide.

Before opening a pull request:

```bash
npm install
npm run typecheck
npm run registry:build
```

## Pull requests

- One block or one fix per pull request.
- Describe what changed and add a screenshot or short recording.
- By contributing, you agree that your work is released under the MIT license.
