import { getComments } from "@/lib/queries";

export async function GET(_req: Request, ctx: RouteContext<"/api/posts/[id]/comments">) {
  const postId = Number((await ctx.params).id);
  if (!Number.isInteger(postId)) return Response.json({ error: "Not found" }, { status: 404 });
  const comments = await getComments(postId);
  return Response.json({ comments }, { headers: { "Cache-Control": "no-store" } });
}
