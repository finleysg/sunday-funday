"use client";

import { ListChecks, Settings, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof Trophy;
}

const baseItems: NavItem[] = [
  { href: "/games", label: "Games", Icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", Icon: ListChecks },
];

const adminItems: NavItem[] = [
  { href: "/roster", label: "Roster", Icon: Users },
  { href: "/courses", label: "Courses", Icon: Settings },
];

export function BottomNav({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const items = admin ? [...baseItems, ...adminItems] : baseItems;
  return (
    <nav className="bg-background fixed inset-x-0 bottom-0 z-10 border-t">
      <ul className="mx-auto flex w-full max-w-3xl items-stretch">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`) || false;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
