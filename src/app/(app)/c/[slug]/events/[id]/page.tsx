import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarPlus, ChevronLeft, Clock, MapPin, Trash2, UsersRound } from "lucide-react";
import { deleteEvent } from "@/actions/communities";
import { requireUser } from "@/lib/auth/session";
import { getEvent, getMembership } from "@/lib/communities";
import { countdown, formatDate, formatTime, isPast } from "@/lib/format";
import { Aurora, SpeedStripes } from "@/components/brand/graphics";
import { ShareButton } from "@/components/feed/buttons";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { RsvpControl } from "@/components/communities/rsvp";

export async function generateMetadata({ params }: PageProps<"/c/[slug]/events/[id]">): Promise<Metadata> {
  const user = await requireUser();
  const e = await getEvent(Number((await params).id), user.id);
  return e ? { title: e.event.title, description: `${e.community.name} · ${e.event.location}` } : { title: "Not found" };
}

export default async function EventPage({ params }: PageProps<"/c/[slug]/events/[id]">) {
  const user = await requireUser();
  const { slug, id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) notFound();
  const data = await getEvent(eventId, user.id);
  if (!data || data.community.slug !== slug) notFound();
  const { event: e, community: c, going, interested, myStatus, attendees } = data;
  const role = await getMembership(c.id, user.id);
  const manager = role === "owner" || role === "admin" || user.isAdmin;
  const past = isPast(e.endsAt ?? e.startsAt);
  const goingList = attendees.filter((a) => a.status === "going");
  const maybeList = attendees.filter((a) => a.status === "interested");

  return (
    <div className="px-4 pt-4">
      <Link href={`/c/${c.slug}?tab=events`} className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> {c.name}
      </Link>

      <section className="relative isolate mt-3 overflow-hidden rounded-[28px] bg-navy p-5 text-white">
        <Aurora intensity={0.8} />
        <SpeedStripes animated fade className="absolute -bottom-2 -right-20 w-56 opacity-50" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green">{past ? "Finished" : `Starts in ${countdown(e.startsAt)}`}</p>
          <h1 className="mt-2 text-[30px] font-bold leading-[1.05] tracking-[-0.035em]">{e.title}</h1>
          <dl className="mt-4 flex flex-col gap-2 text-[14px] text-white/80">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-green" />
              <dt className="sr-only">Date</dt>
              <dd>{formatDate(e.startsAt, { weekday: "long", day: "numeric", month: "long" })}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-green" />
              <dt className="sr-only">Time</dt>
              <dd>
                {formatTime(e.startsAt)}
                {e.endsAt ? ` – ${formatTime(e.endsAt)}` : ""} EAT
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-green" />
              <dt className="sr-only">Where</dt>
              <dd>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`} target="_blank" rel="noreferrer" className="underline decoration-white/30 underline-offset-2 hover:decoration-green">
                  {e.location}
                </a>
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex items-center gap-2">
            {!past && (
              <a href={`/api/events/${e.id}/ics`} className="btn btn-light btn-sm">
                <CalendarPlus size={14} /> Add to calendar
              </a>
            )}
            <div className="ml-auto scale-90">
              <ShareButton path={`/c/${c.slug}/events/${e.id}`} title={`${e.title} · ${c.name}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="card mt-4 p-4" data-reveal="up">
        <RsvpControl eventId={e.id} status={myStatus} going={going} interested={interested} capacity={e.capacity} past={past} />
      </section>

      {e.description && (
        <section className="mt-6" data-reveal="up">
          <h2 className="h5">Details</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{e.description}</p>
        </section>
      )}

      <section className="mt-6" data-reveal="up">
        <h2 className="h5 flex items-center gap-2">
          <UsersRound size={18} /> Who&apos;s going
        </h2>
        {goingList.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">No one yet. Be the first.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-3">
            {goingList.map((a) => (
              <li key={a.user.id}>
                <Link href={`/u/${a.user.handle}`} className="flex w-16 flex-col items-center gap-1 text-center">
                  <Avatar name={a.user.displayName} url={a.user.avatarUrl} size={48} className="ring-2 ring-green" />
                  <span className="w-full truncate text-[11px] font-medium">{a.user.displayName.split(" ")[0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {maybeList.length > 0 && <p className="mt-3 text-[13px] text-muted">{maybeList.length} interested: {maybeList.slice(0, 4).map((a) => a.user.displayName.split(" ")[0]).join(", ")}{maybeList.length > 4 ? "…" : ""}</p>}
      </section>

      {manager && (
        <ConfirmButton action={deleteEvent.bind(null, e.id)} confirm={`Cancel “${e.title}”? Everyone's RSVP is removed.`} className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-danger">
          <Trash2 size={14} /> Cancel event
        </ConfirmButton>
      )}
    </div>
  );
}
