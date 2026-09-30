import { requireUser } from "@/lib/auth/session";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <TopBar user={{ handle: user.handle, isAdmin: user.isAdmin }} />
      <main className="pb-tabbar mx-auto min-h-[calc(100dvh-4rem)] max-w-[480px]">{children}</main>
      <TabBar handle={user.handle} />
    </>
  );
}
