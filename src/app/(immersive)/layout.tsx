import { requireUser } from "@/lib/auth/session";
import { TabBar } from "@/components/shell/tab-bar";
import { UploadPill } from "@/components/video/upload-pill";

/** Full-screen surfaces (the Watch reels): no app bar, just the dock. */
export default async function ImmersiveLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-[60] rounded-lg bg-green px-4 py-2 font-semibold text-navy shadow-lg focus:not-sr-only focus:outline-2 focus:outline-offset-2 focus:outline-cobalt"
      >
        Skip to content
      </a>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <UploadPill />
      <TabBar handle={user.handle} />
    </>
  );
}
