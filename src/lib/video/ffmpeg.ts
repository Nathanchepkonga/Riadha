import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { RENDITIONS } from "./config";

// FFmpeg/FFprobe come from npm (ffmpeg-static, ffprobe-static). Set FFMPEG_PATH / FFPROBE_PATH to use
// a system build instead (e.g. one with hardware encoders on the production server).
const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || ffprobeStatic.path || "ffprobe";
// Keep transcoding from starving the web server on small machines.
const THREADS = process.env.FFMPEG_THREADS || "2";

function run(bin: string, args: string[], opts: { cwd?: string; timeoutMs?: number } = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(bin, args, { cwd: opts.cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    // FFmpeg is chatty on stderr; keep only the tail for error messages.
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-8000)));
    const timer = setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs ?? 20 * 60_000);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(bin)} exited with ${code}: ${stderr.split("\n").filter(Boolean).slice(-3).join(" | ")}`));
    });
  });
}

export type Probe = { durationMs: number; width: number; height: number; hasAudio: boolean; videoCodec: string };

/** Reads duration, display size (after rotation) and audio presence. Throws if there's no video stream. */
export async function probe(file: string): Promise<Probe> {
  const { stdout } = await run(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { timeoutMs: 60_000 });
  const info = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: { codec_type: string; codec_name?: string; width?: number; height?: number; duration?: string; tags?: { rotate?: string }; side_data_list?: { rotation?: number }[] }[];
  };
  const v = info.streams?.find((s) => s.codec_type === "video");
  if (!v?.width || !v.height) throw new Error("This file has no video.");
  const rotation = Math.abs(Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0)) % 180;
  const [width, height] = rotation === 90 ? [v.height, v.width] : [v.width, v.height];
  const seconds = Number(info.format?.duration ?? v.duration ?? 0);
  return {
    // Browser recordings (MediaRecorder WebM) carry no duration in their header: measure it instead.
    durationMs: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : await measureDurationMs(file),
    width,
    height,
    hasAudio: !!info.streams?.some((s) => s.codec_type === "audio"),
    videoCodec: v.codec_name ?? "unknown",
  };
}

/** Reads every packet once (no decoding) and takes the last timestamp FFmpeg reports. */
async function measureDurationMs(file: string) {
  const { stderr } = await run(FFMPEG, ["-hide_banner", "-nostdin", "-i", file, "-map", "0:v:0", "-c", "copy", "-f", "null", "-"], { timeoutMs: 120_000 });
  const times = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
  const last = times.at(-1);
  if (!last) return 0;
  return Math.round((Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3])) * 1000);
}

/** Total length of an HLS media playlist (sum of its segment durations). */
export async function playlistDurationMs(file: string) {
  const text = await readFile(file, "utf8");
  return Math.round([...text.matchAll(/#EXTINF:([\d.]+)/g)].reduce((s, m) => s + Number(m[1]), 0) * 1000);
}

/** Even dimensions for a target short side, keeping the aspect ratio of the source. */
function fit(width: number, height: number, shortSide: number) {
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const portrait = height >= width;
  const scale = shortSide / Math.min(width, height);
  return portrait ? { w: even(shortSide), h: even(height * scale) } : { w: even(width * scale), h: even(shortSide) };
}

/** The ladder rungs that make sense for this source (never upscale; tiny sources get one rung at their size). */
export function ladderFor(width: number, height: number) {
  const short = Math.min(width, height);
  const rungs = RENDITIONS.filter((r) => r.shortSide <= short + 8);
  return rungs.length ? rungs.map((r) => ({ ...r, ...fit(width, height, r.shortSide) })) : [{ ...RENDITIONS[0], ...fit(width, height, Math.min(short, 360)) }];
}

/**
 * Transcodes to an HLS ladder in `dir`: master.m3u8 plus <rung>/index.m3u8 with 4-second segments.
 * One FFmpeg pass decodes once and encodes every rung; key frames every 2s keep rungs aligned so players
 * can switch quality cleanly. Metadata (including GPS location) is stripped.
 */
export async function transcodeHls(input: string, dir: string, opts: { probe: Probe; startMs: number; durationMs: number }) {
  const { probe: p } = opts;
  const rungs = ladderFor(p.width, p.height);
  for (const r of rungs) await mkdir(path.join(dir, r.name), { recursive: true });

  const split = rungs.map((_, i) => `[s${i}]`).join("");
  const filter = [`[0:v]split=${rungs.length}${split}`, ...rungs.map((r, i) => `[s${i}]scale=${r.w}:${r.h}:flags=bicubic,setsar=1[v${i}]`)].join(";");

  const args = [
    "-hide_banner", "-y",
    "-ss", (opts.startMs / 1000).toFixed(3),
    "-i", input,
    "-t", (opts.durationMs / 1000).toFixed(3),
    "-filter_complex", filter,
  ];
  rungs.forEach((r, i) => {
    args.push("-map", `[v${i}]`);
    args.push(`-c:v:${i}`, "libx264", `-b:v:${i}`, String(r.videoBitrate), `-maxrate:v:${i}`, String(Math.round(r.videoBitrate * 1.1)), `-bufsize:v:${i}`, String(r.videoBitrate * 2));
    if (p.hasAudio) args.push("-map", "0:a:0", `-c:a:${i}`, "aac", `-b:a:${i}`, String(r.audioBitrate), `-ac:a:${i}`, "2");
  });
  args.push(
    "-preset", "veryfast", "-profile:v", "main", "-pix_fmt", "yuv420p",
    "-fpsmax", "60",
    "-force_key_frames", "expr:gte(t,n_forced*2)", "-sc_threshold", "0",
    "-map_metadata", "-1", "-map_chapters", "-1",
    "-threads", THREADS,
    "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
    "-hls_segment_type", "mpegts", "-hls_segment_filename", "%v/seg_%03d.ts",
    "-master_pl_name", "master.m3u8",
    "-var_stream_map", rungs.map((r, i) => (p.hasAudio ? `v:${i},a:${i},name:${r.name}` : `v:${i},name:${r.name}`)).join(" "),
    "%v/index.m3u8",
  );
  await run(FFMPEG, args, { cwd: dir });
  return rungs.map((r) => r.name);
}

/** A JPEG cover frame, 720 on its short side. */
export async function extractPoster(input: string, out: string, opts: { probe: Probe; atMs: number }) {
  const { w, h } = fit(opts.probe.width, opts.probe.height, Math.min(720, Math.min(opts.probe.width, opts.probe.height)));
  await run(FFMPEG, ["-hide_banner", "-y", "-ss", (opts.atMs / 1000).toFixed(3), "-i", input, "-frames:v", "1", "-vf", `scale=${w}:${h}`, "-q:v", "3", "-map_metadata", "-1", out], { timeoutMs: 60_000 });
}
