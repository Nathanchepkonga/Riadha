import { cn, initials } from "@/lib/format";

// Brand-only fills for people without a photo.
const GRADIENTS = [
  "linear-gradient(135deg,#081018,#1e2a38)",
  "linear-gradient(135deg,#3867FF,#2a54e0)",
  "linear-gradient(135deg,#6B7280,#081018)",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, url, size = 40, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: url ? "#E5E7EB" : GRADIENTS[hash(name) % GRADIENTS.length], fontSize: size * 0.38 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
