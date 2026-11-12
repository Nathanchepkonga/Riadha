# Riadha operations baseline

This document records the development-safe controls currently implemented and the checks required before a production deployment.

## Environments and secrets

- Keep `.env.local` local and uncommitted. Production credentials must be supplied by the deployment secret manager.
- Use separate Neon projects or branches and separate storage roots for development, staging, and production.
- Do not use real phone numbers, GPS tracks, verification evidence, or production media in automated tests.
- Keep `OTP_DEV_MODE=true` only in development. Production must configure Africa's Talking and set it to `false`.
- `SESSION_SECRET` must be a random value of at least 32 characters and must not be shared between environments.

## Required checks

Run the following before merging:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Schema changes follow the repository migration flow:

```bash
npm run db:generate
npm run db:migrate
```

Review generated SQL before applying it to staging or production. Prefer additive, backward-compatible migrations; use a forward repair migration rather than editing an applied migration.

## Security baseline

- Server actions and route handlers authenticate independently; UI visibility is not authorization.
- Admin and moderation mutations record an `audit_events` row with actor, action, target, outcome, and non-sensitive metadata.
- Responses use safe user-facing errors. Credentials, OTPs, raw GPS tracks, upload contents, and request bodies must not be written to logs.
- Production responses include content-type, framing, referrer, permissions, and transport security headers from `next.config.ts`.
- Uploaded media is validated by declared type, size, ownership, and an allowlisted path before it is read or served.
- Raw running tracks remain server-only. Public running queries use `activityCard` and privacy-trimmed route art.

## Recovery and operational gaps before production

The MVP uses local disk for uploads and an in-process video/run worker. Before production, replace local storage with durable object storage, run workers as a supervised process, and document Neon backup retention plus a tested restore procedure. Define RTO/RPO, alert ownership, and a production incident contact before launch.

## Audit review

The `audit_events` table is append-only from application code. Review privileged actions by actor, action, target, outcome, and time window. Do not add raw form fields, tokens, phone numbers, email addresses, or GPS coordinates to metadata.
