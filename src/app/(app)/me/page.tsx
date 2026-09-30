import type { Metadata } from "next";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { BadgeCheck, Inbox, LogOut, PenLine, Shield, Shirt, UserRound } from "lucide-react";
import { logout } from "@/actions/auth";
import { db } from "@/db";
import { contactRequests, verificationRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getEntry } from "@/lib/fantasy/data";
import { SlashStripes } from "@/components/brand/graphics";
import { Avatar } from "@/components/ui/avatar";
import { ListRow } from "@/components/ui/nav";
import { Tick, tickLabel } from "@/components/ui/tick";

export const metadata: Metadata = { title: "Me" };

export default async function MePage() {
  const user = await requireUser();
  const [entry, [unread], [lastRequest]] = await Promise.all([
    getEntry(user.id),
    db.select({ n: count() }).from(contactRequests).where(and(eq(contactRequests.athleteId, user.id), isNull(contactRequests.readAt))),
    db.select().from(verificationRequests).where(eq(verificationRequests.userId, user.id)).orderBy(desc(verificationRequests.createdAt)).limit(1),
  ]);

  const verifyStatus = user.verified
    ? tickLabel(user.role)
    : lastRequest?.status === "pending"
      ? "In review"
      : lastRequest?.status === "rejected"
        ? "Not approved, try again"
        : user.role === "fan"
          ? "Become an athlete, club or scout"
          : "Request your tick";

  return (
    <div className="px-4 pt-5">
      <div className="relative overflow-hidden rounded-3xl bg-navy p-5 text-white">
        <SlashStripes className="absolute -bottom-3 -right-3 w-28 rotate-90" />
        <div className="relative flex items-center gap-4">
          <Avatar name={user.displayName} url={user.avatarUrl} size={64} className="ring-2 ring-green" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[20px] font-bold tracking-[-0.02em]">
              <span className="truncate">{user.displayName}</span>
              <Tick role={user.role} verified={user.verified} size={18} />
            </p>
            <p className="text-[13px] capitalize text-white/70">
              {user.role}
              {user.sport ? ` · ${user.sport}` : ""}
              {user.county ? ` · ${user.county}` : ""}
            </p>
          </div>
        </div>
      </div>

      <h2 className="kicker mb-2 mt-6 px-1">Profile</h2>
      <div className="card divide-y divide-line/70 overflow-hidden">
        <ListRow href={`/u/${user.handle}`} icon={<UserRound size={18} />} label="View my profile" hint={`@${user.handle}`} />
        <ListRow href="/me/edit" icon={<PenLine size={18} />} label="Edit profile, photos & stats" />
        <ListRow href="/me/verify" icon={<BadgeCheck size={18} />} label="Verification" hint={verifyStatus} />
        {user.role !== "fan" && <ListRow href="/me/inbox" icon={<Inbox size={18} />} label="Collaboration inbox" hint={unread.n ? `${unread.n} new` : undefined} />}
      </div>

      <h2 className="kicker mb-2 mt-6 px-1">Play</h2>
      <div className="card divide-y divide-line/70 overflow-hidden">
        <ListRow href="/fantasy" icon={<Shirt size={18} />} label="My fantasy team" hint={entry?.teamName ?? "Not created yet"} />
        {user.isAdmin && <ListRow href="/admin" icon={<Shield size={18} />} label="Admin console" />}
      </div>

      <form action={logout} className="mt-6">
        <button className="btn btn-secondary btn-block">
          <LogOut size={16} /> Sign out
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-muted">Signed in as {user.phone}</p>
    </div>
  );
}
