import { Toaster } from "@/components/ui/sonner";
import { isAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/session";

import { BottomNav } from "./_components/bottom-nav";
import { TopBar } from "./_components/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const admin = isAdmin(session.user.email);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav admin={admin} />
      <Toaster />
    </div>
  );
}
