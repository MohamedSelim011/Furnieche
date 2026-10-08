"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, MessageCircle, Wallet } from "lucide-react";

export function PortalNav({
  token,
  linkType,
}: {
  token: string;
  /** VISITOR links hide the Wallet tab entirely — they never see financials. */
  linkType: "OWNER" | "VISITOR";
}) {
  const pathname = usePathname();
  const tabs = [
    { href: `/portal/${token}`, label: "Updates", icon: Clock, active: pathname === `/portal/${token}` },
    { href: `/portal/${token}/chat`, label: "Chat", icon: MessageCircle, active: pathname.endsWith("/chat") },
    ...(linkType === "OWNER"
      ? [{ href: `/portal/${token}/wallet`, label: "Wallet", icon: Wallet, active: pathname.endsWith("/wallet") }]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-colors min-w-[80px] ${
              active ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
