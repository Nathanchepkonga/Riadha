import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk storage for the MVP. Swap for R2/S3 before deploying to a serverless host:
// keep the same `saveUpload` signature and return a public URL.
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

const TYPES: Record<string, { ext: string; kind: "image" | "video"; max: number }> = {
  "image/jpeg": { ext: "jpg", kind: "image", max: 8 * 1024 * 1024 },
  "image/png": { ext: "png", kind: "image", max: 8 * 1024 * 1024 },
  "image/webp": { ext: "webp", kind: "image", max: 8 * 1024 * 1024 },
  "image/gif": { ext: "gif", kind: "image", max: 8 * 1024 * 1024 },
  "video/mp4": { ext: "mp4", kind: "video", max: 60 * 1024 * 1024 },
  "video/webm": { ext: "webm", kind: "video", max: 60 * 1024 * 1024 },
  "video/quicktime": { ext: "mov", kind: "video", max: 60 * 1024 * 1024 },
};

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(TYPES).map(([mime, t]) => [t.ext, mime]),
);

export type Upload = { url: string; kind: "image" | "video" };

/** Saves an uploaded File. Returns null for an empty input; throws a readable error for bad files. */
export async function saveUpload(file: FormDataEntryValue | null, allow: ("image" | "video")[] = ["image", "video"]): Promise<Upload | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const type = TYPES[file.type];
  if (!type || !allow.includes(type.kind)) {
    throw new Error(allow.includes("video") ? "Upload a JPG, PNG, WebP, GIF, MP4, WebM or MOV file." : "Upload a JPG, PNG, WebP or GIF image.");
  }
  if (file.size > type.max) throw new Error(`That file is too big (max ${type.max / 1024 / 1024}MB).`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${type.ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/media/${name}`, kind: type.kind };
}
