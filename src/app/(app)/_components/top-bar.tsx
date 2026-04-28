import { SignOutButton } from "./sign-out-button";
import { SyncBadge } from "./sync-badge";

export function TopBar({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <div className="text-sm font-semibold">Sunday Fun Day</div>
        <div className="flex items-center gap-3">
          <SyncBadge />
          <div className="text-right text-xs leading-tight">
            <div className="font-medium">{userName}</div>
            <div className="text-muted-foreground">{userEmail}</div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
