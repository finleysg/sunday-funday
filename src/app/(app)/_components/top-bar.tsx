import Image from "next/image";

import { SyncBadge } from "./sync-badge";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/sun.webp"
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-md"
            priority
          />
          <span className="text-sm font-semibold">Sunday Fun Day</span>
        </div>
        <div className="flex items-center gap-3">
          <SyncBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
