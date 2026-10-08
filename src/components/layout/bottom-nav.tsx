"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, Plus, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const leftItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

const rightItems = [
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
}: (typeof leftItems)[number] & { pathname: string }) {
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-1 flex-1 transition-colors",
        isActive ? "text-brand-700" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <span
        className={cn(
          "w-10 h-8 rounded-xl flex items-center justify-center transition-colors",
          isActive && "bg-brand-50"
        )}
      >
        <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
      </span>
      <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto flex items-center bg-white/95 backdrop-blur rounded-[22px] border border-gray-100 shadow-[0_8px_24px_rgba(28,26,23,0.10)] px-2 py-1.5">
        {leftItems.map((item) => <NavItem key={item.href} {...item} pathname={pathname} />)}

        <div className="flex-1 flex justify-center">
          <Link
            href="/projects/new"
            aria-label="New project"
            className="-mt-7 w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-900/25 ring-4 ring-gray-50 active:scale-95 transition-transform"
          >
            <Plus size={26} strokeWidth={2.4} />
          </Link>
        </div>

        {rightItems.map((item) => <NavItem key={item.href} {...item} pathname={pathname} />)}
      </div>
    </nav>
  );
}
