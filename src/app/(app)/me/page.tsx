import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { BadgeCheck, Footprints, Inbox, LayoutDashboard, ListChecks, LogOut, Medal, PenLine, Radar, Shield, Shirt, Store, UserRound, UsersRound } from "lucide-react";
import { logout } from "@/actions/auth";
import { db } from "@/db";
import { communityMembers, contactRequests, follows, posts, verificationRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getEntry } from "@/lib/fantasy/data";
import { myBusinesses } from "@/lib/market";
import { canScout } from "@/lib/roles";
import { shortlistCounts } from "@/lib/scout";
import { Aurora, ChevronLines } from "@/components/brand/graphics";
import { CountUp } from "@/components/motion/count-up";
import { Avatar } from "@/components/ui/avatar";
import { ListRow } from "@/components/ui/nav";
import { Tick, tickLabel } from "@/components/ui/tick";
import { profileProgress } from "@/lib/profile-progress";

export const metadata: Metadata = { title: "Me" };

export default async function MePage() {
  const user = await requireUser();
  const scout = canScout(user);
  const [entry, [unread], [lastRequest], [stats], [crews], biz, shortlist] = await Promise.all([
    getEntry(user.id),
    db.select({ n: count() }).from(contactRequests).where(and(eq(contactRequests.athleteId, user.id), isNull(contactRequests.readAt))),
    db.select().from(verificationRequests).where(eq(verificationRequests.userId, user.id)).orderBy(desc(verificationRequests.createdAt)).limit(1),
    db
      .select({
        followers: sql<number>`(select count(*)::int from ${follows} where ${follows.followeeId} = ${user.id})`,
        following: sql<number>`(select count(*)::int from ${follows} where ${follows.followerId} = ${user.id})`,
        posts: sql<number>`(select count(*)::int from ${posts} where ${posts.authorId} = ${user.id})`,
      })
      .from(sql`(select 1) as one`),
    db.select({ n: count() }).from(communityMembers).where(eq(communityMembers.userId, user.id)),
    myBusinesses(user.id),
    scout ? shortlistCounts(user.id) : Promise.resolve({} as Awaited<ReturnType<typeof shortlistCounts>>),
  ]);
  const shortlisted = Object.values(shortlist).reduce((a, b) => a + (b ?? 0), 0);
  const progress = profileProgress(user);

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
    <div className="px-4 pt-4">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-navy p-5 text-white">
        <Aurora intensity={0.9} />
        <ChevronLines className="parallax pointer-events-none absolute -right-36 -top-10 h-[160%] w-auto opacity-40" count={6} />
        <div className="relative flex items-center gap-4">
          <span className="animate-scale-in relative rounded-full bg-[conic-gradient(from_200deg,#8DD63A,#B7F34A,#3867FF,#8DD63A)] p-[3px]">
            <Avatar name={user.displayName} url={user.avatarUrl} size={68} className="ring-[3px] ring-navy" />
          </span>
          <div className="min-w-0">
            <p className="animate-fade-slide-up flex items-center gap-2 text-[21px] font-bold tracking-[-0.02em]">
              <span className="truncate">{user.displayName}</span>
              <Tick role={user.role} verified={user.verified} size={18} />
            </p>
            <p className="animate-fade-slide-up ad-100 text-[13px] text-white/65">
              @{user.handle} · <span className="capitalize">{user.role}</span>
              {user.sport ? ` · ${user.sport}` : ""}
            </p>
          </div>
        </div>
        <dl className="relative mt-5 grid grid-cols-3 gap-2" data-stagger="80">
          {[
            ["Followers", stats.followers],
            ["Following", stats.following],
            ["Posts", stats.posts],
          ].map(([label, n]) => (
            <div key={label} data-reveal="up" suppressHydrationWarning className="glass rounded-2xl px-3 py-2.5">
              <dd className="text-[22px] font-bold leading-none tracking-[-0.03em] tabular">
                <CountUp to={Number(n)} duration={1400} />
              </dd>
              <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <Link href={progress.nextHref} className="pressable mt-4 block rounded-[22px] border border-line bg-surface p-4 transition-colors hover:border-gray-400">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="kicker text-[10px]">Profile strength</p>
            <p className="mt-1 text-[15px] font-bold">{progress.percent}% complete</p>
          </div>
          <span className="text-right text-[12px] text-muted">{progress.percent < 100 ? progress.nextLabel : "Ready to share"}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200" aria-label={`${progress.percent}% profile complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
          <span className="block h-full rounded-full bg-[linear-gradient(90deg,#3867FF,#B7F34A)] transition-[width]" style={{ width: `${progress.percent}%` }} />
        </div>
      </Link>

      <h2 className="kicker mb-2 mt-6 px-1">Profile</h2>
      <div className="card divide-y divide-line/70 overflow-hidden" data-reveal="up" suppressHydrationWarning>
        <ListRow href={`/u/${user.handle}`} icon={<UserRound size={18} />} label="View my profile" hint={`@${user.handle}`} />
        <ListRow href="/me/edit" icon={<PenLine size={18} />} label={user.role === "athlete" ? "Edit profile, stats & skills" : "Edit profile"} />
        <ListRow href="/me/verify" icon={<BadgeCheck size={18} />} label="Verification" hint={verifyStatus} />
        {user.role !== "fan" && <ListRow href="/me/inbox" icon={<Inbox size={18} />} label="Collaboration inbox" hint={unread.n ? `${unread.n} new` : undefined} />}
      </div>

      <h2 className="kicker mb-2 mt-6 px-1">Play & connect</h2>
      <div className="card divide-y divide-line/70 overflow-hidden" data-reveal="up" suppressHydrationWarning>
        <ListRow href="/run" icon={<Footprints size={18} />} label="Riadha Run" hint="Runs, leagues, PRs" />
        <ListRow href="/challenges" icon={<Medal size={18} />} label="Challenges & medals" />
        <ListRow href="/fantasy" icon={<Shirt size={18} />} label="My fantasy team" hint={entry?.teamName ?? "Not created yet"} />
        <ListRow href="/communities" icon={<UsersRound size={18} />} label="My communities" hint={crews.n ? `${crews.n} joined` : "Find your crew"} />
        {scout && <ListRow href="/scout" icon={<Radar size={18} />} label="Scout portal" hint="Search talent" />}
        {scout && <ListRow href="/scout/shortlist" icon={<ListChecks size={18} />} label="My shortlist" hint={shortlisted ? `${shortlisted} athletes` : undefined} />}
      </div>

      <h2 className="kicker mb-2 mt-6 px-1">Business</h2>
      <div className="card divide-y divide-line/70 overflow-hidden" data-reveal="up" suppressHydrationWarning>
        {biz.length > 0 ? (
          <ListRow href="/market/manage" icon={<LayoutDashboard size={18} />} label="Listings & ads" hint={`${biz.length} listing${biz.length === 1 ? "" : "s"}`} />
        ) : (
          <ListRow href="/market/new" icon={<Store size={18} />} label="List your business" hint="Gyms, academies, shops" />
        )}
        {user.isAdmin && <ListRow href="/admin" icon={<Shield size={18} />} label="Admin console" />}
      </div>

      <form action={logout} className="mt-6">
        <button className="btn btn-secondary btn-block">
          <LogOut size={16} /> Sign out
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-muted">Signed in as {user.phone}</p>
      <p className="mt-1 text-center text-xs">
        <Link href="/" className="text-muted hover:text-ink">About Riadha</Link>
      </p>
    </div>
  );
}
