import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { isVideoId, outputDir } from "@/lib/video/paths";

// Serves processed clips: the HLS master playlist, per-quality playlists, segments and the poster.
// Only these exact shapes are allowed, so no request can wander outside the clip's folder.
const ALLOWED = /^(master\.m3u8|poster\.jpg|\d{3,4}p\/(index\.m3u8|seg_\d{3,5}\.ts))$/;
const TYPES: Record<string, string> = { m3u8: "application/vnd.apple.mpegurl", ts: "video/mp2t", jpg: "image/jpeg" };

export async function GET(req: Request, ctx: RouteContext<"/media/v/[id]/[...path]">) {
  const { id, path: parts } = await ctx.params;
  const rel = parts.join("/");
  if (!isVideoId(id) || !ALLOWED.test(rel)) return new Response("Not found", { status: 404 });
  const full = path.join(outputDir(id), ...parts);
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) return new Response("Not found", { status: 404 });

  const ext = rel.split(".").pop()!;
  const headers = new Headers({
    "Content-Type": TYPES[ext],
    "Accept-Ranges": "bytes",
    // Segments and posters never change for a clip id; playlists are cheap, so keep them short-lived.
    "Cache-Control": ext === "m3u8" ? "public, max-age=60" : "public, max-age=31536000, immutable",
  });
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream, { status: 206, headers });
  }
  headers.set("Content-Length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(full)) as ReadableStream, { headers });
}
