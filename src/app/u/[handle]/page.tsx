import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { BadgeCheck, Camera, Play, Plus } from "lucide-react";
import { db } from "@/db";
import { contactRequests, entryGameweeks, fantasyEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getNextFixtureForClub, getPosts, getProfile, type FeedPost } from "@/lib/queries";
import { ageFrom, cn, formatDate, formatTime } from "@/lib/format";
import { ClubBadge } from "@/components/ui/brand";
import { AppIcon } from "@/components/brand/logo";
import { StatBackdrop } from "@/components/sport/cards";
import { Tick } from "@/components/ui/tick";
import { CountUp } from "@/components/motion/count-up";
import { FollowButton } from "@/components/feed/buttons";
import { ContactForm } from "@/components/profile/contact-form";
import { Silhouette } from "@/components/profile/silhouette";
import { MenuButton } from "@/components/shell/menu";
import { TabBar } from "@/components/shell/tab-bar";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const profile = await getProfile((await params).handle);
  if (!profile) return { title: "Not found" };
  const u = profile.user;
  return {
    title: `${u.displayName} (@${u.handle})`,
    description: u.bio ?? `${u.displayName} on Riadha${u.sport ? ` · ${u.sport}` : ""}`,
  };
}

export default async function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  const { handle } = await params;
  const viewer = await getCurrentUser();
  const profile = await getProfile(handle, viewer?.id);
  if (!profile) notFound();

  const { user, club, followers, following, isFollowing, stats } = profile;
  const [posts, nextFx, fantasy, inbox] = await Promise.all([
    getPosts({ viewerId: viewer?.id, mode: "author", authorId: user.id, limit: 12 }),
    club ? getNextFixtureForClub(club.id) : null,
    db
      .select({ teamName: fantasyEntries.teamName, total: sql<number>`coalesce(sum(${entryGameweeks.points}),0)::int` })
      .from(fantasyEntries)
      .leftJoin(entryGameweeks, eq(entryGameweeks.entryId, fantasyEntries.id))
      .where(eq(fantasyEntries.userId, user.id))
      .groupBy(fantasyEntries.id)
      .then((r) => r[0] ?? null),
    viewer?.id === user.id
      ? db.select({ n: sql<number>`count(*)::int` }).from(contactRequests).where(eq(contactRequests.athleteId, user.id)).then((r) => r[0].n)
      : 0,
  ]);

  const own = viewer?.id === user.id;
  const age = ageFrom(user.dateOfBirth);
  const minor = age !== null && age < 18;
  const [first, ...rest] = user.displayName.split(" ");
  const last = rest.join(" ");
  const longest = Math.max(first.length, last.length);
  // Sora Bold caps run ~0.7em per letter; fit the longest name line into the 480px column.
  const nameSize = Math.min(120, Math.floor(610 / Math.max(longest, 4)));
  const highlight = posts.find((p) => p.mediaUrl) ?? posts[0];
  const pb = stats[0];
  const showContact = user.role === "athlete" || user.role === "club";
  const menuUser = viewer ? { handle: viewer.handle, isAdmin: viewer.isAdmin } : null;
  const meta = [user.sport, user.position, user.county, age !== null && user.role === "athlete" ? `${age} yrs` : null].filter(Boolean);

  return (
    <>
      {/* ───── Screen 1: hero ───── */}
      <section className="relative isolate mx-auto h-[min(780px,100svh)] min-h-[620px] max-w-[480px] overflow-hidden bg-offwhite text-navy">
        <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-5 pt-[calc(1.25rem+var(--sat))]">
          <Link href="/" aria-label="Riadha home"><AppIcon size={44} /></Link>
          <MenuButton user={menuUser} tone="ink" />
        </header>

        <h1
          className="absolute inset-x-0 top-[calc(84px+var(--sat))] z-0 px-2 text-center font-bold uppercase leading-[0.86] tracking-[-0.05em] text-navy"
          style={{ fontSize: `min(${nameSize}px, ${(nameSize / 4.8).toFixed(1)}vw)` }}
        >
          <span className="animate-speed-reveal ad-200 block">{first}</span>
          {last && <span className="animate-speed-reveal ad-300 block">{last}</span>}
        </h1>

        <div className="animate-scale-in ad-400 absolute inset-x-0 bottom-0 z-10 flex h-[72%] origin-bottom justify-center">
          {user.heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
            <img src={user.heroUrl} alt={user.displayName} className="h-full w-auto max-w-none object-contain object-bottom" />
          ) : (
            <Silhouette shirt={club?.primaryColor ?? "#3867FF"} trim={club?.secondaryColor ?? "#B7F34A"} />
          )}
        </div>
        {own && !user.heroUrl && (
          <Link href="/me/edit#photos" className="absolute left-1/2 top-[46%] z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
            <Camera size={16} /> Add a hero photo
          </Link>
        )}

        <div className="floor-blur absolute inset-x-0 bottom-0 z-20 h-[48%]" />
        <div className="absolute inset-x-0 bottom-0 z-20 h-[48%] bg-gradient-to-t from-offwhite/85 via-offwhite/30 to-transparent" />

        {user.quote && (
          <blockquote className="animate-fade-slide-up ad-600 absolute inset-x-5 bottom-[152px] z-30">
            <span aria-hidden className="block h-7 w-10 -skew-x-[14deg] rounded-sm bg-green text-center text-[44px] font-bold leading-[0.95] text-navy">“</span>
            <p className="mt-2 max-w-[340px] text-[21px] font-bold leading-[1.12] tracking-[-0.02em]">{user.quote}</p>
            <footer className="mt-2 text-xs text-muted">{user.displayName}</footer>
          </blockquote>
        )}

        <div className="animate-fade-slide-up ad-800 absolute inset-x-0 bottom-0 z-30 grid h-[132px] grid-cols-2 gap-1.5 p-1.5">
          <HighlightCard post={highlight} own={own} />
          {nextFx ? (
            <div className="flex flex-col justify-between rounded-xl bg-navy p-3 text-white">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-green px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-navy">Next game</span>
                <span className="text-xs font-semibold tabular">{formatTime(nextFx.fixture.kickoff)}</span>
              </div>
              <div className="flex items-center justify-around">
                <span className="flex flex-col items-center gap-1 text-[10px] font-semibold">
                  <ClubBadge short={nextFx.home.shortName} primary={nextFx.home.primaryColor} secondary={nextFx.home.secondaryColor} size={34} />
                  {nextFx.home.shortName}
                </span>
                <span className="grid h-6 w-6 place-items-center rounded-full border border-white/30 text-[9px]">VS</span>
                <span className="flex flex-col items-center gap-1 text-[10px] font-semibold">
                  <ClubBadge short={nextFx.away.shortName} primary={nextFx.away.primaryColor} secondary={nextFx.away.secondaryColor} size={34} />
                  {nextFx.away.shortName}
                </span>
              </div>
              <span className="text-center text-[10px] text-white/60">{formatDate(nextFx.fixture.kickoff, { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>
          ) : pb ? (
            <div className="flex flex-col justify-between rounded-xl bg-navy p-3 text-white">
              <span className="self-start rounded-full bg-green px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-navy">{pb.context?.split("·")[0].trim() || "Best"}</span>
              <div>
                <p className="kicker text-[10px] text-white/60">{pb.label}</p>
                <p className="text-[36px] font-bold leading-[0.9] tracking-[-0.05em]">{pb.value}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-end rounded-xl bg-navy p-3 text-white">
              <p className="text-2xl font-bold leading-none">{followers}</p>
              <p className="text-[11px] text-white/60">followers</p>
            </div>
          )}
        </div>
      </section>

      {/* ───── Screen 2: identity, gallery, numbers ───── */}
      <section className="relative mx-auto max-w-[480px] overflow-hidden bg-navy pb-14 pt-8 text-white">
        <div className="px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
                <span className="truncate">{user.displayName}</span>
                <Tick role={user.role} verified={user.verified} size={20} />
              </p>
              <p className="mt-0.5 text-sm text-white/55">@{user.handle}{meta.length ? ` · ${meta.join(" · ")}` : ""}</p>
            </div>
            {own ? (
              <Link href="/me/edit" className="btn btn-light btn-sm shrink-0">Edit</Link>
            ) : (
              <FollowButton userId={user.id} following={isFollowing} signedIn={!!viewer} className="shrink-0" />
            )}
          </div>
          <dl className="mt-4 flex gap-6 text-sm">
            {[
              [followers, "Followers"],
              [following, "Following"],
              [posts.length, "Posts"],
            ].map(([n, l]) => (
              <div key={l as string} className="flex items-baseline gap-1.5">
                <dt className="sr-only">{l}</dt>
                <dd className="font-semibold tabular">{n}</dd>
                <span className="text-white/55">{l}</span>
              </div>
            ))}
          </dl>
          {user.bio && <p className="mt-4 text-[15px] leading-relaxed text-white/80">{user.bio}</p>}
          {club && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-[13px]">
              <ClubBadge short={club.shortName} primary={club.primaryColor} secondary={club.secondaryColor} size={24} />
              {user.role === "athlete" ? "Plays for" : "Supports"} {club.name}
            </p>
          )}

          <h2 className="mt-10 text-[34px] font-bold leading-[1.02] tracking-[-0.035em]">
            {user.tagline ?? (user.role === "fan" ? "More than a fan." : "More than the numbers.")}
          </h2>
        </div>

        {posts.length > 0 ? (
          <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[19%] pb-2">
            {posts.map((p) => (
              <GalleryCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <div className="mx-5 mt-6 rounded-2xl border border-dashed border-white/20 p-6 text-center text-white/60">
            {own ? (
              <Link href="/post/new" className="inline-flex items-center gap-2 font-semibold text-green">
                <Plus size={18} /> Post your first highlight
              </Link>
            ) : (
              "No highlights yet."
            )}
          </div>
        )}

        {stats.length > 0 && (
          <div className="mt-12 px-5">
            <p className="kicker text-white/55">By the numbers</p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6">
              {stats.map((s, i) => {
                const numeric = /^\d{1,3}(,\d{3})*$|^\d+$/.test(s.value);
                return (
                  <div key={s.id} className="border-t border-white/15 pt-3">
                    <p className="kicker text-white/60">{s.label}</p>
                    <p className={cn("mt-1 font-bold leading-[0.9] tracking-[-0.05em] tabular", s.value.length > 6 ? "text-[32px]" : "text-[48px]", i === 0 && "text-green")}>
                      {numeric ? <CountUp to={Number(s.value.replace(/,/g, ""))} delay={i * 150} /> : s.value}
                    </p>
                    {s.context && <p className="mt-2 text-xs text-white/55">{s.context}</p>}
                    {s.verifiedByClub && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-green">
                        <BadgeCheck size={13} /> Verified by club
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fantasy && (
          <Link href={own ? "/fantasy" : "#"} className="mx-5 mt-12 flex items-center justify-between rounded-2xl bg-navy-2 p-4 ring-1 ring-white/10">
            <div>
              <p className="kicker text-white/55">Riadha Fantasy</p>
              <p className="mt-1 text-lg font-semibold">{fantasy.teamName}</p>
            </div>
            <p className="text-right">
              <span className="block text-[34px] font-bold leading-none tracking-[-0.05em] text-green">{fantasy.total}</span>
              <span className="text-[11px] text-white/55">points</span>
            </p>
          </Link>
        )}
      </section>

      {/* ───── Screen 3: collaboration ───── */}
      {showContact && (
        <section className="relative mx-auto max-w-[480px] overflow-hidden bg-green px-5 pb-[calc(var(--tabbar-h)+3rem)] pt-12 text-navy">
          <span className="absolute -right-8 top-0 h-full w-16 -skew-x-[28deg] bg-navy/10" aria-hidden />
          <h2 className="relative text-[34px] font-bold leading-[1.02] tracking-[-0.035em]">
            Do you have an idea for collaboration?
          </h2>
          {own ? (
            <>
              <p className="relative mt-4 text-[15px]">
                Scouts, brands and media reach you through this form. {minor ? "Because you're under 18, requests also go to your guardian and club." : ""}
              </p>
              <Link href="/me/inbox" className="btn btn-primary btn-lg btn-block relative mt-6">
                Open inbox{inbox ? ` (${inbox})` : ""}
              </Link>
            </>
          ) : (
            <>
              <p className="relative mt-4 text-[15px]">
                For trials, sponsorships, media or coaching, get in touch using the form below.
              </p>
              <ContactForm athleteId={user.id} minor={minor} firstName={first} />
            </>
          )}
        </section>
      )}
      {!showContact && <div className="mx-auto h-[calc(var(--tabbar-h)+1rem)] max-w-[480px] bg-navy" />}
      {viewer && <TabBar handle={viewer.handle} />}
    </>
  );
}

function HighlightCard({ post, own }: { post?: FeedPost; own: boolean }) {
  if (!post) {
    return (
      <Link href={own ? "/post/new" : "#"} className="relative grid place-items-center rounded-xl bg-navy text-navy">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-green">
          <Plus size={20} />
        </span>
      </Link>
    );
  }
  return (
    <Link href={`/p/${post.id}`} className="relative overflow-hidden rounded-xl bg-navy" aria-label="Latest highlight">
      <MediaThumb post={post} />
      <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-green text-navy shadow-lg">
        <Play size={18} fill="currentColor" />
      </span>
    </Link>
  );
}

function MediaThumb({ post, large }: { post: FeedPost; large?: boolean }) {
  if (post.mediaUrl && post.mediaType === "image") {
    // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
    return <img src={post.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }
  if (post.mediaUrl && post.mediaType === "video") {
    return <video src={`${post.mediaUrl}#t=0.5`} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />;
  }
  return (
    <div className="absolute inset-0 p-3">
      <StatBackdrop seed={post.id} />
      {post.statValue && (
        <>
          {large && <p className="kicker relative text-[10px] text-white/70">{post.statLabel}</p>}
          <p
            className="relative font-bold leading-[0.9] tracking-[-0.05em] text-white"
            style={{ fontSize: large ? (post.statValue.length > 6 ? 44 : 84) : post.statValue.length > 6 ? 22 : 34 }}
          >
            {post.statValue}
          </p>
        </>
      )}
    </div>
  );
}

function GalleryCard({ post }: { post: FeedPost }) {
  const title = post.location?.split(",")[0] ?? post.statLabel ?? "Highlight";
  return (
    <Link href={`/p/${post.id}`} className="w-full shrink-0 snap-center">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-navy-2">
        <MediaThumb post={post} large />
        {!post.mediaUrl && !post.statValue && (
          <p className="absolute inset-3 line-clamp-6 text-[20px] font-bold leading-[1.1] tracking-[-0.02em] text-white">{post.body}</p>
        )}
        {post.mediaType === "video" && (
          <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-green text-navy">
            <Play size={14} fill="currentColor" />
          </span>
        )}
      </div>
      <p className="mt-3 truncate font-semibold">{title}</p>
      <p className="text-xs text-white/55">{formatDate(post.createdAt, { day: "numeric", month: "long", year: "numeric" })}</p>
    </Link>
  );
}

