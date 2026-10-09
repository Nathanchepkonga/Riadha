import { requireUser } from "@/lib/auth/session";
import { TabBar } from "@/components/shell/tab-bar";

/** Full-screen surfaces (the Watch reels): no app bar, just the dock. */
export default async function ImmersiveLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <main>{children}</main>
      <TabBar handle={user.handle} />
    </>
  );
}
