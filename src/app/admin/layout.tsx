import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { TopBar } from "@/components/shell/top-bar";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/gameweeks", label: "Gameweeks & stats" },
  { href: "/admin/players", label: "Players" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <TopBar user={{ handle: user.handle, isAdmin: true }} />
      <div className="mx-auto max-w-[760px] px-4 pb-[calc(6rem+var(--sab))] pt-4">
        <p className="kicker">Admin console</p>
        <nav className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold hover:border-gray-400">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-5">{children}</div>
      </div>
    </>
  );
}
