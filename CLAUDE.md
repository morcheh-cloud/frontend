@AGENTS.md

# Morcheh — Frontend

## Maintaining this file (standing instruction from the user)

- This file is the project's memory. Whenever the user says something should be remembered, write it here — compactly (one line where possible), in the most relevant section.
- Also decide on your own: after any change to the project that a future session must know about (new convention, dependency, structure, decision, gotcha), update this file in the same turn. Don't log routine edits or anything already obvious from the code.
- Keep it short: edit or replace outdated lines instead of appending duplicates.
- Do not use the auto-memory directory for project facts; they go here.

Next.js 16 (App Router, `src/` dir, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · pnpm.

## Commands

```bash
pnpm dev                           # dev server
pnpm build                         # production build — run before declaring work done
pnpm lint                          # ESLint
pnpm dlx shadcn@latest add <name>  # add a shadcn component
```

## Product & app state

- Morcheh ("ant"): SSH-based server management + monitoring for small/medium orgs — servers and the services on them in one place.
- Auth is username + password only. `login()` in `src/app/login/api.ts` POSTs to `/auth/login` — endpoint is a guess until the backend exists; on success nothing happens yet (TODO: go to dashboard). `/` redirects to `/login` until there is a dashboard.
- `/login` is a 50/50 split: login box only on the start half; the other half is an empty panel the user will design later. Keep the login side minimal (user rejected extra content there).
- Brand mark: `Logo` / `LogoMark` in `src/components/logo.tsx` (three ant body segments).

## Conventions (from the user)

- It's an admin panel: **no SSR data and no Server Actions.** Every request runs client-side; pages that fetch are client components.
- Requests go through **TanStack Query**: `useQuery` for reads, `useMutation` for writes. Raw HTTP via `apiFetch` / `ApiError` in `src/lib/api.ts` (base URL `NEXT_PUBLIC_API_URL`, see `.env.example`). `QueryClientProvider` lives in `src/components/providers.tsx`, mounted in the root layout.
- Folder layout: components used by one page only → `src/app/<route>/components/`; that route's request functions → `src/app/<route>/api.ts`. Anything reused (or likely to be) → `src/components/`. Keep each page fairly self-contained (soft rule).
- Installing packages is fine wherever it's the best-practice choice.

## Stack notes

- shadcn style is `base-nova`: components are built on **Base UI** (`@base-ui/react`), not Radix. Check a component's props against Base UI before using Radix-style APIs (e.g. `asChild`).
- `cn` is exported from `@/lib/utils` (it re-exports the `cn` package). Import it from `@/lib/utils` in app code.
- `components.json` has `"rtl": true`, so shadcn emits logical classes (`ms-*`, `ps-*`, `start-*`). Keep using logical classes in our own code too. The UI itself is **English, LTR** (`lang="en"`).
- Path alias: `@/*` → `src/*`.

## Design system — `DESIGN.md` is the source of truth

**Every UI change must follow [DESIGN.md](DESIGN.md).** Read it before building or restyling any page or component. Do not introduce colors, fonts, radii or shadows that are not in it.

The tokens are already wired into [src/app/globals.css](src/app/globals.css). Use the Tailwind classes below. Never hard-code hex values in components.

### Resolved conflicts in DESIGN.md

DESIGN.md contradicts itself in places. These decisions win:

- **Primary CTA is Ink, not red.** `bg-primary` (#181717) + white text, 8px radius (`rounded-lg`), shadow-sm → shadow-md on hover. Ignore the "Agent Prompt Guide" line that says red pill.
- **Signal Red fills a surface only in the Feature Highlight Card** (and as `destructive`). Elsewhere it is a thin accent: active nav indicator, emphasis stroke. At most one red element per row.

### Token → class map

| DESIGN.md | Class | Use |
|---|---|---|
| Bone #eeebea | `bg-background` / `bg-bone` | page canvas — never white full-page backgrounds |
| Paper #ffffff | `bg-card` / `bg-paper` | cards, panels, tiles lifted off the canvas |
| Linen #f7f5f4 | `bg-muted` / `bg-linen` | nav background, subtle elevated tint |
| Ink #181717 | `text-foreground`, `bg-primary` | text, primary button. Never use `#000` / `text-black` |
| Charcoal #575555 | `text-muted-foreground` | secondary/body-muted text, footer links |
| Ash #706e6d | `text-ash` | captions, tertiary text |
| Graphite #2e2d2d | `border-graphite` | strong borders/dividers when a dark rule is needed |
| Mist #d5d3d2 | `border-border` (default) | light dividers, input borders |
| Signal Red #d04841 | `bg-signal-red` / `text-signal-red` | rare accent (see rules above) |
| Network Blue | `from-network-blue to-network-blue-deep` | only inside product-screenshot imagery, never on controls |

### Typography

- Fonts: Inter → `font-sans` (default). Space Grotesk 500 (MDIO substitute) → `font-label`, **only** for small uppercase eyebrows/tags/category labels, always with `uppercase tracking-label`.
- Type scale (size + line-height + tracking bundled): `text-caption` 12 · `text-body-sm` 14 · `text-body` 16 · `text-subheading` 20 · `text-heading` 32 · `text-heading-lg` 48 · `text-display` 64.
- Headlines (`text-heading` and up) are `font-light` (300), sometimes `font-normal`. **Never bold (600+) on headlines.** `font-medium` (500) is for UI labels, buttons, card titles.
- Body: 16px/400 in `text-foreground`; muted copy in `text-muted-foreground`.

### Shape, elevation, spacing

- Radius: buttons `rounded-lg` (8px) · cards, nav, images `rounded-2xl` (16px) · hero/showcase cards `rounded-3xl` (32px) · pills `rounded-full`. Never 0 or 4px on cards.
- Shadows: `shadow-sm` (2% black, near-invisible) for all card/nav/button elevation. `shadow-md` only for hover on nav and primary buttons. No other shadows.
- Spacing uses Tailwind's default 4px scale, which matches DESIGN.md: 16px = `4`, 24px = `6`, 32px = `8`, 48px = `12`, 64px = `16`, 84px = `21`, 168px = `42`.
- Layout: content `max-w-page` (1200px) centered · section gaps 80–96px (`py-20`–`py-24`) · card padding 24–32px (`p-6`–`p-8`) · element gaps 12–16px (`gap-3`–`gap-4`).

### Hard rules

- Light theme only. Do not add dark mode or `dark:` variants unless asked.
- Stay on the Bone canvas; no alternating dark/light section bands.
- One chromatic accent per page: Signal Red. No blue/green/purple CTAs or controls.
- Icons: `lucide-react`, outlined, ~20px in feature cards.
- No photography or illustrations. Imagery is product UI screenshots, partner logos, avatars.
- When adding a shadcn component, check its classes against these rules and adjust it in `src/components/ui/` if it drifts (e.g. wrong radius, heavy shadow, bold title).

For component recipes (nav bar, hero, feature cards, testimonial, stat block, footer), follow the **Components** section of DESIGN.md.
