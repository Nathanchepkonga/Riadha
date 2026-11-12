/*
 * Video pipeline settings, shared by the browser (camera, compressor, uploader) and the server
 * (upload routes, FFmpeg worker). Change limits here, not in the call sites.
 */

export const VIDEO = {
  /** Longest clip we keep, after trimming. Longer uploads are cut to this. */
  maxSeconds: 180,
  /** Largest raw file accepted (an uncompressed 3-minute 4K phone clip fits). */
  maxBytes: 600 * 1024 * 1024,
  /** Upload chunk size. Small enough to retry cheaply on a weak mobile connection. */
  chunkBytes: 4 * 1024 * 1024,
  /** What phones compress to before uploading, when the browser can (WebCodecs). */
  client: { shortSide: 720, videoBitrate: 2_800_000, audioBitrate: 128_000 },
  /** In-app camera durations to choose from, in seconds. */
  cameraLimits: [15, 60, 180] as const,
};

/** Adaptive streaming ladder produced by the worker, smallest first. Only rungs at or below the source are made. */
export const RENDITIONS = [
  { name: "360p", shortSide: 360, videoBitrate: 800_000, audioBitrate: 96_000 },
  { name: "540p", shortSide: 540, videoBitrate: 1_600_000, audioBitrate: 128_000 },
  { name: "720p", shortSide: 720, videoBitrate: 2_800_000, audioBitrate: 128_000 },
] as const;

export const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/3gpp", "video/x-m4v"];

export const playbackUrl = (videoId: string) => `/media/v/${videoId}/master.m3u8`;
export const posterUrlFor = (videoId: string) => `/media/v/${videoId}/poster.jpg`;

export type VideoStatus = "uploading" | "queued" | "processing" | "ready" | "failed";

/** Shape returned by GET /api/videos/[id]. */
export type VideoState = {
  id: string;
  status: VideoStatus;
  sizeBytes: number;
  receivedBytes: number;
  error: string | null;
  playbackUrl: string | null;
  posterUrl: string | null;
};
