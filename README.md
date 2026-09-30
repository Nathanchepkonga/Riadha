# Riadha — MVP

**Pick your XI. Post your run. Get scouted.**
Fantasy football for the Kenyan Premier League, a showcase for every Kenyan athlete, and athlete portfolio pages. This is "Wave 1" of the [product blueprint](https://claude.ai/artifact/1dcZV6U4TJbQKghhToCJob), built as a mobile-first web app (installable as a PWA).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

The database is Neon Postgres (project `riadha`, Frankfurt). Credentials live in `.env.local` (not committed).

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:seed` | Seed an empty database with demo data |
| `npm run db:seed -- --reset` | **Wipe all app data** and reseed |
| `npm run typecheck` / `npm run lint` / `npm run build` | Checks |

## Demo logins

SMS is off in dev (`OTP_DEV_MODE=true`), so the 6-digit code is shown on screen and pre-filled.

| Phone | Who |
| --- | --- |
| `0700000001` | Riadha Team: **admin** (results entry, verification queue) |
| `0700000101` | Faith Chebet: verified athlete (400m) |
| `0700000102` | Brian Wekesa: verified footballer, has inbox messages |
| `0700000105` | Dennis Kiprop: 16-year-old athlete (guardian safeguarding) |
| `0700000201` | Karura Dawn Runners: verified club |
| `0700000400`–`0700000435` | Fantasy managers with 6 gameweeks of history |

Add your own number to `ADMIN_PHONES` in `.env.local` to become an admin on sign-in.

Tip: `localhost:3000` and `127.0.0.1:3000` keep separate cookies, so you can be signed in as two people at once.

## Brand & UI

- **Brand** (strict, from the designer's Canva board in `design/brand/`): Deep Navy `#081018`, Electric Green `#B7F34A`, Cobalt Blue `#3867FF`, Off White `#F5F7F2`, Grays 500/400/200/100; Sora for the UI, Montserrat for the logo lockup. The logo system (primary, stacked, horizontal, compact, mono, favicon, app icon, social avatar) is in `src/components/brand/logo.tsx`, and the chevron and slash graphics are in `graphics.tsx`.
- **UI kit** (from the Sportify Figma kit in `design/ui-kit/`, restyled in the Riadha brand): buttons, text inputs, search, toggles, chips, tabs, segmented switch, section headers, tags, list rows, news carousel, highlight cards, league tiles, match cards, score header and stats table.
- **Style guide:** open [`/styleguide`](http://localhost:3000/styleguide) to see every brand asset and component in one place.

- **Canva** https://www.canva.com/design/DAHWeazW_oU/Wdo_HJxGbBsa0m4-RSneuQ/edit

## What's in the MVP

- **Phone OTP sign-in** (Africa's Talking SMS when `AT_USERNAME`/`AT_API_KEY` are set), onboarding as fan / athlete / club / scout.
- **Riadha Fantasy (KPL)**: KSh 100m budget, 15-man squads (2/5/5/3, max 3 per club), auto-pick, captain/vice, substitutions, transfers (1 free per week, bank up to 2, −4 per extra), private leagues with invite codes and WhatsApp links, overall rankings, a points view with auto-subs and the vice-captain fallback, fixture difficulty, and the KPL table.
- **Scoring engine** (`src/lib/fantasy/`): FPL-style points, automatic 3/2/1 bonus, idempotent weekly recalculation. Admins enter match stats; every manager is rescored instantly.
- **Showcase feed**: photo/video/stat posts; the "For you" ranking favours verified athletes and stats over likes. Likes, follows, share links.
- **Athlete portfolio** `/u/[handle]`: hero with the name in giant type behind a cut-out photo, quote, highlight and next-game cards; "I'm more than a…" gallery; count-up stats with "Verified by club" badges; an electric-green collaboration form.
- **Safeguarding**: date of birth required for athletes; under-18 profiles route contact requests to the guardian and club.
- **Verification ticks**: cobalt (athlete), green (club), grey (scout). There's a request flow and an admin review queue, and evidence images are deleted once a decision is made.
- **Fixtures & Match Centre** `/fixtures`: upcoming and results by gameweek or club, and per-match overview, player stats and fantasy points.
- **Admin console** `/admin`: verification, gameweek deadlines, match results with per-player stats, and player prices and availability.

## Project map

```
src/
  app/                 routes (App Router). (app)/ = signed-in area with tab bar
  actions/             server actions: auth, social, profile, fantasy, admin
  db/schema.ts         Drizzle schema (source of truth); migrations in /drizzle
  lib/fantasy/         rules.ts (pure), scoring.ts, lineup.ts (auto-subs), engine.ts (DB), data.ts (queries)
  lib/auth/            OTP, sessions (signed JWT cookie), SMS
  components/          brand/ (logo, graphics), ui/ (kit primitives), sport/ (kit cards), shell/, feed/, fantasy/, profile/, landing/, motion/
design/               brand/ (designer boards) and ui-kit/ (Sportify export): source material
scripts/seed.ts        demo data + season simulation
```

Design tokens (colours, fonts, motion keyframes) are in `src/app/globals.css`.

## Before going live

1. **Media storage.** Uploads go to `./storage/uploads` on local disk. Swap `src/lib/storage.ts` for Cloudflare R2 / S3 (and Mux for video) before deploying to a serverless host.
2. **SMS.** Set the Africa's Talking keys and `OTP_DEV_MODE=false`.
3. **KPL data licence.** Clubs are real, but players, fixtures and results are illustrative. Secure a data feed before launch; the admin results screen is the manual fallback.
4. **Legal.** Register with the ODPC as a data controller (Data Protection Act). Keep fantasy free-to-enter, or get gaming advice before any paid contests.
5. **KYC.** Automated ID and liveness checks (Smile ID) for ticks.

## Next (Waves 2–3 from the blueprint)

Clubs & crews (events, RSVPs, chat), live match centre (WebSockets), M-Pesa (Riadha Plus, memberships), Strava import, clubs verifying member stats, Scout Desk (search, percentile radars, shortlists, guardian-routed contact), and the chips (Derby Double, wildcard, bench boost).
