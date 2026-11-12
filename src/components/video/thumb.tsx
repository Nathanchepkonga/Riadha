import { StatBackdrop } from "@/components/sport/cards";

/**
 * A still for a video post: the processed poster, or (for older MP4 uploads) the frame at 0.5s. HLS clips
 * without a poster yet fall back to the brand backdrop.
 */
export function VideoThumb({ src, poster, seed = 0, className = "absolute inset-0 h-full w-full object-cover" }: { src: string; poster?: string | null; seed?: number; className?: string }) {
  if (poster) {
    // eslint-disable-next-line @next/next/no-img-element -- generated poster served from /media
    return <img src={poster} alt="" loading="lazy" className={className} />;
  }
  if (src.includes(".m3u8")) return <StatBackdrop seed={seed} />;
  return <video src={`${src}#t=0.5`} className={className} muted playsInline preload="metadata" />;
}
