import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { athleteStats, kplClubs } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { ProfileForm, StatsEditor } from "./forms";

export const metadata: Metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const user = await requireUser();
  const [clubs, stats] = await Promise.all([
    db.select({ id: kplClubs.id, name: kplClubs.name }).from(kplClubs).orderBy(asc(kplClubs.name)),
    db.select().from(athleteStats).where(eq(athleteStats.userId, user.id)).orderBy(asc(athleteStats.sortOrder), asc(athleteStats.id)),
  ]);

  return (
    <div className="px-4 pt-5">
      <p className="kicker">@{user.handle}</p>
      <h1 className="h2">Edit profile</h1>
      <ProfileForm
        user={{
          displayName: user.displayName,
          handle: user.handle,
          role: user.role,
          bio: user.bio ?? "",
          quote: user.quote ?? "",
          tagline: user.tagline ?? "",
          sport: user.sport ?? "",
          position: user.position ?? "",
          county: user.county ?? "",
          dateOfBirth: user.dateOfBirth ?? "",
          guardianPhone: user.guardianPhone ?? "",
          kplClubId: user.kplClubId ? String(user.kplClubId) : "",
          avatarUrl: user.avatarUrl,
          heroUrl: user.heroUrl,
        }}
        clubs={clubs}
      />
      {user.role !== "fan" && <StatsEditor stats={stats.map((s) => ({ id: s.id, label: s.label, value: s.value, context: s.context, verifiedByClub: s.verifiedByClub }))} />}
    </div>
  );
}
