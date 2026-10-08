import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isPortalTokenValid } from "@/lib/authz";
import { getAttachmentInfo } from "@/lib/chat";
import { ChatThread } from "@/components/chat/chat-thread";
import { PortalNav } from "../portal-nav";

export default async function PortalChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ file?: string; update?: string; ai?: string }>;
}) {
  const { token } = await params;
  const { file, update, ai } = await searchParams;

  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          coverUrl: true,
          engineer: { select: { name: true, email: true } },
          company: { select: { name: true } },
        },
      },
    },
  });
  if (!isPortalTokenValid(accessToken)) notFound();

  const { project } = accessToken;
  const attachment = await getAttachmentInfo(project.id, file, update);
  const teamName = project.company?.name ?? project.engineer.name ?? "Your engineer";

  return (
    <div className="min-h-screen max-w-md mx-auto">
      <div className="sticky top-0 z-30 bg-[#fbf9f6]/90 backdrop-blur border-b border-gray-100 px-4 pt-10 pb-3 flex items-center gap-3">
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold shrink-0">
            {project.name[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900 truncate">{project.name}</p>
          <p className="text-xs text-gray-500 truncate">Chat with {teamName}</p>
        </div>
      </div>

      <div className="pt-3">
        <ChatThread
          viewer="client"
          fetchUrl={`/api/portal/chat?token=${encodeURIComponent(token)}`}
          postUrl="/api/portal/chat"
          postExtras={{ token }}
          initialAttachment={attachment}
          aiEditUrl="/api/portal/image-edits"
          initialAiMode={ai === "1"}
          composerClassName="bottom-20"
          emptyHint="Ask a question or comment on a photo. Tap any photo in your project folders to talk about it here."
        />
      </div>

      <PortalNav token={token} linkType={accessToken.type} />
    </div>
  );
}
