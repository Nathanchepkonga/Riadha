import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, ChevronRight, Globe, Lock, Users } from "lucide-react";
import { joinClubLeague } from "@/actions/league-chat";
import { db } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { clubLeagueSuggestions, myChats } from "@/lib/fantasy/chat";
import { ensureClubLeagues } from "@/lib/fantasy/club-leagues";
import { getEntry, getOverallRank } from "@/lib/fantasy/data";
import { getCurrentGameweek } from "@/lib/fantasy/engine";
import { cn, formatDate, formatTime } from "@/lib/format";
import { ClubBadge } from "@/components/ui/brand";
import { SectionHeader } from "@/components/ui/nav";
import { LeagueForms } from "./league-forms";

export const metadata: Metadata = { title: "Leagues" };

function when(iso: string) {
  const d = new Date(iso);
  const key = (x: Date) => formatDate(x, { year: "numeric", month: "2-digit", day: "2-digit" });
  if (key(d) === key(new Date())) return formatTime(d);
  if (key(d) === key(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return formatDate(d, { day: "numeric", month: "short" });
}

export default async function LeaguesPage() {
  const user = await requireUser();
  const entry = await getEntry(user.id);
  if (!entry) {
    return (
      <div className="p-6 text-center">
        <p className="h4">Pick your squad first</p>
        <p className="mt-2 text-muted">Then join your club&apos;s fans league or create one for your office, chama or estate.</p>
        <Link href="/fantasy/squad" className="btn btn-accent mt-5">Pick my squad</Link>
      </div>
    );
  }
  await ensureClubLeagues(db);
  const [chats, suggestions, overall, current] = await Promise.all([myChats(entry.id), clubLeagueSuggestions(entry.id, user.kplClubId), getOverallRank(entry.id), getCurrentGameweek(db)]);

  return (
    <div className="px-4 pt-5">
      <p className="kicker">{entry.teamName}</p>
      <h1 className="h2">Leagues</h1>

      <Link href="/fantasy/leagues/overall" className="card pressable mt-5 flex items-center gap-3 p-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-green"><Globe size={20} /></span>
        <span className="flex-1">
          <span className="block font-semibold">Riadha Overall</span>
          <span className="text-xs text-muted">{overall.managers.toLocaleString("en-KE")} managers{current ? ` · after GW${current.id}` : ""}</span>
        </span>
        <span className="text-right">
          <span className="block font-semibold tabular">#{overall.rank.toLocaleString("en-KE")}</span>
          <span className="text-xs text-muted">{overall.total} pts</span>
        </span>
        <ChevronRight size={18} className="text-muted" />
      </Link>

      <section className="mt-7">
        <SectionHeader title="Chats" />
        <p className="mt-1 text-[12px] text-muted">Your private and club leagues. Everyone appears by team name only.</p>
        {chats.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-5 text-center text-[14px] text-muted">Join your club&apos;s fans league below, or create a league for your friends.</p>
        ) : (
          <ul className="card mt-3 divide-y divide-line/70 overflow-hidden">
            {chats.map((c) => {
              const preview = !c.last ? "No messages yet" : c.last.deleted ? "This message was deleted" : `${c.last.mine ? "You" : c.last.team}: ${c.last.body}`;
              return (
                <li key={c.league.id}>
                  <Link href={`/fantasy/leagues/${c.league.id}?tab=chat`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-100">
                    {c.club?.shortName ? (
                      <ClubBadge short={c.club.shortName} primary={c.club.primaryColor!} secondary={c.club.secondaryColor!} size={46} />
                    ) : (
                      <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-green text-[18px] font-bold text-navy">{c.league.name[0]}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                          <span className="truncate">{c.league.name}</span>
                          {c.league.kind === "private" && <Lock size={12} className="shrink-0 text-subtle" aria-label="Private" />}
                        </span>
                        {c.last && <span className={cn("shrink-0 text-[11px]", c.unread && !c.muted ? "font-semibold text-cobalt" : "text-muted")}>{when(c.last.at)}</span>}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={cn("truncate text-[13px]", c.unread ? "text-ink" : "text-muted", c.last?.deleted && "italic")}>{preview}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {c.muted && <BellOff size={13} className="text-subtle" aria-label="Muted" />}
                          {c.unread > 0 && (
                            <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", c.muted ? "bg-gray-200 text-muted" : "bg-green text-navy")}>
                              {c.unread > 99 ? "99+" : c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(suggestions.favourite || suggestions.others.length > 0) && (
        <section className="mt-7">
          <SectionHeader title="Club leagues" />
          <p className="mt-1 text-[12px] text-muted">Talk football with fans of your KPL club.</p>
          {suggestions.favourite && (
            <div data-reveal="up" className="edge-glow relative mt-3 flex items-center gap-3 overflow-hidden rounded-2xl bg-navy p-4 text-white">
              <ClubBadge short={suggestions.favourite.club.shortName} primary={suggestions.favourite.club.primaryColor} secondary={suggestions.favourite.club.secondaryColor} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green">Suggested for you</p>
                <p className="truncate font-semibold">{suggestions.favourite.league.name}</p>
                <p className="flex items-center gap-1 text-[12px] text-white/60">
                  <Users size={12} /> {suggestions.favourite.members} fan{suggestions.favourite.members === 1 ? "" : "s"}
                </p>
              </div>
              <form action={joinClubLeague.bind(null, suggestions.favourite.league.id)}>
                <button className="btn btn-accent btn-sm">Join</button>
              </form>
            </div>
          )}
          {suggestions.others.length > 0 && (
            <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" data-stagger="40">
              {suggestions.others.map((s) => (
                <li key={s.league.id} data-reveal="right" className="card flex w-[150px] shrink-0 flex-col items-center gap-2 p-3 text-center">
                  <ClubBadge short={s.club.shortName} primary={s.club.primaryColor} secondary={s.club.secondaryColor} size={40} />
                  <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{s.club.name}</span>
                  <span className="text-[11px] text-muted">{s.members} fan{s.members === 1 ? "" : "s"}</span>
                  <form action={joinClubLeague.bind(null, s.league.id)} className="w-full">
                    <button className="btn btn-secondary btn-sm btn-block">Join</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <LeagueForms />
    </div>
  );
}
