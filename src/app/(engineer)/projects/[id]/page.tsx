import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, Plus, Clock, MapPin,
  ChevronRight, Wallet, FolderOpen, Eye, Link2,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { getProjectAccess, canEdit } from "@/lib/authz";
import { DeleteProjectButton } from "./delete-project-button";
import { ShareSection } from "./share-section";

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      folders: { where: { parentId: null }, orderBy: { order: "asc" } },
      updates: {
        where: { isPublished: true },
        include: { media: true, comments: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          folderAccess: { select: { folderId: true } },
        },
      },
    },
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role) notFound();

  const project = await getProject(id);
  if (!project) notFound();

  const editable = canEdit(access);

  const totalFolders = project.folders.length;
  const progress =
    totalFolders > 0
      ? Math.round(project.folders.reduce((sum, f) => sum + f.progressPercent, 0) / totalFolders)
      : 0;

  // Company teammates available to add (same company, not already a member, not the owner).
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  const availableTeammates =
    access.role === "OWNER" && dbUser?.companyId
      ? await prisma.user.findMany({
          where: {
            companyId: dbUser.companyId,
            id: { notIn: [project.engineerId, ...project.members.map((m) => m.userId)] },
          },
          select: { id: true, name: true, email: true },
        })
      : [];

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div className="flex items-center gap-2">
            {access.role === "OWNER" && <DeleteProjectButton projectId={id} />}
            {editable && (
              <Link
                href={`/projects/${id}/links`}
                className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm"
                title="Client links"
              >
                <Link2 size={16} className="text-gray-600" />
              </Link>
            )}
            {access.canViewBudget && (
              <Link
                href={`/projects/${id}/wallet`}
                className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"
                title="Project Wallet"
              >
                <Wallet size={17} className="text-gray-600" />
              </Link>
            )}
            {editable ? (
              <Link
                href={`/projects/${id}/update/new`}
                className="h-9 px-4 bg-brand-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
              >
                <Plus size={16} /> Update
              </Link>
            ) : (
              <span className="h-9 px-3 bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <Eye size={14} /> View only
              </span>
            )}
          </div>
        </div>

        <Badge variant={project.category.toLowerCase() as "residential" | "commercial" | "hospitality" | "other"}>
          {project.category}
        </Badge>
        <h1 className="text-xl font-bold text-gray-900 mt-2">{project.name}</h1>
        <p className="text-sm text-gray-500">Client: {project.clientName}</p>

        {project.location && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <MapPin size={12} />
            <span>{project.location}</span>
          </div>
        )}

        {project.startDate && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <Clock size={12} />
            <span>Started {formatDate(project.startDate)}</span>
          </div>
        )}
      </div>

      {/* Progress Card */}
      <div className="mx-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-brand-600">{progress}%</span>
        </div>
        <Progress value={progress} className="mb-3" />
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{totalFolders} folder{totalFolders === 1 ? "" : "s"}</span>
          {project.estimatedEndDate && (
            <span>Est. {formatDate(project.estimatedEndDate)}</span>
          )}
        </div>
      </div>

      {/* Folders Section */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Folders</h2>
          <Link href={`/projects/${id}/folders`} className="text-xs text-brand-600 font-semibold flex items-center gap-1">
            Manage <ChevronRight size={12} />
          </Link>
        </div>

        {totalFolders === 0 ? (
          <Link href={`/projects/${id}/folders`}>
            <div className="bg-blue-50 border border-blue-100 border-dashed rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-brand-600">No folders yet</p>
              <p className="text-xs text-gray-500 mt-1">Tap to add Contract, Design, Site, or custom folders</p>
            </div>
          </Link>
        ) : (
          <div className="space-y-2">
            {project.folders.slice(0, 5).map((folder) => (
              <FolderRow key={folder.id} folder={folder} projectId={id} />
            ))}
            {project.folders.length > 5 && (
              <Link href={`/projects/${id}/folders`} className="block text-center text-xs text-brand-600 font-semibold py-2">
                View all {project.folders.length} folders →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Shared With */}
      {(access.role === "OWNER" || project.members.length > 0) && (
        <div className="px-4 mb-4">
          <ShareSection
            projectId={id}
            isOwner={access.role === "OWNER"}
            folders={project.folders.map((f) => ({ id: f.id, name: f.name }))}
            members={project.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              name: m.user.name,
              email: m.user.email,
              role: m.role,
              canViewBudget: m.canViewBudget,
              allFolders: m.allFolders,
              folderIds: m.folderAccess.map((fa) => fa.folderId),
            }))}
            availableTeammates={availableTeammates}
          />
        </div>
      )}

      {/* Recent Updates */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Recent Updates</h2>
          <Link href={`/projects/${id}/updates`} className="text-xs text-brand-600 font-semibold flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {project.updates.length === 0 ? (
          <Link href={`/projects/${id}/update/new`}>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-gray-500">No updates yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap to post your first update</p>
            </div>
          </Link>
        ) : (
          <div className="space-y-3">
            {project.updates.map((update) => (
              <Link key={update.id} href={`/projects/${id}/updates/${update.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-3 active:bg-gray-50">
                {update.category && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                    {update.category}
                  </span>
                )}
                <p className="font-semibold text-gray-900 text-sm mt-0.5">{update.title}</p>
                {update.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{update.description}</p>
                )}
                {update.media.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {update.media.slice(0, 3).map((m) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={m.url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>{formatRelativeTime(update.createdAt)}</span>
                  {update.comments.length > 0 && (
                    <span>{update.comments.length} comment{update.comments.length > 1 ? "s" : ""}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function FolderRow({ folder, projectId }: { folder: { id: string; name: string; progressPercent: number }; projectId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/folders/${folder.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 active:bg-gray-50"
    >
      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
        <FolderOpen size={16} className="text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{folder.name}</p>
        <div className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all"
            style={{ width: `${folder.progressPercent}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-400 shrink-0">{folder.progressPercent}%</span>
      <ChevronRight size={14} className="text-gray-300 shrink-0" />
    </Link>
  );
}
