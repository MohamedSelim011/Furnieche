import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquare, BellOff } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { formatRelativeTime } from "@/lib/utils";
import { MarkNotificationsRead } from "./mark-read";

async function getNotifications(userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return prisma.comment.findMany({
    where: {
      authorId: null,
      createdAt: { gte: thirtyDaysAgo },
      update: { project: { OR: [{ engineerId: userId }, { members: { some: { userId } } }] } },
    },
    include: {
      update: {
        select: {
          id: true,
          title: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await syncUser(user);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastNotificationsReadAt: true },
  });

  const comments = await getNotifications(user.id);
  const lastRead = dbUser?.lastNotificationsReadAt ?? null;

  return (
    <PageShell>
      {/* Marks all as read on mount */}
      <MarkNotificationsRead />

      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {comments.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* List */}
      <div className="px-4 space-y-3 pb-8">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BellOff size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">Client comments will appear here</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isNew = !lastRead || comment.createdAt > lastRead;
            return (
              <Link
                key={comment.id}
                href={`/projects/${comment.update.project.id}/updates/${comment.update.id}`}
                className={`block rounded-2xl border shadow-sm p-4 transition-colors ${
                  isNew ? "bg-blue-50/40 border-brand-200" : "bg-white border-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isNew ? "bg-brand-100" : "bg-gray-100"
                    }`}
                  >
                    <MessageSquare size={16} className={isNew ? "text-brand-600" : "text-gray-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">
                      <span className="font-semibold text-gray-700">{comment.update.project.name}</span>
                      {" · "}
                      <span className="truncate">{comment.update.title}</span>
                    </p>
                    <p className="text-sm text-gray-800 font-medium">
                      <span className="text-gray-500">{comment.clientName ?? "Client"}:</span>{" "}
                      {comment.body}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(comment.createdAt)}</p>
                  </div>
                  {isNew && <span className="w-2 h-2 bg-brand-600 rounded-full mt-1.5 shrink-0" />}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
