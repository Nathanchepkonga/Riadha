import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, MessageCircle, Trophy } from "lucide-react";
import { leaveLeague } from "@/actions/fantasy";
import { db } from "@/db";
import { kplClubs, leagues } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { chatAccess, getLeagueMessages, markRead } from "@/lib/fantasy/chat";
import { getEntry, getStandings } from "@/lib/fantasy/data";
import { getCurrentGameweek } from "@/lib/fantasy/engine";
import { cn } from "@/lib/format";
import { ClubBadge } from "@/components/ui/brand";
import { TabBarLinks } from "@/components/ui/nav";
import { LeagueChat } from "@/components/fantasy/league-chat";
import { InviteButtons } from "./invite";

export const metadata: Metadata = { title: "League" };

export default async function LeaguePage({ params, searchParams }: PageProps<"/fantasy/leagues/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const overall = id === "overall";
  const leagueId = overall ? null : Number(id);
  if (!overall && !Number.isInteger(leagueId)) notFound();

  const [row] = leagueId ? await db.select({ league: leagues, club: kplClubs }).from(leagues).leftJoin(kplClubs, eq(kplClubs.id, leagues.clubId)).where(eq(leagues.id, leagueId)) : [null];
  if (!overall && !row) notFound();
  const league = row?.league ?? null;
  const [entry, current, access] = await Promise.all([getEntry(user.id), getCurrentGameweek(db), leagueId ? chatAccess(leagueId, user.id) : null]);
  const hasChat = !!access;
  const tab = hasChat && sp.tab === "chat" ? "chat" : "table";
  const title = overall || league?.kind === "public" ? "Riadha Overall" : league!.name;

  return (
    <div className="px-3 pt-4">
      <Link href="/fantasy/leagues" className="inline-flex items-center gap-1 px-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> Leagues
      </Link>
      <div className="mt-2 flex items-center gap-3 px-1">
        {row?.club && <ClubBadge short={row.club.shortName} primary={row.club.primaryColor} secondary={row.club.secondaryColor} size={40} />}
        <div className="min-w-0">
          <h1 className="h2 truncate">{title}</h1>
          <p className="text-[12px] text-muted">{league?.kind === "club" ? "Club league · open to all fans" : league?.kind === "private" ? "Private league" : "Every Riadha manager"}</p>
        </div>
      </div>
      {sp.created && <p className="mt-3 rounded-lg border-l-4 border-green bg-green/20 px-4 py-3 text-sm">League created. Share the invite link so friends can join.</p>}
      {league?.kind === "private" && <InviteButtons code={league.code} name={league.name} />}

      {hasChat && (
        <TabBarLinks
          className="mt-4 px-1"
          label="League sections"
          items={[
            { href: `/fantasy/leagues/${leagueId}`, label: <span className="inline-flex items-center gap-1.5"><Trophy size={15} /> Table</span>, active: tab === "table" },
            { href: `/fantasy/leagues/${leagueId}?tab=chat`, label: <span className="inline-flex items-center gap-1.5"><MessageCircle size={15} /> Chat</span>, active: tab === "chat" },
          ]}
        />
      )}

      {tab === "chat" && access && entry ? (
        <div className="px-1 pt-4">
          <ChatTab leagueId={leagueId!} access={access} realName={user.displayName} moderator={user.isAdmin || (access.league.kind === "private" && access.league.ownerId === user.id)} />
        </div>
      ) : (
        <Standings leagueId={leagueId} entryId={entry?.id ?? null} gwId={current?.id ?? null} limit={overall ? 200 : 500} />
      )}

      {league && access && league.kind !== "public" && tab === "table" && (
        <form action={leaveLeague.bind(null, league.id)} className="mt-6 text-center">
          <button className="text-sm text-danger hover:underline">Leave league</button>
        </form>
      )}
    </div>
  );
}

/** Private-league owners and admins can delete any message; everyone can delete their own. */
async function ChatTab({ leagueId, access, realName, moderator }: { leagueId: number; access: NonNullable<Awaited<ReturnType<typeof chatAccess>>>; realName: string; moderator: boolean }) {
  const messages = await getLeagueMessages(leagueId);
  const newest = messages.at(-1)?.id;
  if (newest) await markRead(leagueId, access.entry.id, newest);
  return (
    <LeagueChat
      leagueId={leagueId}
      initial={messages}
      muted={access.muted}
      viewer={{ entryId: access.entry.id, teamName: access.entry.teamName, realName, moderator }}
    />
  );
}

/** League table. Team names only: managers' real names stay private in leagues. */
async function Standings({ leagueId, entryId, gwId, limit }: { leagueId: number | null; entryId: number | null; gwId: number | null; limit: number }) {
  const standings = await getStandings(leagueId, gwId, limit);
  return (
    <div className="card mt-4 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-gray-100 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <th className="w-12 px-3 py-2.5">#</th>
            <th className="px-2 py-2.5">Team</th>
            <th className="px-2 py-2.5 text-right">{gwId ? `GW${gwId}` : "GW"}</th>
            <th className="px-3 py-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const me = s.entry_id === entryId;
            return (
              <tr key={s.entry_id} className={cn("border-b border-line/60 last:border-0", me && "bg-green/25")}>
                <td className="px-3 py-2.5 font-semibold">{s.rank}</td>
                <td className="px-2 py-2.5">
                  <span className={cn("block truncate font-semibold", me && "text-navy")}>
                    {s.team_name}
                    {me && <span className="ml-1.5 text-[11px] font-normal text-muted">(you)</span>}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right tabular">{s.gw}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular">{s.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {standings.length === 0 && <p className="p-6 text-center text-muted">No managers yet.</p>}
    </div>
  );
}
