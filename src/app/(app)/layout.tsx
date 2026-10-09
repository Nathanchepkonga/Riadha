import { requireUser } from "@/lib/auth/session";
import { canScout } from "@/lib/roles";
import { PageTransition } from "@/components/motion/page-transition";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <TopBar user={{ handle: user.handle, isAdmin: user.isAdmin, canScout: canScout(user) }} />
      <main className="pb-tabbar mx-auto min-h-[calc(100dvh-4rem)] max-w-[480px]">
        <PageTransition>{children}</PageTransition>
      </main>
      <TabBar handle={user.handle} />
    </>
  );
}
