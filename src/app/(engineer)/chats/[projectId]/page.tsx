import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/authz";
import { getAttachmentInfo } from "@/lib/chat";
import { ChatThread } from "@/components/chat/chat-thread";

export default async function ProjectChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ file?: string; update?: string }>;
}) {
  const { projectId } = await params;
  const { file, update } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await syncUser(user);

  const access = await getProjectAccess(user.id, projectId);
  if (!access.role) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, clientName: true, coverUrl: true },
  });
  if (!project) notFound();

  const attachment = await getAttachmentInfo(projectId, file, update);

  return (
    <div className="min-h-screen max-w-md mx-auto">
      <div className="sticky top-0 z-30 bg-[#fbf9f6]/90 backdrop-blur border-b border-gray-100 px-4 pt-10 pb-3 flex items-center gap-3">
        <Link
          href="/chats"
          className="w-9 h-9 bg-white border border-gray-100 rounded-full flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold shrink-0">
            {project.name[0]?.toUpperCase()}
          </div>
        )}
        <Link href={`/projects/${project.id}`} className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900 truncate">{project.name}</p>
          <p className="text-xs text-gray-500 truncate">Client: {project.clientName}</p>
        </Link>
      </div>

      <div className="pt-3">
        <ChatThread
          viewer="team"
          fetchUrl={`/api/projects/${project.id}/chat`}
          postUrl={`/api/projects/${project.id}/chat`}
          initialAttachment={attachment}
          saveEditBase={`/api/projects/${project.id}/edits`}
          emptyHint="Client comments on updates and photos, and your replies, will appear here."
        />
      </div>
    </div>
  );
}
