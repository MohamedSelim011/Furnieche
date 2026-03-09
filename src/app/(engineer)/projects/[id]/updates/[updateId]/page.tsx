import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Clock, MessageSquare } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { DeleteUpdateButton } from "./delete-update-button";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { formatDate, formatRelativeTime } from "@/lib/utils";

async function getUpdate(updateId: string, projectId: string, userId: string) {
  return prisma.projectUpdate.findFirst({
    where: {
      id: updateId,
      projectId,
      project: { engineerId: userId },
    },
    include: {
      media: true,
      comments: { orderBy: { createdAt: "asc" } },
      step: { select: { name: true } },
    },
  });
}

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string; updateId: string }>;
}) {
  const { id, updateId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await syncUser(user);

  const update = await getUpdate(updateId, id, user.id);
  if (!update) notFound();

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <Link href={`/projects/${id}/updates`} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          {update.category && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
              {update.category}
            </span>
          )}
          <h1 className="text-lg font-bold text-gray-900 truncate">{update.title}</h1>
        </div>
        <DeleteUpdateButton projectId={id} updateId={update.id} />
      </div>

      {/* Meta */}
      <div className="px-4 flex flex-wrap gap-3 text-xs text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {formatDate(update.createdAt)}
        </span>
        {update.location && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {update.location}
          </span>
        )}
        {update.step && (
          <span className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">
            {update.step.name}
          </span>
        )}
      </div>

      {/* Media */}
      {update.media.length > 0 && (
        <div className={`px-4 mb-4 ${update.media.length === 1 ? "" : "grid grid-cols-2 gap-2"}`}>
          {update.media.map((m) =>
            m.type === "VIDEO" ? (
              <video key={m.id} src={m.url} controls className="w-full rounded-2xl object-cover max-h-64" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.id} src={m.url} alt="" className={`w-full rounded-2xl object-cover ${update.media.length === 1 ? "max-h-72" : "h-40"}`} />
            )
          )}
        </div>
      )}

      {/* Description */}
      {update.description && (
        <div className="px-4 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{update.description}</p>
        </div>
      )}

      {/* Comments */}
      {update.comments.length > 0 && (
        <div className="px-4 mb-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-400" />
            Comments ({update.comments.length})
          </h2>
          <div className="space-y-3">
            {update.comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">
                    {comment.authorId ? "You" : (comment.clientName ?? "Client")}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600">{comment.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
