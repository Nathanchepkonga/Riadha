"use client";

import { useEffect, useRef, useState } from "react";
import { HlsVideo } from "./player";

/**
 * A clip inside a scrolling page (feed card, post page). It only starts streaming when it's near the
 * screen, plays muted while mostly visible and pauses when scrolled away, like TikTok's in-feed videos.
 */
export function InlineVideo({ src, poster, className, autoPlay = true }: { src: string; poster?: string | null; className?: string; autoPlay?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px 0px" });
    const seeIo = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio >= 0.6), { threshold: [0, 0.6, 1] });
    nearIo.observe(el);
    seeIo.observe(el);
    return () => {
      nearIo.disconnect();
      seeIo.disconnect();
    };
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v || !autoPlay) return;
    if (visible && near) v.play().catch(() => {});
    else v.pause();
  }, [visible, near, autoPlay]);

  return (
    <div ref={box} className={className}>
      <HlsVideo ref={video} src={src} poster={poster ?? undefined} load={near} active={visible} className="absolute inset-0 h-full w-full object-cover" controls playsInline muted loop preload="none" />
    </div>
  );
}
