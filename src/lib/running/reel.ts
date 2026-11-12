"use client";

import type { RouteArt } from "@/db/schema";
import { LOCKUPS, MARK_D, WORD_D } from "@/components/brand/logo-art";

/*
 * Run Reels: a 9:16 video made on the phone from a run (or a finished challenge). Every frame is drawn on
 * a canvas and encoded to H.264 with WebCodecs (Mediabunny, loaded on demand), then uploaded through the
 * normal video pipeline so it plays in Watch. Scenes: intro → the route drawing itself while the distance
 * counts up → splits → the runner's own clips → outro with the logo. Silent by design.
 */

export type ReelInput = {
  kind: "run" | "medal";
  title: string;
  kicker: string;
  name: string;
  date: string;
  distanceM: number;
  movingS: number;
  elevationGainM: number;
  /** Headline pace or speed, e.g. ["4:31", "/km"]. */
  pace: [string, string];
  splits: number[];
  profilePace: number[];
  art: RouteArt | null;
  medal?: { goalM: number; accent: string; time: string | null };
  clips: File[];
};

const W = 720;
const H = 1280;
const FPS = 30;
const NAVY = "#081018";
const NAVY_2 = "#111C28";
const GREEN = "#B7F34A";
const COBALT = "#3867FF";
const SLANT = Math.tan((37.57 * Math.PI) / 180);

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
const easeBack = (t: number) => {
  const c = 1.7;
  const x = clamp(t) - 1;
  return 1 + (c + 1) * x ** 3 + c * x ** 2;
};

export async function canMakeReels() {
  if (typeof window === "undefined" || !("VideoEncoder" in window)) return false;
  try {
    const { canEncodeVideo } = await import("mediabunny");
    return await canEncodeVideo("avc", { width: W, height: H });
  } catch {
    return false;
  }
}

