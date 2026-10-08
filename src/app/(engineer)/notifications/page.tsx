import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquare, BellOff, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { formatRelativeTime } from "@/lib/utils";
import { MarkNotificationsRead } from "./mark-read";

type Notification = {
  id: string;
  kind: "comment" | "edit";
  href: string;
  projectName: string;
  context: string;
  who: string;
  text: string;
  createdAt: Date;
};

async function getNotifications(userId: string): Promise<Notification[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const myProjects = { OR: [{ engineerId: userId }, { members: { some: { userId } } }] };

  const [comments, edits] = await Promise.all([
    prisma.comment.findMany({
      where: {
        authorId: null,
        createdAt: { gte: thirtyDaysAgo },
        OR: [{ update: { project: myProjects } }, { file: { folder: { project: myProjects } } }],
      },
      include: {
        update: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
        file: {
          select: {
            id: true,
            name: true,
            folderId: true,
            folder: { select: { project: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.imageEdit.findMany({
      where: { status: "COMPLETED", createdAt: { gte: thirtyDaysAgo }, project: myProjects },
      include: {
        project: { select: { id: true, name: true } },
        file: { select: { id: true, name: true, folderId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: Notification[] = [];
  for (const c of comments) {
    if (c.update) {
      items.push({
        id: c.id,
        kind: "comment",
        href: `/chats/${c.update.project.id}`,
        projectName: c.update.project.name,
        context: c.update.title,
        who: c.clientName ?? "Client",
        text: c.body,
        createdAt: c.createdAt,
      });
    } else if (c.file) {
      items.push({
        id: c.id,
        kind: "comment",
        href: `/chats/${c.file.folder.project.id}`,
        projectName: c.file.folder.project.name,
        context: c.file.name,
        who: c.clientName ?? "Client",
        text: c.body,
        createdAt: c.createdAt,
      });
    }
  }
  for (const e of edits) {
    items.push({
      id: e.id,
      kind: "edit",
      href: `/projects/${e.project.id}/folders/${e.file.folderId}?file=${e.file.id}`,
      projectName: e.project.name,
      context: e.file.name,
      who: e.clientName ?? "Client",
      text: `AI edit: “${e.prompt}”`,
      createdAt: e.createdAt,
    });
  }
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

  const notifications = await getNotifications(user.id);
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
        {notifications.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">{notifications.length}</span>
        )}
      </div>

      {/* List */}
      <div className="px-4 space-y-3 pb-8">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BellOff size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">Client comments and AI edits will appear here</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isNew = !lastRead || n.createdAt > lastRead;
            const Icon = n.kind === "edit" ? Sparkles : MessageSquare;
            return (
              <Link
                key={`${n.kind}-${n.id}`}
                href={n.href}
                className={`block rounded-2xl border shadow-sm p-4 transition-colors ${
                  isNew ? "bg-blue-50/40 border-brand-200" : "bg-white border-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isNew ? (n.kind === "edit" ? "bg-oak-100" : "bg-brand-100") : "bg-gray-100"
                    }`}
                  >
                    <Icon size={16} className={isNew ? (n.kind === "edit" ? "text-oak-600" : "text-brand-600") : "text-gray-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5 truncate">
                      <span className="font-semibold text-gray-700">{n.projectName}</span>
                      {" · "}
                      {n.context}
                    </p>
                    <p className="text-sm text-gray-800 font-medium">
                      <span className="text-gray-500">{n.who}:</span> {n.text}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
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
