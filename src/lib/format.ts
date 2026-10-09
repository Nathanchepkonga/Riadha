export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const TZ = "Africa/Nairobi";

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-KE", { timeZone: TZ, ...opts }).format(new Date(d));
}

export function formatKickoff(d: Date) {
  return new Intl.DateTimeFormat("en-KE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-KE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export function timeAgo(d: Date, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d`;
  return formatDate(d, { day: "numeric", month: "short" });
}

/** "2d 4h" / "3h 12m" / "8m" until a date. */
export function countdown(to: Date, now = Date.now()) {
  const ms = to.getTime() - now;
  if (ms <= 0) return "Passed";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

/** Whether a moment has passed (kept here so pages don't call Date.now() during render). */
export function isPast(d: Date, now = Date.now()) {
  return d.getTime() < now;
}

export function ageFrom(dob: string | null | undefined, now = new Date()) {
  if (!dob) return null;
  const b = new Date(dob);
  let age = now.getFullYear() - b.getFullYear();
  const md = now.getMonth() - b.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function surname(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

export function compact(n: number) {
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