const fmtKm = (m: number) => (m / 1000 < 10 ? (m / 1000).toFixed(2) : (m / 1000).toFixed(1));
function fmtDuration(s: number) {
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** A parallelogram leaning forward on the brand diagonal. */
function slab(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x + h * SLANT, y);
  ctx.lineTo(x + h * SLANT + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function background(ctx: CanvasRenderingContext2D, sweep: number) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, W);
  g.addColorStop(0, "rgba(56,103,255,0.28)");
  g.addColorStop(1, "rgba(56,103,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = COBALT;
  slab(ctx, -H * SLANT + W * 0.55 + sweep * 120, 0, 150, H);
  ctx.fill();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = GREEN;
  slab(ctx, -H * SLANT + W * 0.55 + 210 + sweep * 160, 0, 26, H);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function text(ctx: CanvasRenderingContext2D, font: string, s: string, x: number, y: number, o: { size: number; weight?: number; color?: string; align?: CanvasTextAlign; alpha?: number; spacing?: number; maxWidth?: number }) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.font = `${o.weight ?? 700} ${o.size}px ${font}`;
  ctx.fillStyle = o.color ?? "#FFFFFF";
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${o.spacing ?? 0}px`;
  ctx.fillText(s, x, y, o.maxWidth);
  ctx.restore();
}

/** Splits a title over at most two lines that fit `max` pixels. */
function wrap(ctx: CanvasRenderingContext2D, font: string, size: number, s: string, max: number) {
  ctx.font = `700 ${size}px ${font}`;
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

/** The official compact lockup (mark + wordmark, reversed colours), drawn from the kit outlines. */
function logo(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number, alpha: number) {
  const lock = LOCKUPS.horizontal;
  const vw = 1374.46;
  const k = width / vw;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx - width / 2, y);
  ctx.scale(k, k);
  if (lock.mark) {
    ctx.save();
    ctx.translate(lock.mark[0], lock.mark[1]);
    ctx.scale(lock.mark[2], lock.mark[2]);
    const g = ctx.createLinearGradient(0, 407.5, 519, 0);
    g.addColorStop(0, "#8DD63A");
    g.addColorStop(1, GREEN);
    ctx.fillStyle = g;
    ctx.fill(new Path2D(MARK_D));
    ctx.restore();
  }
  if (lock.word) {
    ctx.save();
    ctx.translate(lock.word[0], lock.word[1]);
    ctx.scale(lock.word[2], lock.word[2]);
    ctx.translate(-19.8, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill(new Path2D(WORD_D));
    ctx.restore();
  }
  ctx.restore();
}

/** Route points scaled into a box, with cumulative lengths for drawing it progressively. */
function layoutRoute(art: RouteArt, box: { x: number; y: number; w: number; h: number }) {
  const [vw, vh] = art.v;
  const k = Math.min(box.w / vw, box.h / vh);
  const ox = box.x + (box.w - vw * k) / 2;
  const oy = box.y + (box.h - vh * k) / 2;
  const segs = art.s.map((flat) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([ox + flat[i] * k, oy + flat[i + 1] * k]);
    return pts;
  });
  let total = 0;
  for (const s of segs) for (let i = 1; i < s.length; i++) total += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  return { segs, total };
}

function drawRoute(ctx: CanvasRenderingContext2D, route: ReturnType<typeof layoutRoute>, frac: number) {
  let budget = route.total * frac;
  let head: [number, number] | null = null;
  const paths: Path2D[] = [];
  for (const s of route.segs) {
    if (budget <= 0) break;
    const p = new Path2D();
    p.moveTo(s[0][0], s[0][1]);
    head = s[0];
    for (let i = 1; i < s.length && budget > 0; i++) {
      const len = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
      if (len <= budget) {
        p.lineTo(s[i][0], s[i][1]);
        head = s[i];
        budget -= len;
      } else {
        const f = budget / len;
        head = [s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f];
        p.lineTo(head[0], head[1]);
        budget = 0;
      }
    }
    paths.push(p);
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = GREEN;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 30;
  paths.forEach((p) => ctx.stroke(p));
  ctx.globalAlpha = 1;
  ctx.lineWidth = 11;
  paths.forEach((p) => ctx.stroke(p));
  if (head && frac < 1) {
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(head[0], head[1], 13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Pace profile as a line (faster = higher), for runs without route art. */
function drawProfile(ctx: CanvasRenderingContext2D, pace: number[], box: { x: number; y: number; w: number; h: number }, frac: number) {
  if (pace.length < 2) return;
  const lo = Math.min(...pace);
  const hi = Math.max(...pace);
  const span = Math.max(hi - lo, 20);
  const n = Math.max(2, Math.round(pace.length * frac));
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = box.x + (i / (pace.length - 1)) * box.w;
    const y = box.y + ((pace[i] - lo) / span) * box.h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function drawMedal(ctx: CanvasRenderingContext2D, font: string, m: NonNullable<ReelInput["medal"]>, cx: number, cy: number, scale: number, rot: number) {
  const fills: Record<string, [string, string, string]> = { green: [GREEN, NAVY, NAVY], cobalt: [COBALT, "#FFFFFF", GREEN], navy: [NAVY_2, "#FFFFFF", GREEN] };
  const [fill, ink, edge] = fills[m.accent] ?? fills.green;
  const h = 120 * 2.6;
  const s = h * SLANT;
  const w = 120 * 2.6;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  slab(ctx, -(w + s) / 2, -h / 2, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = edge;
  ctx.stroke();
  const k = m.goalM / 1000;
  const label = `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  text(ctx, font, label, 0, 46, { size: label.length > 4 ? 110 : 140, weight: 800, color: ink, align: "center", spacing: -4 });
  ctx.restore();
}

type Media = { kind: "video"; frames: AsyncGenerator<{ canvas: HTMLCanvasElement | OffscreenCanvas } | null>; dispose: () => void } | { kind: "image"; bitmap: ImageBitmap };

const CLIP_S = 2.4;

async function openMedia(file: File): Promise<Media | null> {
  try {
    if (file.type.startsWith("image/")) return { kind: "image", bitmap: await createImageBitmap(file) };
    const mb = await import("mediabunny");
    const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    const duration = await input.computeDuration();
    const start = duration > CLIP_S + 1 ? Math.min(1, duration - CLIP_S) : 0;
    const sink = new mb.CanvasSink(track, { width: W, height: H, fit: "cover", poolSize: 2 });
    const times = Array.from({ length: Math.round(CLIP_S * FPS) }, (_, i) => Math.min(duration - 0.05, start + i / FPS));
    return { kind: "video", frames: sink.canvasesAtTimestamps(times), dispose: () => input.dispose?.() };
  } catch {
    return null;
  }
}

function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, zoom: number) {
  const k = Math.max(W / img.width, H / img.height) * zoom;
  const w = img.width * k;
  const h = img.height * k;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

/**
 * Renders the reel. Returns the MP4, plus a small cover image for the upload pill and the frame time to
 * use as the poster.
 */
export async function renderReel(input: ReelInput, opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {}) {
  const mb = await import("mediabunny");
  await document.fonts?.ready;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const media = (await Promise.all(input.clips.slice(0, 3).map(openMedia))).filter((m): m is Media => !!m);
  const route = input.art ? layoutRoute(input.art, { x: 70, y: 250, w: 580, h: 600 }) : null;
  const splits = input.splits.slice(0, 12);
  const scenes: { name: string; s: number; media?: Media }[] = [
    { name: "intro", s: 1.6 },
    ...(input.kind === "medal" ? [{ name: "medal", s: 3 }] : [{ name: "route", s: 4.4 }]),
    ...(input.kind === "run" && splits.length >= 2 ? [{ name: "splits", s: 2.6 }] : []),
    ...media.map((m) => ({ name: "clip", s: CLIP_S, media: m })),
    { name: "outro", s: 2 },
  ];
  const total = scenes.reduce((a, sc) => a + Math.round(sc.s * FPS), 0);
  const coverAt = Math.round((scenes[0].s + scenes[1].s - 0.1) * FPS);
  let coverDataUrl: string | null = null;

  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
  const source = new mb.CanvasSource(canvas, { codec: "avc", bitrate: 3_500_000, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: FPS });
  await output.start();

  const fastest = splits.length ? Math.min(...splits) : 0;
  const slowest = splits.length ? Math.max(...splits) : 0;
  let frame = 0;
  try {
    for (const sc of scenes) {
      const n = Math.round(sc.s * FPS);
      for (let i = 0; i < n; i++, frame++) {
        if (opts.signal?.aborted) throw new DOMException("Canceled", "AbortError");
        const p = i / (n - 1 || 1);
        const t = i / FPS;
        if (sc.name === "clip" && sc.media) {
          ctx.fillStyle = NAVY;
          ctx.fillRect(0, 0, W, H);
          if (sc.media.kind === "image") cover(ctx, sc.media.bitmap, 1.04 + 0.08 * p);
          else {
            const next = await sc.media.frames.next();
            const c = next.value?.canvas;
            if (c) ctx.drawImage(c as CanvasImageSource, 0, 0, W, H);
          }
          const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
          g.addColorStop(0, "rgba(8,16,24,0)");
          g.addColorStop(1, "rgba(8,16,24,0.85)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = GREEN;
          slab(ctx, 48, 1090, 360, 74);
          ctx.fill();
          text(ctx, font, `${fmtKm(input.distanceM)} km · ${input.pace[0]}${input.pace[1]}`, 48 + 74 * SLANT * 0.55, 1140, { size: 34, color: NAVY, weight: 800 });
        } else {
          background(ctx, sc.name === "intro" ? easeOut(p) : 1);
          if (sc.name === "intro") {
            const a = easeOut(p * 1.6);
            text(ctx, font, input.kicker.toUpperCase(), 64, 460 - 30 * (1 - a), { size: 26, color: GREEN, spacing: 5, alpha: a, weight: 700 });
            const lines = wrap(ctx, font, 76, input.title, W - 128);
            lines.forEach((l, k) => {
              const b = easeOut(p * 1.6 - 0.15 - k * 0.1);
              text(ctx, font, l, 64, 560 + k * 86 + 40 * (1 - b), { size: 76, alpha: b, spacing: -2 });
            });
            text(ctx, font, `${input.name} · ${input.date}`, 64, 560 + lines.length * 86 + 20, { size: 30, alpha: easeOut(p * 1.6 - 0.4) * 0.7, weight: 600 });
          } else if (sc.name === "route") {
            text(ctx, font, input.kicker.toUpperCase(), 64, 150, { size: 24, color: GREEN, spacing: 5 });
            text(ctx, font, input.title, 64, 200, { size: 40, maxWidth: W - 128 });
            if (route) drawRoute(ctx, route, easeOut(p * 1.25));
            else drawProfile(ctx, input.profilePace, { x: 70, y: 380, w: 580, h: 340 }, easeOut(p * 1.25));
            const shown = input.distanceM * easeOut(p * 1.2);
            text(ctx, font, fmtKm(shown), 64, 1050, { size: 190, spacing: -10 });
            ctx.font = `700 190px ${font}`;
            const wd = ctx.measureText(fmtKm(input.distanceM)).width;
            text(ctx, font, "KM", 64 + wd - 10 * fmtKm(input.distanceM).length + 24, 1050, { size: 44, alpha: 0.6 });
            const b = easeOut((p - 0.45) * 2.5);
            const row = [`${input.pace[0]}${input.pace[1]}`, fmtDuration(input.movingS), input.elevationGainM ? `↑ ${input.elevationGainM} m` : ""].filter(Boolean);
            row.forEach((r, k) => text(ctx, font, r, 64 + k * 220, 1140 + 20 * (1 - b), { size: 40, alpha: b, weight: 700 }));
          } else if (sc.name === "splits") {
            text(ctx, font, "SPLITS", 64, 190, { size: 26, color: GREEN, spacing: 6 });
            const rowH = Math.min(70, 760 / splits.length);
            splits.forEach((s, k) => {
              const b = easeOut(p * 2.2 - k * 0.08);
              const y = 260 + k * rowH;
              const w = slowest === fastest ? 300 : 120 + (240 * (slowest - s)) / (slowest - fastest);
              text(ctx, font, String(k + 1), 64, y + rowH * 0.62, { size: 30, alpha: b, weight: 700 });
              text(ctx, font, fmtDuration(s), 130, y + rowH * 0.62, { size: 30, alpha: b, weight: 600 });
              ctx.globalAlpha = b;
              ctx.fillStyle = s === fastest ? GREEN : "rgba(255,255,255,0.28)";
              slab(ctx, 270, y + rowH * 0.2, w * b, rowH * 0.5);
              ctx.fill();
              ctx.globalAlpha = 1;
            });
            text(ctx, font, `Fastest km ${fmtDuration(fastest)}`, 64, 1130, { size: 40, alpha: easeOut(p * 2 - 0.6) });
          } else if (sc.name === "medal" && input.medal) {
            text(ctx, font, "CHALLENGE FINISHED", W / 2, 230, { size: 28, color: GREEN, spacing: 6, align: "center", alpha: easeOut(p * 3) });
            const k = easeBack(p * 1.6);
            drawMedal(ctx, font, input.medal, W / 2, 620, 0.25 + 0.75 * k, (1 - easeOut(p * 1.6)) * -0.35);
            for (let c = 0; c < 26; c++) {
              const cx = ((c * 137) % W) + Math.sin(t * 3 + c) * 18;
              const cy = -40 + ((t * (280 + (c % 5) * 60) + c * 47) % (H + 80));
              ctx.save();
              ctx.globalAlpha = clamp(p * 3) * 0.9;
              ctx.fillStyle = c % 3 ? GREEN : c % 2 ? COBALT : "#FFFFFF";
              ctx.translate(cx, cy);
              ctx.rotate(t * 4 + c);
              ctx.fillRect(-7, -12, 14, 24);
              ctx.restore();
            }
            const b = easeOut((p - 0.5) * 2.5);
            text(ctx, font, input.medal.time ?? `${fmtKm(input.distanceM)} km`, W / 2, 1010 + 20 * (1 - b), { size: 64, align: "center", alpha: b });
            text(ctx, font, input.date, W / 2, 1080, { size: 30, align: "center", alpha: b * 0.7, weight: 600 });
          } else if (sc.name === "outro") {
            const a = easeOut(p * 1.8);
            const big = input.kind === "medal" ? `${Number((input.distanceM / 1000).toFixed(1))} KM` : `${fmtKm(input.distanceM)} KM`;
            text(ctx, font, big, W / 2, 600 + 30 * (1 - a), { size: 130, align: "center", alpha: a, spacing: -6 });
            text(ctx, font, input.title, W / 2, 680, { size: 36, align: "center", alpha: a * 0.75, maxWidth: W - 120, weight: 600 });
            logo(ctx, W / 2, 900, 360, easeOut(p * 1.8 - 0.35));
          }
        }
        if (frame === coverAt) {
          const small = document.createElement("canvas");
          small.width = 180;
          small.height = 320;
          small.getContext("2d")!.drawImage(canvas, 0, 0, 180, 320);
          coverDataUrl = small.toDataURL("image/jpeg", 0.7);
        }
        await source.add(frame / FPS, 1 / FPS);
        opts.onProgress?.(frame / total);
      }
    }
    await output.finalize();
  } finally {
    for (const m of media) if (m.kind === "video") m.dispose();
  }
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("The reel couldn't be encoded.");
  return { file: new File([buffer], `riadha-reel-${Date.now()}.mp4`, { type: "video/mp4" }), coverDataUrl, coverMs: Math.round((coverAt / FPS) * 1000) };
}
