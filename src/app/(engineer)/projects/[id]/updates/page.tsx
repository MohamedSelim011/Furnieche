import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Plus, ChevronRight, Layers } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { formatRelativeTime } from "@/lib/utils";

async function getProjectUpdates(id: string, userId: string, stepId?: string) {
  return prisma.project.findFirst({
    where: { id, engineerId: userId },
    select: {
      id: true,
      name: true,
      updates: {
        where: {
          isPublished: true,
          ...(stepId ? { stepId } : {}),
        },
        include: { media: { take: 1 }, comments: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

async function getStep(stepId: string, projectId: string) {
  return prisma.projectStep.findFirst({
    where: { id: stepId, projectId },
    select: { id: true, name: true, order: true },
  });
}

export default async function UpdatesListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ stepId?: string }>;
}) {
  const { id } = await params;
  const resolvedSearch = await searchParams;
  const stepId = resolvedSearch?.stepId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await syncUser(user);

  const [project, step] = await Promise.all([
    getProjectUpdates(id, user.id, stepId),
    stepId ? getStep(stepId, id) : Promise.resolve(null),
  ]);

  if (!project) notFound();

  const addUpdateHref = stepId
    ? `/projects/${id}/update/new?stepId=${stepId}`
    : `/projects/${id}/update/new`;

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}`} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {step ? `Phase ${step.order} Updates` : "All Updates"}
            </h1>
            <p className="text-xs text-gray-400">{project.name}</p>
          </div>
        </div>
        <Link
          href={addUpdateHref}
          className="h-9 px-4 bg-brand-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
        >
          <Plus size={16} /> Update
        </Link>
      </div>

      {/* Phase Filter Badge */}
      {step && (
        <div className="px-4 mb-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Layers size={12} />
            {step.name}
          </div>
          <Link href={`/projects/${id}/updates`} className="text-xs text-gray-400 underline">
            View all
          </Link>
        </div>
      )}

      {/* Updates List */}
      <div className="px-4 space-y-3 pb-4">
        {project.updates.length === 0 ? (
          <Link href={addUpdateHref}>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
              <p className="text-sm font-semibold text-gray-500">
                {step ? `No updates for this phase yet` : "No updates yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Tap to post the first update</p>
            </div>
          </Link>
        ) : (
          project.updates.map((update) => (
            <Link
              key={update.id}
              href={`/projects/${id}/updates/${update.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 active:bg-gray-50"
            >
              {update.media[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={update.media[0].url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {update.category && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                    {update.category}
                  </span>
                )}
                <p className="font-semibold text-gray-900 text-sm truncate">{update.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                  <span>{formatRelativeTime(update.createdAt)}</span>
                  {update.comments.length > 0 && (
                    <span>· {update.comments.length} comment{update.comments.length > 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}
