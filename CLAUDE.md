@AGENTS.md

# Riadha project notes

- Next.js 16 App Router + Tailwind v4 + Drizzle ORM on Neon Postgres. Read `README.md` first.
- Schema changes: edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. Never hand-edit the DB.
- Fantasy rules are pure in `src/lib/fantasy/rules.ts` / `lineup.ts` (shared by client and server); anything touching the DB goes in `engine.ts`, which takes `db` as an argument so `scripts/seed.ts` can reuse it.
- Server actions live in `src/actions/*` and must check auth themselves (`actionUser()` / admin guard).
- Brand is strict (source: the official kit in `design/brand-kit/Riadha_Brand_Kit/`): navy #081018, electric green #B7F34A, cobalt #3867FF, off-white #F5F7F2, grays 500/400/200/100, raised navy #111C28; mark gradient #8DD63A→#B7F34A is for the logo only. Sora is the only typeface. Never use green for text on light surfaces (`.text-mark` gradient text is for navy only). Tick colours (cobalt athlete / green club / gray scout) are reserved for verification.
- The logo is supplied artwork: always render `<Logo>` / `<LogoMark>` / `<AppIcon>` from `src/components/brand/logo.tsx` (paths in `logo-art.ts`, generated from the kit SVGs). Never retype, recolour or add effects; `animated` only moves the pieces in. Minimum widths: primary/horizontal 140px, stacked 90px; below 160px use `variant="compact"` (no tagline).
- Every slanted edge (stripes, chevrons, indicators, shards) uses the brand diagonal `--brand-slant` (37.57°) and leans forward. Never mirror stripes/chevrons with `-scale-x-100`.
- Motion: add `data-reveal="up|fade|left|right|scale|blur|slant|wipe"` (and `data-stagger` on a parent) instead of writing observers; `KineticText`, `Marquee`, `Tilt`, `PageHero` and `Aurora` live in `components/motion/` and `components/ui/page-hero.tsx`; celebrations/haptics are `burst()`/`celebrate()`/`haptic()` in `src/lib/celebrate.ts`. Everything must degrade under `prefers-reduced-motion`. Don't put `data-reveal` on elements that carry their own Tailwind transform.
- In single-table Drizzle selects, `${table.column}` renders unqualified (e.g. `"id"`), so correlated subqueries must name the outer column explicitly (`"users"."id"`), or the inner table's own `id` gets used.
- An RSC element object rendered in two places shares its `useId` output (duplicate SVG gradient ids). Create a fresh element for each place.
- Tokens, type scale (`.h1`–`.h6`, `.kicker`, `.label`), buttons (`.btn` + `btn-accent|primary|cobalt|secondary|ghost|light`, `btn-sm|lg|block|icon`) and fields (`.field`) live in `src/app/globals.css`. Don't name classes after Tailwind utilities (e.g. `overline`). Animation delays use `ad-*` (Tailwind's `delay-*` is transition-only).
- Components ported from the Sportify UI kit (`design/ui-kit/`) are in `src/components/ui/` (fields, controls, nav) and `src/components/sport/` (cards, carousel). Reuse them; `/styleguide` shows every one.
- Client components can't receive functions from server components; pass data/flags instead.
- Verify with `npm run typecheck && npm run lint && npm run build`. Production-mode errors render as a generic "This page couldn't load" page with HTTP 200, so check server logs too, not just status codes.
- Full-screen overlays (menus, sheets, dialogs) must use `Portal` / `Sheet` / `useModal` from `src/components/ui/overlay.tsx`. Never render a `position: fixed` overlay in place: ancestors with `backdrop-filter`/`transform`/`filter` (e.g. the blurred TopBar) become its containing block and cap its z-index.
