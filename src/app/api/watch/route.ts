import { getCurrentUser } from "@/lib/auth/session";
import { getWatchPage } from "@/lib/watch";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") === "following" ? "following" : "forYou";
  const offset = Math.max(0, Math.min(1000, Number(url.searchParams.get("offset")) || 0));
  return Response.json(await getWatchPage(user, tab, offset), { headers: { "Cache-Control": "no-store" } });
}
