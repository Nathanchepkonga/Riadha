import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

/* Navigation pieces from the UI kit screens: category chips, underline tabs, segmented switch,
   section headers with "View all", tags, and settings-style list rows. Link-based so they work
   without client JS. */

export type NavItem = { href: string; label: React.ReactNode; active?: boolean; icon?: React.ReactNode };

/** Category chips (the kit's Trending / Football / Basketball row). Active chip is solid navy. */
export function ChipRow({ items, className, label }: { items: NavItem[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4", className)}>
      {items.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          aria-current={c.active ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
            c.active ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink hover:border-gray-400",
          )}
        >
          {c.icon}
          {c.label}
        </Link>
      ))}
    </nav>
  );
}

/** Underline tabs (Upcoming / Past matches; Overview / Stats / Line-ups). */
export function TabBarLinks({ items, className, label }: { items: NavItem[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={cn("flex gap-6 border-b border-line", className)}>
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn("relative -mb-px pb-3 pt-1 text-[14px] font-semibold transition-colors", t.active ? "text-ink" : "text-muted hover:text-ink")}
        >
          {t.label}
          {t.active && <span className="absolute inset-x-0 bottom-0 h-[3px] -skew-x-[14deg] rounded-sm bg-green" />}
        </Link>
      ))}
    </nav>
  );
}

/** Two-to-four option segmented switch (the kit's team toggle under match stats). */
export function Segmented({ items, className, dark }: { items: NavItem[]; className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex gap-1 rounded-xl p-1", dark ? "bg-navy-2" : "bg-gray-200", className)}>
      {items.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          scroll={false}
          aria-current={s.active ? "true" : undefined}
          className={cn(
            "flex h-9 flex-1 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors",
            s.active ? (dark ? "bg-green text-navy" : "bg-navy text-white") : dark ? "text-white/70 hover:text-white" : "text-muted hover:text-ink",
          )}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export function SectionHeader({ title, href, action = "View all", className }: { title: React.ReactNode; href?: string; action?: string; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <h2 className="h5">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-cobalt hover:underline">
          {action} <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}

const TAG: Record<string, string> = {
  green: "bg-green text-navy",
  navy: "bg-navy text-white",
  cobalt: "bg-cobalt text-white",
  gray: "bg-gray-200 text-ink",
  glass: "bg-white/15 text-white backdrop-blur",
};

/** Small label ("Top news", "Highlights", "Live"). */
export function Tag({ children, tone = "green", icon, className }: { children: React.ReactNode; tone?: keyof typeof TAG; icon?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em]", TAG[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function LiveTag({ className }: { className?: string }) {
  return (
    <Tag tone="navy" className={className} icon={<span className="animate-live h-1.5 w-1.5 rounded-full bg-green" />}>
      Live
    </Tag>
  );
}

/** Settings-style list row (the kit's "App info ›" rows). */
export function ListRow({ href, icon, label, hint, danger }: { href: string; icon?: React.ReactNode; label: React.ReactNode; hint?: React.ReactNode; danger?: boolean }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-100">
      {icon && <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", danger ? "bg-danger/10 text-danger" : "bg-gray-100 text-ink")}>{icon}</span>}
      <span className={cn("flex-1 text-[15px] font-semibold", danger && "text-danger")}>{label}</span>
      {hint && <span className="max-w-[45%] truncate text-[13px] text-muted">{hint}</span>}
      <ChevronRight size={17} className="shrink-0 text-subtle" />
    </Link>
  );
}

/** Empty state card. */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <p className="h5">{title}</p>
      {body && <p className="mt-1.5 max-w-[34ch] text-[14px] text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
