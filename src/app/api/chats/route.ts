import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { projectChatWhere, unreadClientCount } from "@/lib/chat";
import { imgUrl } from "@/lib/img";

// GET /api/chats — one entry per project chat, newest activity first
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const projects = await prisma.project.findMany({
    where: {
      status: { not: "ARCHIVED" },
      OR: [{ engineerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    select: { id: true, name: true, clientName: true, coverUrl: true, category: true, updatedAt: true },
  });

  const chats = await Promise.all(
    projects.map(async (p) => {
      const [last, unread] = await Promise.all([
        prisma.comment.findFirst({
          where: projectChatWhere(p.id),
          orderBy: { createdAt: "desc" },
          select: { body: true, createdAt: true, authorId: true, clientName: true, fileId: true },
        }),
        unreadClientCount(user.id, p.id),
      ]);
      return {
        projectId: p.id,
        projectName: p.name,
        clientName: p.clientName,
        coverUrl: p.coverUrl ? imgUrl("cover", p.id, 160, p.coverUrl) : null,
        category: p.category,
        unread,
        lastMessage: last
          ? {
              body: last.body,
              createdAt: last.createdAt.toISOString(),
              fromClient: last.authorId === null,
              hasPhoto: last.fileId !== null,
            }
          : null,
        sortAt: (last?.createdAt ?? p.updatedAt).getTime(),
      };
    })
  );

  chats.sort((a, b) => b.sortAt - a.sortAt);
  return NextResponse.json({ chats, totalUnread: chats.reduce((n, c) => n + c.unread, 0) });
}
