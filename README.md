# Riadha — MVP

**Pick your XI. Post your run. Get scouted.**
Fantasy football for the Kenyan Premier League, a showcase and portfolio for every Kenyan athlete, a TikTok-style Watch feed, a Scout Portal, Communities with chat and events, and a Marketplace for sports businesses. Built from the [product blueprint](https://claude.ai/artifact/1dcZV6U4TJbQKghhToCJob) as a mobile-first web app (installable as a PWA).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

The database is Neon Postgres (project `riadha`, Frankfurt). Credentials live in `.env.local` (not committed).

`next dev` needs a couple of GB of free memory. If it exits with "Fatal process out of memory", close some apps or run the production server instead: `npm run build && npm run start -- -p 3001`.

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:seed` | Seed an empty database with demo data (includes the modules below) |
| `npm run db:seed:modules` | Add demo communities, businesses, ads, shortlists and comments to an existing database (skips if already there) |
| `npm run db:seed:running` | Add Riadha Run demo data: challenges, a few weeks of generated runs, a group run and verified times (skips if challenges exist) |
| `npm run db:seed -- --reset` | **Wipe all app data** and reseed |
| `npm run video:selftest` | Checks FFmpeg and the video worker end to end with a generated clip (cleans up after itself) |
| `npm run worker:video` | Standalone video worker (only needed when the web server runs with `VIDEO_WORKER=off`) |
| `npm run typecheck` / `npm run lint` / `npm run build` | Checks |

## Demo logins

SMS is off in dev (`OTP_DEV_MODE=true`), so the 6-digit code is shown on screen and pre-filled.

| Phone | Who |
| --- | --- |
| `0700000001` | Riadha Team: **admin** (results entry, verification queue) |
| `0700000101` | Faith Chebet: verified athlete (400m) |
| `0700000102` | Brian Wekesa: verified footballer, has inbox messages |
| `0700000105` | Dennis Kiprop: 16-year-old athlete (guardian safeguarding) |
| `0700000201` | Karura Dawn Runners: verified club (owns Nairobi Morning Run) |
| `0700000302` | Lena Fischer: scout (Scout Portal, shortlist) |
| `0700000400`–`0700000435` | Fantasy managers with 6 gameweeks of history |

Add your own number to `ADMIN_PHONES` in `.env.local` to become an admin on sign-in.

Tip: `localhost:3000` and `127.0.0.1:3000` keep separate cookies, so you can be signed in as two people at once.

## Brand & UI

- **Brand** (strict, from the official kit in `design/brand-kit/Riadha_Brand_Kit/`): Deep Navy `#081018`, Electric Green `#B7F34A`, Cobalt Blue `#3867FF`, Off White `#F5F7F2`, Grays 500/400/200/100, mark gradient `#8DD63A → #B7F34A` (logo only). Sora for everything. The logo is the kit's vector outlines (`src/components/brand/logo-art.ts`, generated from `Logo/SVG`) rendered by `logo.tsx` in every lockup and colourway; never retype it. Favicons, app icons and the manifest icons are the kit files. Chevrons, speed stripes, the stripe tile and the aurora light are in `graphics.tsx`; every slanted edge uses the brand diagonal (37.57°, `--brand-slant`).
- **Motion** (all switched off under reduced motion): launch splash (once per session), page transitions (React `<ViewTransition>`), scroll reveals (`data-reveal` + `data-stagger`, one observer in `components/motion/reveal-observer.tsx`), kinetic headlines, marquee tapes, tilt cards, scroll-linked parallax and progress, a floating dock with a sliding indicator, an auto-hiding app bar, and brand-coloured "speed shard" bursts with haptics on likes, follows, joins, RSVPs and signings (`src/lib/celebrate.ts`).
- **UI kit** (from the Sportify Figma kit in `design/ui-kit/`, restyled in the Riadha brand): buttons, text inputs, search, toggles, chips, tabs, segmented switch, section headers, tags, list rows, news carousel, highlight cards, league tiles, match cards, score header and stats table.
- **Style guide:** open [`/styleguide`](http://localhost:3000/styleguide) to see every brand asset and component in one place.

- **Canva** https://www.canva.com/design/DAHWeazW_oU/Wdo_HJxGbBsa0m4-RSneuQ/edit

## What's in the MVP

- **Phone OTP sign-in** (Africa's Talking SMS when `AT_USERNAME`/`AT_API_KEY` are set), onboarding as fan / athlete / club / scout.
- **Riadha Fantasy (KPL)**: KSh 100m budget, 15-man squads (2/5/5/3, max 3 per club), auto-pick, captain/vice, substitutions, transfers (1 free per week, bank up to 2, −4 per extra), leagues (see below), overall rankings, a points view with auto-subs and the vice-captain fallback, fixture difficulty, and the KPL table.
- **Fantasy leagues & chat** `/fantasy/leagues`: everyone is in **Riadha Overall** (the one public league, code `RIADHA`, no chat). **Private leagues** (user-created, invite code + WhatsApp link) and **club leagues** ("Gor Mahia Fans", one per KPL club, created by `ensureClubLeagues`; the supporter's club is suggested first) have a simple WhatsApp-style chat: a chat list with last-message preview, time and unread count, an unread badge on the Fantasy tab, mute (muted chats leave the badge), date separators, tap-to-delete ("This message was deleted"; private-league owners and admins can delete any message) and 4-second polling while open. Managers appear **by team name only**, in chat and in league tables.
- **Chat safety filter** (`src/lib/chat/filter.ts`, shared by the phone and the server; the server check is the one that counts): blocks swearing, slurs and insults aimed at someone (English, Swahili, Sheng, NCIC hate-speech terms, l33t/spaced/stretched spellings), phone numbers (Kenyan and international, digits or spelled out), emails, card numbers (13–19 digits passing Luhn), labelled ID numbers and KRA PINs, and the sender's own real name. The sender sees a friendly private reminder; **blocked text is never stored**, only its kind (`chat_flags`). Five blocked attempts in 15 minutes pause chatting for a while, and sends are rate-limited. Team names go through the same filter.
- **Scoring engine** (`src/lib/fantasy/`): FPL-style points, automatic 3/2/1 bonus, idempotent weekly recalculation. Admins enter match stats; every manager is rescored instantly.
- **Showcase feed**: photo/video/stat posts; the "For you" ranking favours verified athletes and stats over likes. Likes, follows, share links.
- **Athlete portfolio** `/u/[handle]`: hero with the name in giant type behind a cut-out photo, quote, highlight and next-game cards; "I'm more than a…" gallery; count-up stats with "Verified by club" badges; an electric-green collaboration form.
- **Safeguarding**: date of birth required for athletes; under-18 profiles route contact requests to the guardian and club.
- **Verification ticks**: cobalt (athlete), green (club), grey (scout). There's a request flow and an admin review queue, and evidence images are deleted once a decision is made.
- **Fixtures & Match Centre** `/fixtures`: upcoming and results by gameweek or club, and per-match overview, player stats and fantasy points.
- **Watch** `/watch`: full-screen vertical reels with autoplay in view, tap to pause, double-tap to like, mute, follow, comments sheet, share, infinite loading and a sponsored reel every five posts.
- **Comments** on every post (feed, Watch and the post page), with flood control and author/admin deletion.
- **Video, self-hosted (TikTok-style)**: see "Video pipeline" below.
- **Riadha Run** `/run`: Strava-style running done Riadha's way. See "Riadha Run" below.
- **Reports & moderation**: anyone can report a post (8 reasons, child safety first); 3 reports hide it until reviewed; `/admin/reports` hides, restores, dismisses or permanently deletes. Hidden posts stay visible to their author with the reason.
- **Scout Portal** `/scout` (scouts, clubs, admins): search every athlete across all 47 counties by sport, position, county, age range and skills, with filters for open to opportunities, willing to relocate, verified and has video; a shortlist pipeline (watching → contacted → trial → signed) with private notes at `/scout/shortlist`. Athletes add skills, height, strong side and availability in `/me/edit`.
- **Communities** `/communities`, `/c/[slug]`: create and join communities; members-only group chat (polling, optimistic sends, moderation); events with capacity, RSVP (going / interested), attendee lists and an "Add to calendar" `.ics`; owners promote admins, hand over ownership and remove members.
- **Marketplace & ads** `/market`: gyms, academies, shops, physios, coaches, venues and nutrition with amenities, prices, hours and WhatsApp/call/email; owners manage listings and create targeted ads (sport, county, role, age) with a live preview at `/market/ads/new`. Ads are reviewed in `/admin/ads`, served on Home, Watch and the Marketplace, and report views, clicks and CTR. Under-18s only see ads from businesses verified in `/admin/businesses`. Billing isn't built yet.
- **Admin console** `/admin`: verification, gameweek deadlines, match results with per-player stats, player prices and availability, ad review and business verification.

## Riadha Run

Runs, walks and rides as content: every activity becomes a post, scores Run League points, counts for challenges, and can become a reel.

- **Getting runs in.** The in-app recorder (`/run/record`) uses the phone's GPS while the screen is on (Wake Lock keeps it awake; browsers pause GPS for web apps when the screen locks, so long runs in a pocket need a native wrapper later). The recording is saved to the phone every few points, so a crash can be resumed, and finished runs without signal wait in an **offline outbox** that uploads by itself (`clientId` makes retries idempotent). `/run/upload` reads **GPX, TCX and Garmin FIT** files on the phone (`src/lib/running/parse.ts`, FIT via Garmin's `@garmin/fitsdk` under the FIT Protocol License) and sends only the track.
- **Analysis** (`src/lib/running/track.ts`, pure, shared by phone and server; the server's run is the one that counts): drops GPS jumps, smooths jitter, works out distance, moving time, elevation gain, km splits, a 60-point profile, and best efforts (400m, 1K, mile, 5K, 10K, half, marathon) with PRs. **Honesty checks**: a sustained minute faster than the sport allows (a car), efforts faster than world records, or lots of GPS jumps flag the activity; flagged runs stay in the log but never count for leagues, PRs or challenges.
- **Privacy** (defaults, not settings): routes are **line art only, never a map**; the first and last 200 m are cut off; private places (`/run/privacy`, up to 5 circles set from where you stand) are cut out of every route, old ones too; "Hide all my routes" shows numbers only; **under-18s never show a route** and aren't named in generated posts or group recaps. The raw GPS track lives in `activity_tracks` and is never sent to a browser.
- **Run card and Pongezi**: the feed card is the route shape with distance, pace and time; likes on runs and medals are *Pongezi*. The activity page has splits, best efforts with PR badges, elevation, and owner tools.
- **Run Reels** (`src/lib/running/reel.ts`): a 9:16 video rendered on the phone (canvas + WebCodecs via Mediabunny): intro, the route drawing itself while the distance counts up, splits, up to 3 of the runner's own clips or photos, and an outro with the logo (drawn from the kit outlines). It uploads through the normal video pipeline and attaches to the run's post (`createVideoPost({ attachTo })`), so it plays in the feed and Watch. Medal reels work the same way.
- **Run League** (`/run/leagues`, scoring in `src/lib/running/points.ts`): weekly points (Monday–Sunday, Nairobi) for km, active days, beating your own 4-week average, PRs, group runs and finished challenges, so beginners can top a table; a separate distance table. Compare with everyone, people you follow, your county or any running crew (communities in Running, Athletics, Cycling, Hiking, Fitness also get a **Run league** tab). `run_weeks` is rebuilt by the engine after every change. **County Cup**: monthly on-foot km per county, all 47.
- **Generated content** (`runRunningJobs`, started from `instrumentation.ts` every 10 minutes; `RUN_JOBS=off` disables): every Monday, a Run League results post from the official `@riadha` account plus a podium message in each running crew's chat; a few hours after a group run, a recap post. `run_digests` keys make each one happen once.
- **Group runs**: an event marked "Group run" (optionally with a meeting point pinned from the organiser's phone) picks up members' runs that start within 1.5 km of it (or from members who RSVP'd) from 45 minutes before to 90 minutes after the start. They're marked attended, get +3 points, and appear in the event's results.
- **Challenges** (`/challenges`): *single* (one run of the distance: First 5K, a monthly 5K / 10K, a sub-25 5K, Jamhuri 12K) or *total* (100 km in a month, km for a cause). Joining counts runs already done in the window. Finishers get a medal (a brand-diagonal shard) on their profile, can share it to the feed and make a medal reel. Admins create challenges in `/admin/challenges`; businesses propose **sponsored** ones from `/market/manage` and admins approve them.
- **Verified times** (`/run/trials`): an athlete asks a verified club to confirm a time (track or road, optionally linked to a GPS run); the club confirms in `/run/trials/review`. Confirmed times show "Verified by …" on the profile, and the **Scout Portal** can filter by event and time ("5K faster than 16:30"), verified only or GPS bests too.

## Video pipeline

Built ourselves, no video SaaS. Flow: **capture → edit → compress on the phone → resumable upload → FFmpeg worker → HLS streaming**.

1. **Capture** (`components/video/camera.tsx`): full-screen in-app camera (tap or hold to record, several takes into one clip, 3s/10s countdown, flip, torch on Android, grid, 15s/60s/3min). Also "Phone camera" (the native camera app via `capture`, best quality and slow-mo) and the gallery.
2. **Edit** (`components/video/editor.tsx`): trim with a filmstrip and two handles, pick the cover frame. Edits are instructions (`trimStartMs`, `trimEndMs`, `coverMs`), not re-encodes.
3. **Compress** (`lib/video/compress.ts`): where the browser has WebCodecs, Mediabunny re-encodes to 720p H.264/AAC (~20MB/min) and applies the trim before upload. Otherwise the original is uploaded and the server trims.
4. **Upload** (`lib/video/uploads.ts`, `/api/videos`): 4MB chunks with `Upload-Offset`; retries with backoff, waits for the network to come back, resumes from what the server has, never writes a chunk twice. It starts as soon as the editor closes (before the caption is written) and keeps going while the athlete uses the app; `UploadPill` shows progress and celebrates when the clip is live.
5. **Process** (`lib/video/worker.ts`, `lib/video/ffmpeg.ts`): a worker started by `src/instrumentation.ts` claims queued clips (`FOR UPDATE SKIP LOCKED`), runs one FFmpeg pass to an HLS ladder (360p/540p/720p, never upscaled, 2s key frames, max 60fps, metadata incl. GPS stripped) plus a poster, then publishes the waiting post. Failures retry 3 times; abandoned uploads, clips that never got a post and old failures are cleaned up.
6. **Play** (`components/video/player.tsx`): hls.js (loaded on demand) with adaptive quality; native HLS on iPhone. Data saver (phone setting, 2G, or `localStorage["riadha-data-saver"]="1"`) caps at 360p. Watch preloads the next reels; feed cards play muted while on screen.

Files live in `storage/videos/<id>/` (gitignored) and are served by `/media/v/[id]/...` with long-lived caching for segments. Settings (max 3 min, 600MB raw, ladder, bitrates) are in `src/lib/video/config.ts`. Env: `VIDEO_WORKER=off` (run the worker separately), `FFMPEG_PATH`/`FFPROBE_PATH` (use a system FFmpeg), `FFMPEG_THREADS` (default 2).

**Deploying it:** this needs a server with a disk (a VPS), not a serverless host. Put a CDN in front of `/media/v` (segments are immutable). To scale storage, move `storage/videos` to R2/S3 behind the same URLs; to scale processing, run more `npm run worker:video` processes.

## Project map

```
src/
  app/                 routes (App Router). (app)/ = signed-in area with app bar + dock, (immersive)/ = Watch
  actions/             server actions: auth, social, profile, fantasy, admin, comments, scout, communities, market
  db/schema.ts         Drizzle schema (source of truth); migrations in /drizzle
  lib/fantasy/         rules.ts (pure), scoring.ts, lineup.ts (auto-subs), engine.ts (DB), data.ts (queries), chat.ts + club-leagues.ts (league chat)
  lib/chat/            filter.ts (pure chat safety filter), events.ts
  lib/auth/            OTP, sessions (signed JWT cookie), SMS
  lib/                 scout.ts, communities.ts, market.ts, ads.ts, watch.ts (module queries), celebrate.ts
  lib/video/           config, compress (phone), uploads (client manager), ffmpeg + worker (server), paths
  lib/running/         track (pure GPS maths), parse (GPX/TCX/FIT), engine (DB writes, jobs), queries, points, reel, outbox
  components/          brand/ (logo, graphics), ui/ (kit primitives), sport/ (kit cards), shell/, feed/, fantasy/, profile/, landing/, motion/, watch/, scout/, communities/, market/
design/               brand-kit/ (official kit), brand/ (earlier boards) and ui-kit/ (Sportify export): source material
scripts/seed.ts        demo data + season simulation (calls seed-modules.ts)
```

Design tokens (colours, fonts, motion keyframes) are in `src/app/globals.css`.

## Before going live

1. **Media storage.** Photos go to `./storage/uploads` and processed videos to `./storage/videos` on local disk. Host on a VPS with enough disk (and a CDN), or move both to R2/S3 behind the same URLs.
2. **SMS.** Set the Africa's Talking keys and `OTP_DEV_MODE=false`.
3. **KPL data licence.** Clubs are real, but players, fixtures and results are illustrative. Secure a data feed before launch; the admin results screen is the manual fallback.
4. **Legal.** Register with the ODPC as a data controller (Data Protection Act). Keep fantasy free-to-enter, or get gaming advice before any paid contests.
5. **KYC.** Automated ID and liveness checks (Smile ID) for ticks.

## Next

Live match centre (WebSockets), real-time chat and push notifications (Web Push) for league chats, a native wrapper (Capacitor) for background GPS recording and Health Connect / HealthKit, Garmin Connect sync, Places (training grounds and their regulars; get legal advice on Strava's segment patent first), weekly recap reels, M-Pesa (ad wallet, Riadha Plus, memberships, event tickets), Strava import, clubs verifying member stats, percentile radars for scouts, and the fantasy chips (Derby Double, wildcard, bench boost).
