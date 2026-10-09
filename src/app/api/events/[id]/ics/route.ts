import { eq } from "drizzle-orm";
import { db } from "@/db";
import { communities, communityEvents } from "@/db/schema";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// RFC 5545 text escaping; long lines are folded at 74 characters.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line: string) => line.match(/.{1,74}/g)?.join("\r\n ") ?? line;

/** "Add to calendar" download for a community event. */
export async function GET(req: Request, ctx: RouteContext<"/api/events/[id]/ics">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const [row] = await db
    .select({ event: communityEvents, community: communities })
    .from(communityEvents)
    .innerJoin(communities, eq(communities.id, communityEvents.communityId))
    .where(eq(communityEvents.id, id));
  if (!row) return new Response("Not found", { status: 404 });

  const { event: e, community: c } = row;
  const end = e.endsAt ?? new Date(e.startsAt.getTime() + 2 * 3600_000);
  const url = new URL(`/c/${c.slug}/events/${e.id}`, req.url).toString();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Riadha//Communities//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:event-${e.id}@riadha`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(`${e.description}\n\n${c.name} on Riadha: ${url}`.trim())}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="riadha-event-${e.id}.ics"`,
    },
  });
}
