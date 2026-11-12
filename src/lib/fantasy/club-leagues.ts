import { eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { kplClubs, leagues } from "@/db/schema";

/**
 * Makes sure every KPL club has its fans' league ("Gor Mahia Fans", code FANSGOR). Idempotent; takes
 * `db` so the seed script can use it too.
 */
export async function ensureClubLeagues(db: DB) {
  const [clubs, existing] = await Promise.all([db.select().from(kplClubs), db.select({ clubId: leagues.clubId }).from(leagues).where(eq(leagues.kind, "club"))]);
  const have = new Set(existing.map((l) => l.clubId));
  const missing = clubs.filter((c) => !have.has(c.id));
  if (!missing.length) return;
  await db
    .insert(leagues)
    .values(missing.map((c) => ({ name: `${c.name} Fans`, code: `FANS${c.shortName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)}`, kind: "club" as const, clubId: c.id })))
    .onConflictDoNothing();
}
