@AGENTS.md

# Riadha project notes

- Next.js 16 App Router + Tailwind v4 + Drizzle ORM on Neon Postgres. Read `README.md` first.
- Schema changes: edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. Never hand-edit the DB.
- Fantasy rules are pure in `src/lib/fantasy/rules.ts` / `lineup.ts` (shared by client and server); anything touching the DB goes in `engine.ts`, which takes `db` as an argument so `scripts/seed.ts` can reuse it.
- Server actions live in `src/actions/*` and must check auth themselves (`actionUser()` / admin guard).
- Brand is strict (source: `design/brand/`): navy #081018, electric green #B7F34A, cobalt #3867FF, off-white #F5F7F2, grays 500/400/200/100. Sora for UI; Montserrat only inside the logo lockup. Never use green for text on light surfaces. Tick colours (cobalt athlete / green club / gray scout) are reserved for verification.
- Tokens, type scale (`.h1`–`.h6`, `.kicker`, `.label`), buttons (`.btn` + `btn-accent|primary|cobalt|secondary|ghost|light`, `btn-sm|lg|block|icon`) and fields (`.field`) live in `src/app/globals.css`. Don't name classes after Tailwind utilities (e.g. `overline`). Animation delays use `ad-*` (Tailwind's `delay-*` is transition-only).
- Components ported from the Sportify UI kit (`design/ui-kit/`) are in `src/components/ui/` (fields, controls, nav) and `src/components/sport/` (cards, carousel). Reuse them; `/styleguide` shows every one.
- Client components can't receive functions from server components; pass data/flags instead.
- Verify with `npm run typecheck && npm run lint && npm run build`.
- Full-screen overlays (menus, sheets, dialogs) must use `Portal` / `Sheet` / `useModal` from `src/components/ui/overlay.tsx`. Never render a `position: fixed` overlay in place: ancestors with `backdrop-filter`/`transform`/`filter` (e.g. the blurred TopBar) become its containing block and cap its z-index.
