"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

/** Data saver: the phone asked for it, the network is slow, or the athlete switched it on in Riadha. */
export function wantsDataSaver() {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  let pref = false;
  try {
    pref = localStorage.getItem("riadha-data-saver") === "1";
  } catch {
    /* storage blocked */
  }
  return pref || !!c?.saveData || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g";
}

type Props = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string;
  /** Attach the stream only when true (e.g. reels near the screen); otherwise just show the poster. */
  load?: boolean;
  /** On screen and playing: buffer more ahead. Off screen: keep just the first few seconds. */
  active?: boolean;
  ref?: React.Ref<HTMLVideoElement>;
};

/**
 * Plays our HLS clips (adaptive 360p–720p) and legacy MP4 files. Uses hls.js (loaded on demand) wherever
 * Media Source Extensions exist, and the built-in player on iPhones. In data-saver mode playback is
 * capped at the lowest quality.
 */
export function HlsVideo({ src, load = true, active = true, ref, ...rest }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ config: { maxBufferLength: number } } | null>(null);
  const [saverVersion, setSaverVersion] = useState(0);
  useImperativeHandle(ref, () => video.current as HTMLVideoElement, []);

  useEffect(() => {
    const refresh = () => setSaverVersion((v) => v + 1);
    window.addEventListener("riadha-data-saver-change", refresh);
    return () => window.removeEventListener("riadha-data-saver-change", refresh);
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el || !load) return;
    const isHls = src.includes(".m3u8");
    const saver = wantsDataSaver();
    const hasMse = typeof window !== "undefined" && ("MediaSource" in window || "ManagedMediaSource" in window);
    const native = isHls && el.canPlayType("application/vnd.apple.mpegurl") !== "" && !("MediaSource" in window);

    if (!isHls || native) {
      // iPhone: native HLS handles quality itself; in data-saver mode point it straight at the 360p rung.
      el.src = isHls && saver ? src.replace("master.m3u8", "360p/index.m3u8") : src;
      return () => {
        el.removeAttribute("src");
        el.load();
      };
    }
    if (!hasMse) {
      el.src = src;
      return;
    }

    let cancelled = false;
    let destroy = () => {};
    import("hls.js/light").then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) {
        el.src = src;
        return;
      }
      const hls = new Hls({
        capLevelToPlayerSize: true,
        startLevel: saver ? 0 : -1,
        maxBufferLength: active ? 12 : 4,
        maxMaxBufferLength: 30,
        backBufferLength: 8,
      });
      if (saver) hls.autoLevelCapping = 0;
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else hls.destroy();
      });
      hls.loadSource(src);
      hls.attachMedia(el);
      hlsRef.current = hls;
      destroy = () => hls.destroy();
    });
    return () => {
      cancelled = true;
      hlsRef.current = null;
      destroy();
    };
    // `active` is applied below without re-creating the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, load, saverVersion]);

  useEffect(() => {
    if (hlsRef.current) hlsRef.current.config.maxBufferLength = active ? 12 : 4;
  }, [active]);

  return <video ref={video} {...rest} />;
}
