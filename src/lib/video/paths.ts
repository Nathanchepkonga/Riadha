import path from "node:path";

// Local-disk video storage for the self-hosted pipeline. Raw uploads land in incoming/ while they are
// assembled; the worker writes HLS output to <id>/ (renditions, segments, poster) and then deletes the
// raw file. To move to object storage later, keep these names and swap the read/write calls.
export const VIDEO_ROOT = path.join(process.cwd(), "storage", "videos");

export const incomingPath = (id: string) => path.join(VIDEO_ROOT, "incoming", `${id}.part`);
export const outputDir = (id: string) => path.join(VIDEO_ROOT, id);

/** Video ids are UUIDs; anything else never touches the filesystem. */
export const isVideoId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
