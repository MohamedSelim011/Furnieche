"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Wallet } from "lucide-react";

export function PortalNav({ token }: { token: string }) {
  const pathname = usePathname();
  const isWallet = pathname.endsWith("/wallet");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        <Link
          href={`/portal/${token}`}
          className={`flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-colors min-w-[80px] ${
            !isWallet ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Clock size={22} strokeWidth={!isWallet ? 2.5 : 1.8} />
          <span className={`text-[10px] font-medium ${!isWallet ? "font-semibold" : ""}`}>Updates</span>
        </Link>
        <Link
          href={`/portal/${token}/wallet`}
          className={`flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-colors min-w-[80px] ${
            isWallet ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Wallet size={22} strokeWidth={isWallet ? 2.5 : 1.8} />
          <span className={`text-[10px] font-medium ${isWallet ? "font-semibold" : ""}`}>Wallet</span>
        </Link>
      </div>
    </nav>
  );
}
