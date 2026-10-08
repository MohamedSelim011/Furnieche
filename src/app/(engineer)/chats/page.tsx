"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, Loader2, MessageCircle } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { formatRelativeTime } from "@/lib/utils";

type ChatSummary = {
  projectId: string;
  projectName: string;
  clientName: string;
  coverUrl: string | null;
  unread: number;
  lastMessage: { body: string; createdAt: string; fromClient: boolean; hasPhoto: boolean } | null;
};

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/chats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { chats: [] }))
      .then((d) => setChats(d.chats))
      .catch(() => setChats([]));
  }, []);

  return (
    <PageShell>
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-[28px] leading-tight font-bold text-brand-800">Chats</h1>
        <p className="text-sm text-gray-500 mt-1">One conversation per project with your client</p>
      </div>

      <div className="px-4 space-y-2">
        {chats === null ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="text-brand-600 animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16">
            <MessageCircle size={28} className="text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">No project chats yet</p>
          </div>
        ) : (
          chats.map((c) => (
            <Link
              key={c.projectId}
              href={`/chats/${c.projectId}`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 active:scale-[0.99] transition-transform"
            >
              {c.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.coverUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold shrink-0">
                  {c.projectName[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 truncate">{c.projectName}</p>
                  {c.lastMessage && (
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatRelativeTime(new Date(c.lastMessage.createdAt))}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p
                    className={`text-xs truncate flex-1 flex items-center gap-1 ${
                      c.unread > 0 ? "text-gray-800 font-semibold" : "text-gray-500"
                    }`}
                  >
                    {c.lastMessage ? (
                      <>
                        {c.lastMessage.hasPhoto && <Camera size={12} className="shrink-0" />}
                        <span className="truncate">
                          {c.lastMessage.fromClient ? `${c.clientName}: ` : "You: "}
                          {c.lastMessage.body}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">No messages yet</span>
                    )}
                  </p>
                  {c.unread > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}
