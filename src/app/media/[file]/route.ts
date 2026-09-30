import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MIME_BY_EXT, UPLOAD_DIR } from "@/lib/storage";

// Serves uploaded media with HTTP range support so videos can seek on iOS Safari.
export async function GET(req: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(file)) return new Response("Not found", { status: 404 });
  const full = path.join(UPLOAD_DIR, file);
  const info = await stat(full).catch(() => null);
  if (!info) return new Response("Not found", { status: 404 });

  const type = MIME_BY_EXT[file.split(".").pop()!] ?? "application/octet-stream";
  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }
  headers.set("Content-Length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(full)) as ReadableStream, { headers });
}
