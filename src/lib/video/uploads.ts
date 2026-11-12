"use client";

import { useSyncExternalStore } from "react";
import { createVideoPost, type VideoPostDraft } from "@/actions/social";
import { VIDEO, type VideoState } from "./config";
import { compressVideo } from "./compress";

/*
 * The upload manager: a module-level singleton, so an upload keeps going while the athlete moves around
 * the app (TikTok-style: post, carry on scrolling, see a progress pill). Each job:
 *   compress on the phone (if possible) → create the video → send 4MB chunks with retries and resume →
 *   mark complete with the edit → create the post → poll until the server has processed it.
 */

export type UploadPhase = "compressing" | "uploading" | "offline" | "finishing" | "processing" | "ready" | "failed" | "canceled";

export type UploadJob = {
  key: string;
  phase: UploadPhase;
  /** 0–1 within the current phase. */
  progress: number;
  coverDataUrl: string | null;
  videoId: string | null;
  postId: number | null;
  /** True once the athlete tapped Post (the clip can finish processing before that). */
  posted: boolean;
  error: string | null;
};

export type VideoEdits = { trimStartMs: number | null; trimEndMs: number | null; coverMs: number | null };

type Internal = { job: UploadJob; file: File; edits: VideoEdits; ctrl: AbortController; draft: VideoPostDraft | null; posted: VideoPostDraft | null; waiters: ((id: string) => void)[] };

const jobs = new Map<string, Internal>();
const listeners = new Set<() => void>();
let snapshot: UploadJob[] = [];

function emit() {
  snapshot = [...jobs.values()].map((j) => j.job);
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") window.onbeforeunload = snapshot.some((j) => isActive(j.phase)) ? (e) => e.preventDefault() : null;
}
function set(it: Internal, patch: Partial<UploadJob>) {
  it.job = { ...it.job, ...patch };
  emit();
}
export const isActive = (p: UploadPhase) => p === "compressing" || p === "uploading" || p === "offline" || p === "finishing";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Canceled", "AbortError"));
    }, { once: true });
  });

const waitOnline = (signal: AbortSignal) =>
  navigator.onLine
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const on = () => {
          window.removeEventListener("online", on);
          resolve();
        };
        window.addEventListener("online", on);
        signal.addEventListener("abort", on, { once: true });
      });

async function json<T>(url: string, init: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(r.status, (data as { error?: string }).error ?? `Upload failed (${r.status}).`);
  return data as T;
}

/** PUT one chunk with XHR, for byte-level progress (fetch can't report upload progress). */
function putChunk(url: string, chunk: Blob, offset: number, onProgress: (sent: number) => void, signal: AbortSignal) {
  return new Promise<{ status: number; body: VideoState & { error?: string } }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Upload-Offset", String(offset));
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      let body = {} as VideoState & { error?: string };
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* empty body */
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.ontimeout = () => reject(new Error("Timed out"));
    xhr.timeout = 120_000;
    signal.addEventListener("abort", () => {
      xhr.abort();
      reject(new DOMException("Canceled", "AbortError"));
    }, { once: true });
    xhr.send(chunk);
  });
}

const EXT_TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", "3gp": "video/3gpp" };
const typeOf = (f: File) => f.type || EXT_TYPES[f.name.split(".").pop()?.toLowerCase() ?? ""] || "video/mp4";

