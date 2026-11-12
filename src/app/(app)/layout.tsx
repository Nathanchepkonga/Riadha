import { requireUser } from "@/lib/auth/session";
import { canScout } from "@/lib/roles";
import { PageTransition } from "@/components/motion/page-transition";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";
import { UploadPill } from "@/components/video/upload-pill";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-[60] rounded-lg bg-green px-4 py-2 font-semibold text-navy shadow-lg focus:not-sr-only focus:outline-2 focus:outline-offset-2 focus:outline-cobalt"
      >
        Skip to content
      </a>
      <TopBar user={{ handle: user.handle, isAdmin: user.isAdmin, canScout: canScout(user) }} />
      <main id="main-content" tabIndex={-1} className="pb-tabbar mx-auto min-h-[calc(100dvh-4rem)] max-w-[480px]">
        <PageTransition>{children}</PageTransition>
      </main>
      <UploadPill />
      <TabBar handle={user.handle} />
    </>
  );
}
