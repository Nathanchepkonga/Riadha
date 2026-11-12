"use client";

import { VIDEO } from "./config";

/*
 * On-phone compression with WebCodecs (via Mediabunny, loaded on demand). A 4K phone clip becomes a
 * 720p H.264/AAC MP4 of roughly 20MB a minute before it's uploaded, saving the athlete's data bundle.
 * Browsers without WebCodecs (or without an AAC/Opus encoder) simply upload the original file.
 */

export type CompressResult = { file: File; trimmed: boolean };

/** Whether this browser can encode H.264 itself. */
export async function canCompress() {
  if (typeof window === "undefined" || !("VideoEncoder" in window) || !("AudioEncoder" in window)) return false;
  try {
    const { canEncodeVideo } = await import("mediabunny");
    return await canEncodeVideo("avc", { width: 720, height: 1280 });
  } catch {
    return false;
  }
}

/**
 * Compresses (and trims) a clip. Returns null when compression isn't possible or wouldn't help, in which
 * case the caller uploads the original and the server does the trimming.
 */
export async function compressVideo(
  file: Blob,
  opts: { name?: string; trimStartMs?: number | null; trimEndMs?: number | null; onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<CompressResult | null> {
  if (!(await canCompress())) return null;
  const mb = await import("mediabunny");
  const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) });
  try {
    const video = await input.getPrimaryVideoTrack();
    if (!video) return null;
    const audio = (await input.getAudioTracks())[0] ?? null;
    const durationS = await input.computeDuration();
    const short = Math.min(video.displayWidth, video.displayHeight);
    const bitrate = durationS > 0 ? (file.size * 8) / durationS : Infinity;
    const trim = opts.trimStartMs != null || opts.trimEndMs != null;
    // Already small enough: let the server handle it.
    if (short <= VIDEO.client.shortSide && bitrate <= VIDEO.client.videoBitrate * 1.5 && !trim) return null;

    const audioCodec = audio ? await mb.getFirstEncodableAudioCodec(["aac", "opus"]) : null;
    if (audio && !audioCodec) return null; // never silently drop the sound

    const scale = short > VIDEO.client.shortSide ? VIDEO.client.shortSide / short : 1;
    const width = Math.round((video.displayWidth * scale) / 2) * 2;
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input,
      output,
      showWarnings: false,
      video: { codec: "avc", width, quality: new mb.Quality({ bitrate: VIDEO.client.videoBitrate }), keyFrameInterval: 2, forceTranscode: true },
      audio: audioCodec ? { codec: audioCodec, numberOfChannels: 2, quality: new mb.Quality({ bitrate: VIDEO.client.audioBitrate }) } : { discard: true },
      trim: trim
        ? {
            start: opts.trimStartMs != null ? opts.trimStartMs / 1000 : undefined,
            end: opts.trimEndMs != null ? Math.min(opts.trimEndMs / 1000, durationS) : undefined,
          }
        : undefined,
    });
    if (!conversion.isValid) return null;
    conversion.onProgress = (p) => opts.onProgress?.(p);
    const abort = () => void conversion.cancel();
    opts.signal?.addEventListener("abort", abort, { once: true });
    try {
      await conversion.execute();
    } finally {
      opts.signal?.removeEventListener("abort", abort);
    }
    const buffer = output.target.buffer;
    if (!buffer) return null;
    const base = (opts.name ?? "clip").replace(/\.[^.]+$/, "");
    return { file: new File([buffer], `${base}.mp4`, { type: "video/mp4" }), trimmed: trim };
  } finally {
    input.dispose?.();
  }
}
