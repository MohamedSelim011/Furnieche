import Link from "next/link";
import { Plus, Bell, Clock, FolderOpen, Activity, AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/project-card";

const ACTIVE_STATUSES = ["ACTIVE", "ON_HOLD"];

async function getProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      status: { not: "ARCHIVED" },
      OR: [{ engineerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      folders: { select: { progressPercent: true } },
      _count: { select: { updates: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Completed projects sink to the bottom, active/on-hold stay on top
  return projects.sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status);
    const bActive = ACTIVE_STATUSES.includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });
}

async function getDashboardStats(userId: string, lastReadAt: Date | null) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Count comments newer than lastReadAt (or last 7 days if never read)
  const commentCutoff = lastReadAt ?? sevenDaysAgo;

  const [active, delayed, completed, pendingComments] = await Promise.all([
    prisma.project.count({
      where: { engineerId: userId, status: "ACTIVE" },
    }),
    prisma.project.count({
      where: { engineerId: userId, status: "DELAYED" },
    }),
    prisma.project.count({
      where: { engineerId: userId, status: "COMPLETED" },
    }),
    prisma.comment.count({
      where: {
        authorId: null,
        createdAt: { gte: commentCutoff },
        update: { project: { engineerId: userId } },
      },
    }),
  ]);

  return { active, delayed, completed, pendingComments };
}


export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await syncUser(user);

  // Auto-mark overdue projects as DELAYED
  await prisma.project.updateMany({
    where: {
      engineerId: user.id,
      status: "ACTIVE",
      estimatedEndDate: { lt: new Date() },
    },
    data: { status: "DELAYED" },
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastNotificationsReadAt: true },
  });
  const lastReadAt = dbUser?.lastNotificationsReadAt ?? null;

  const [projects, stats] = await Promise.all([
    getProjects(user.id).catch(() => []),
    getDashboardStats(user.id, lastReadAt).catch(() => ({ active: 0, delayed: 0, completed: 0, pendingComments: 0 })),
  ]);

  const lastUpdated = projects[0]?.updatedAt ?? null;

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your active documentation</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Link href="/notifications" className="relative w-10 h-10 bg-white rounded-full border border-gray-100 shadow-sm flex items-center justify-center">
            <Bell size={18} className="text-gray-600" />
            {stats.pendingComments > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                {stats.pendingComments > 9 ? "9+" : stats.pendingComments}
              </span>
            )}
          </Link>
          <Link href="/settings" className="w-10 h-10 bg-orange-300 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {getInitials(user.email?.split("@")[0] ?? "U")}
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Active</span>
            <Activity size={16} className="text-brand-600" />
          </div>
          <p className="text-3xl font-bold text-brand-700">{stats.active}</p>
          <p className="text-xs text-brand-500">projects in progress</p>
        </div>

        <div className={`rounded-2xl p-4 flex flex-col gap-1 ${stats.delayed > 0 ? "bg-red-50" : "bg-gray-50"}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wide ${stats.delayed > 0 ? "text-red-600" : "text-gray-500"}`}>Delayed</span>
            <AlertTriangle size={16} className={stats.delayed > 0 ? "text-red-500" : "text-gray-400"} />
          </div>
          <p className={`text-3xl font-bold ${stats.delayed > 0 ? "text-red-700" : "text-gray-700"}`}>{stats.delayed}</p>
          <p className={`text-xs ${stats.delayed > 0 ? "text-red-400" : "text-gray-400"}`}>past deadline</p>
        </div>

        <div className="bg-green-50 rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Completed</span>
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-xs text-green-500">projects handed over</p>
        </div>

        <div className={`rounded-2xl p-4 flex flex-col gap-1 ${stats.pendingComments > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wide ${stats.pendingComments > 0 ? "text-amber-600" : "text-gray-500"}`}>Comments</span>
            <MessageSquare size={16} className={stats.pendingComments > 0 ? "text-amber-500" : "text-gray-400"} />
          </div>
          <p className={`text-3xl font-bold ${stats.pendingComments > 0 ? "text-amber-700" : "text-gray-700"}`}>{stats.pendingComments}</p>
          <p className={`text-xs ${stats.pendingComments > 0 ? "text-amber-500" : "text-gray-400"}`}>client replies (7d)</p>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="px-4 pt-3">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={11} />
            Last activity: {formatRelativeTime(lastUpdated)}
          </p>
        </div>
      )}

      {/* Create Project Button */}
      <div className="px-4 pt-4 pb-2">
        <Button asChild fullWidth size="lg">
          <Link href="/projects/new">
            <Plus size={20} />
            Create Project
          </Link>
        </Button>
      </div>

      {/* Projects List */}
      <div className="px-4 pt-2 space-y-3">
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          projects.map((project) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <ProjectCard key={project.id} project={project as any} />
          ))
        )}
      </div>
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FolderOpen size={36} className="text-gray-300" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">No projects yet</h3>
      <p className="text-sm text-gray-500 max-w-[220px]">
        You haven&apos;t documented any projects yet. Start now to reduce client disputes and keep progress on track.
      </p>
    </div>
  );
}
