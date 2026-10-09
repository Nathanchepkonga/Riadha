import { getCurrentUser } from "@/lib/auth/session";
import { getMembership, getMessages } from "@/lib/communities";

// Chat polling: GET ?after=<last id> returns newer messages; ?before=<id> pages back through history.
export async function GET(req: Request, ctx: RouteContext<"/api/communities/[id]/messages">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  const communityId = Number((await ctx.params).id);
  if (!Number.isInteger(communityId)) return Response.json({ error: "Not found" }, { status: 404 });
  if (!(await getMembership(communityId, user.id))) return Response.json({ error: "Members only" }, { status: 403 });

  const url = new URL(req.url);
  const after = Number(url.searchParams.get("after")) || undefined;
  const before = Number(url.searchParams.get("before")) || undefined;
  const messages = await getMessages(communityId, { afterId: after, beforeId: before, limit: after ? 100 : 40 });
  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
