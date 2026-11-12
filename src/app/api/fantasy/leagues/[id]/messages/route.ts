import { getCurrentUser } from "@/lib/auth/session";
import { chatAccess, getLeagueMessages, markRead } from "@/lib/fantasy/chat";

/**
 * League chat polling. ?after=<id> returns newer messages, ?before=<id> pages back. With ?read=1 (sent
 * while the chat is on screen) the viewer's read marker moves to the newest message.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/fantasy/leagues/[id]/messages">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  const leagueId = Number((await ctx.params).id);
  if (!Number.isInteger(leagueId)) return Response.json({ error: "Not found" }, { status: 404 });
  const access = await chatAccess(leagueId, user.id);
  if (!access) return Response.json({ error: "Members only" }, { status: 403 });

  const url = new URL(req.url);
  const after = Number(url.searchParams.get("after")) || undefined;
  const before = Number(url.searchParams.get("before")) || undefined;
  const messages = await getLeagueMessages(leagueId, { afterId: after, beforeId: before, limit: after ? 100 : 40 });
  const newest = messages.at(-1)?.id;
  if (url.searchParams.get("read") === "1" && newest) await markRead(leagueId, access.entry.id, newest);
  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