async function run(it: Internal) {
  const { signal } = it.ctrl;
  let file = it.file;
  let edits = it.edits;
  let compressed = false;

  // 1. Compress on the phone (falls back to the original on any problem).
  set(it, { phase: "compressing", progress: 0 });
  try {
    const out = await compressVideo(file, { name: file.name, trimStartMs: edits.trimStartMs, trimEndMs: edits.trimEndMs, signal, onProgress: (p) => set(it, { progress: p }) });
    if (out) {
      file = out.file;
      compressed = true;
      // The trim is baked in now, so the cover time moves with it.
      if (out.trimmed) edits = { trimStartMs: null, trimEndMs: null, coverMs: edits.coverMs != null ? Math.max(0, edits.coverMs - (edits.trimStartMs ?? 0)) : null };
    }
  } catch (e) {
    if (signal.aborted) throw e;
    console.warn("[upload] compression skipped:", e);
  }

  // 2. Create the video.
  set(it, { phase: "uploading", progress: 0 });
  const created = await json<VideoState & { chunkBytes: number }>("/api/videos", {
    method: "POST",
    body: JSON.stringify({ name: file.name, type: typeOf(file), size: file.size, clientCompressed: compressed }),
    signal,
  });
  const id = created.id;
  set(it, { videoId: id });
  it.waiters.splice(0).forEach((w) => w(id));
  if (it.draft) void attach(it);

  // 3. Chunks, resuming from whatever the server has.
  let offset = created.receivedBytes;
  let failures = 0;
  while (offset < file.size) {
    const end = Math.min(offset + created.chunkBytes, file.size);
    try {
      const r = await putChunk(`/api/videos/${id}`, file.slice(offset, end), offset, (sent) => set(it, { phase: "uploading", progress: Math.min(1, (offset + sent) / file.size) }), signal);
      if (r.status === 409 && typeof r.body.receivedBytes === "number") offset = r.body.receivedBytes; // resync
      else if (r.status >= 400) throw new HttpError(r.status, r.body.error ?? `Upload failed (${r.status}).`);
      else offset = r.body.receivedBytes;
      failures = 0;
      set(it, { phase: "uploading", progress: offset / file.size });
    } catch (e) {
      if (signal.aborted) throw e;
      if (e instanceof HttpError && e.status < 500 && e.status !== 408 && e.status !== 429) throw e;
      failures++;
      if (!navigator.onLine) {
        set(it, { phase: "offline" });
        await waitOnline(signal);
      } else {
        await sleep(Math.min(30_000, 1000 * 2 ** Math.min(failures, 5)) * (0.75 + Math.random() / 2), signal);
      }
      // Ask the server where to continue from (the last chunk may have landed).
      const state = await json<VideoState>(`/api/videos/${id}`, { method: "GET", signal }).catch(() => null);
      if (state) offset = state.receivedBytes;
      if (failures > 12) throw new Error("The connection keeps dropping. Try again on a better network.");
    }
  }

  // 4. Hand over the edit and queue processing.
  set(it, { phase: "finishing", progress: 1 });
  await json(`/api/videos/${id}/complete`, { method: "POST", body: JSON.stringify(edits), signal });
  set(it, { phase: "processing", progress: 0 });

  // 5. Wait for the server (polls; processing is usually seconds).
  const started = Date.now();
  while (Date.now() - started < 20 * 60_000) {
    await sleep(2500, signal);
    const state = await json<VideoState>(`/api/videos/${id}`, { method: "GET", signal }).catch(() => null);
    if (state?.status === "ready") return set(it, { phase: "ready", progress: 1 });
    if (state?.status === "failed") throw new Error(state.error ?? "We couldn't process this clip.");
  }
}

async function attach(it: Internal) {
  if (!it.draft || !it.job.videoId || it.job.postId) return;
  const draft = it.draft;
  it.draft = null;
  const res = await createVideoPost({ ...draft, videoId: it.job.videoId }).catch(() => ({ error: "Couldn't create the post." }));
  if ("error" in res) set(it, { phase: "failed", error: res.error });
  else set(it, { postId: res.postId });
}

export const uploads = {
  /** Starts uploading a clip right away (before the caption is written, like TikTok). Returns its key. */
  start(file: File, edits: VideoEdits, coverDataUrl: string | null) {
    const key = crypto.randomUUID();
    const it: Internal = { job: { key, phase: "compressing", progress: 0, coverDataUrl, videoId: null, postId: null, posted: false, error: null }, file, edits, ctrl: new AbortController(), draft: null, posted: null, waiters: [] };
    jobs.set(key, it);
    emit();
    run(it).catch((e: Error) => {
      if (it.ctrl.signal.aborted) return;
      set(it, { phase: "failed", error: e.message || "Upload failed." });
    });
    return key;
  },
  /** Attaches the caption/stat to the upload; the post is created as soon as the video exists. */
  post(key: string, draft: VideoPostDraft) {
    const it = jobs.get(key);
    if (!it) return;
    it.draft = draft;
    it.posted = draft;
    set(it, { posted: true });
    void attach(it);
  },
  /** Starts a failed upload again from the beginning, keeping the caption. */
  async retry(key: string) {
    const it = jobs.get(key);
    if (!it) return;
    await uploads.cancel(key);
    const next = uploads.start(it.file, it.edits, it.job.coverDataUrl);
    if (it.posted) uploads.post(next, it.posted);
  },
  async cancel(key: string) {
    const it = jobs.get(key);
    if (!it) return;
    it.ctrl.abort();
    jobs.delete(key);
    emit();
    if (it.job.videoId) await fetch(`/api/videos/${it.job.videoId}`, { method: "DELETE" }).catch(() => {});
  },
  dismiss(key: string) {
    jobs.delete(key);
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => snapshot,
};

const EMPTY: UploadJob[] = [];
export function useUploads() {
  return useSyncExternalStore(uploads.subscribe, uploads.getSnapshot, () => EMPTY);
}

export const MAX_CLIP_SECONDS = VIDEO.maxSeconds;
