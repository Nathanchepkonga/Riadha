import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarPlus, ChevronLeft, Lock, MapPin, Shield, Trash2, UsersRound } from "lucide-react";
import { deleteCommunity } from "@/actions/communities";
import { requireUser } from "@/lib/auth/session";
import { getCommunity, getEvents, getMembers, getMessages } from "@/lib/communities";
import { compact, formatDate, formatKickoff, formatTime } from "@/lib/format";
import { ShareButton } from "@/components/feed/buttons";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState, TabBarLinks } from "@/components/ui/nav";
import { Tick } from "@/components/ui/tick";
import { ChatRoom } from "@/components/communities/chat-room";
import { CommunityCover } from "@/components/communities/community-art";
import { CommunityForm } from "@/components/communities/forms";
import { JoinButton } from "@/components/communities/join-button";
import { MemberMenu } from "@/components/communities/member-menu";

type Tab = "chat" | "events" | "members" | "about";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const user = await requireUser();
  const c = await getCommunity((await params).slug, user.id);
  return c ? { title: c.community.name, description: c.community.description.slice(0, 160) } : { title: "Not found" };
}

export default async function CommunityPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const user = await requireUser();
  const { slug } = await params;
  const data = await getCommunity(slug, user.id);
  if (!data) notFound();
  const { community: c, members, owner, role } = data;
  const member = !!role;
  const manager = role === "owner" || role === "admin" || user.isAdmin;
  const raw = (await searchParams).tab;
  const tab: Tab = raw === "chat" || raw === "events" || raw === "members" || raw === "about" ? raw : member ? "chat" : "about";
  const tabs: { key: Tab; label: string }[] = [
    { key: "chat", label: "Chat" },
    { key: "events", label: "Events" },
    { key: "members", label: `Members ${compact(members)}` },
    { key: "about", label: "About" },
  ];

  return (
    <div>
      <div className="relative">
        <CommunityCover name={c.name} category={c.category} coverUrl={c.coverUrl} className="h-44 w-full" iconSize={88} />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-navy/20" />
        <Link href="/communities" className="pressable glass-dark absolute left-3 top-3 inline-flex items-center gap-1 rounded-full py-1.5 pl-2 pr-3 text-[13px] font-semibold text-white">
          <ChevronLeft size={16} /> Communities
        </Link>
      </div>
      <section className="relative -mt-14 px-4">
        <div className="animate-fade-slide-up relative overflow-hidden rounded-3xl bg-navy p-4 text-white shadow-[0_20px_40px_-20px_rgba(8,16,24,.6)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green">
            {c.category}
            {c.county ? ` · ${c.county}` : ""}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.03em]">{c.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/65">
            <UsersRound size={14} /> {compact(members)} member{members === 1 ? "" : "s"}
            {role && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-white">
                {role !== "member" && <Shield size={11} className="text-green" />} {role}
              </span>
            )}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {role === "owner" ? null : <JoinButton communityId={c.id} joined={member} />}
            <div className="ml-auto scale-90">
              <ShareButton path={`/c/${c.slug}`} title={`${c.name} on Riadha`} />
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pt-5">
        <TabBarLinks label="Community sections" items={tabs.map((t) => ({ href: `/c/${c.slug}?tab=${t.key}`, label: t.label, active: t.key === tab }))} />
        <div className="pt-5">
          {tab === "chat" &&
            (member ? (
              <ChatRoom communityId={c.id} initial={await getMessages(c.id)} viewer={{ id: user.id, moderator: manager }} />
            ) : (
              <EmptyState title="Members-only chat" body="Join to read and post in the group chat." action={<JoinButton communityId={c.id} joined={false} />} />
            ))}
          {tab === "events" && <EventsTab slug={c.slug} communityId={c.id} manager={manager} viewerId={user.id} />}
          {tab === "members" && <MembersTab communityId={c.id} manager={manager} viewerRole={role === "owner" ? "owner" : role === "admin" ? "admin" : user.isAdmin ? "site" : null} viewerId={user.id} />}
          {tab === "about" && (
            <div className="flex flex-col gap-6">
              <section className="card p-4">
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{c.description}</p>
                <p className="mt-4 text-[12px] text-muted">
                  Started {formatDate(c.createdAt, { month: "long", year: "numeric" })} by{" "}
                  <Link href={`/u/${owner.handle}`} className="font-semibold text-ink">{owner.displayName}</Link>
                </p>
              </section>
              {!member && (
                <p className="flex items-center gap-2 text-[13px] text-muted">
                  <Lock size={14} /> Chat and member list are visible to members.
                </p>
              )}
              {manager && (
                <section>
                  <h2 className="h5">Edit community</h2>
                  <div className="mt-3">
                    <CommunityForm values={{ id: c.id, name: c.name, description: c.description, category: c.category, county: c.county ?? "", coverUrl: c.coverUrl }} />
                  </div>
                  {(role === "owner" || user.isAdmin) && (
                    <ConfirmButton action={deleteCommunity.bind(null, c.id)} confirm={`Delete ${c.name}? Its chat, events and members are removed for everyone.`} className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-danger">
                      <Trash2 size={14} /> Delete community
                    </ConfirmButton>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function EventsTab({ slug, communityId, manager, viewerId }: { slug: string; communityId: number; manager: boolean; viewerId: string }) {
  const [upcoming, past] = await Promise.all([getEvents(communityId, true, viewerId), getEvents(communityId, false, viewerId)]);
  return (
    <div className="flex flex-col gap-3">
      {manager && (
        <Link href={`/c/${slug}/events/new`} className="btn btn-primary btn-block">
          <CalendarPlus size={16} /> New event
        </Link>
      )}
      {upcoming.length === 0 && <EmptyState title="No upcoming events" body={manager ? "Plan the next run, match or meet-up." : "Check back soon."} />}
      <div className="flex flex-col gap-3" data-stagger="60">
        {upcoming.map(({ event: e, going, myStatus }) => (
          <Link key={e.id} href={`/c/${slug}/events/${e.id}`} data-reveal="up" className="card pressable flex gap-3 p-3">
            <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-navy py-2 text-center text-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-green">{formatDate(e.startsAt, { month: "short" })}</span>
              <span className="text-[22px] font-bold leading-none">{formatDate(e.startsAt, { day: "numeric" })}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{e.title}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                <CalendarDays size={12} /> {formatDate(e.startsAt, { weekday: "short" })} {formatTime(e.startsAt)}
              </span>
              <span className="flex items-center gap-1 truncate text-[12px] text-muted">
                <MapPin size={12} /> {e.location}
              </span>
            </span>
            <span className="flex flex-col items-end justify-between">
              {myStatus && <span className={myStatus === "going" ? "rounded-full bg-green px-2 py-0.5 text-[10px] font-bold uppercase text-navy" : "rounded-full bg-cobalt px-2 py-0.5 text-[10px] font-bold uppercase text-white"}>{myStatus}</span>}
              <span className="text-[12px] text-muted">{going}{e.capacity ? `/${e.capacity}` : ""} going</span>
            </span>
          </Link>
        ))}
      </div>
      {past.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-muted">Past events ({past.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {past.map(({ event: e, going }) => (
              <li key={e.id}>
                <Link href={`/c/${slug}/events/${e.id}`} className="flex justify-between rounded-lg px-2 py-2 text-[14px] hover:bg-gray-100">
                  <span className="truncate">{e.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">{formatKickoff(e.startsAt)} · {going} went</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

async function MembersTab({ communityId, manager, viewerRole, viewerId }: { communityId: number; manager: boolean; viewerRole: "owner" | "admin" | "site" | null; viewerId: string }) {
  const list = await getMembers(communityId);
  return (
    <ul className="card divide-y divide-line/70 overflow-hidden">
      {list.map((m) => (
        <li key={m.user.id} className="flex items-center gap-3 px-4 py-3">
          <Link href={`/u/${m.user.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={m.user.displayName} url={m.user.avatarUrl} size={40} />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="truncate">{m.user.displayName}</span>
                <Tick role={m.user.role} verified={m.user.verified} size={14} />
              </span>
              <span className="text-[12px] capitalize text-muted">
                {m.role !== "member" ? m.role : m.user.role} · joined {formatDate(m.joinedAt, { month: "short", year: "numeric" })}
              </span>
            </span>
          </Link>
          {manager && viewerRole && m.user.id !== viewerId && <MemberMenu communityId={communityId} userId={m.user.id} role={m.role} viewerRole={viewerRole} />}
        </li>
      ))}
    </ul>
  );
}
