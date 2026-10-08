import Link from "next/link";
import {
  Plus,
  Bell,
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FolderOpen,
  MessageSquare,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getInitials } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ProjectList } from "@/components/project-list";
import type { ProjectCardData } from "@/components/project-card";

const ACTIVE_STATUSES = ["ACTIVE", "ON_HOLD"];

async function getProjects(userId: string): Promise<ProjectCardData[]> {
  const projects = await prisma.project.findMany({
    where: {
      status: { not: "ARCHIVED" },
      OR: [{ engineerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      folders: {
        select: { progressPercent: true, parentId: true, _count: { select: { files: true } } },
      },
      // Latest update photo doubles as the card thumbnail
      updates: {
        where: { media: { some: { type: "IMAGE" } } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { media: { where: { type: "IMAGE" }, take: 1, select: { url: true } } },
      },
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Completed projects sink to the bottom, active/on-hold stay on top
  projects.sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status);
    const bActive = ACTIVE_STATUSES.includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.clientName,
    status: p.status,
    category: p.category,
    updatedAt: p.updatedAt,
    coverUrl: p.coverUrl ?? p.updates[0]?.media[0]?.url ?? null,
    folderCount: p.folders.filter((f) => f.parentId === null).length,
    fileCount: p.folders.reduce((sum, f) => sum + f._count.files, 0),
    memberCount: p._count.members,
    progress:
      p.folders.length > 0
        ? Math.round(p.folders.reduce((sum, f) => sum + f.progressPercent, 0) / p.folders.length)
        : 0,
  }));
}

async function getDashboardStats(userId: string, lastReadAt: Date | null) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Count comments newer than lastReadAt (or last 7 days if never read)
  const commentCutoff = lastReadAt ?? sevenDaysAgo;

  const myProjects = { OR: [{ engineerId: userId }, { members: { some: { userId } } }] };

  const [active, delayed, completed, pendingComments, newEdits] = await Promise.all([
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
        OR: [{ update: { project: myProjects } }, { file: { folder: { project: myProjects } } }],
      },
    }),
    prisma.imageEdit.count({
      where: { status: "COMPLETED", createdAt: { gte: commentCutoff }, project: myProjects },
    }),
  ]);

  return { active, delayed, completed, pendingComments: pendingComments + newEdits };
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

  return (
    <PageShell>
      <div className="relative">
        {/* Top bar */}
        <div className="relative px-4 pt-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg" />
            <span className="text-xl font-bold text-brand-800 tracking-tight">Furniche</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label={stats.pendingComments > 0 ? `Notifications (${stats.pendingComments} new)` : "Notifications"}
              className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/70"
            >
              <Bell size={21} className="text-gray-700" />
              {stats.pendingComments > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-gray-50" />
              )}
            </Link>
            <Link
              href="/settings"
              className="w-10 h-10 bg-oak-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
            >
              {getInitials(user.email?.split("@")[0] ?? "U")}
            </Link>
          </div>
        </div>

        {/* Title */}
        <div className="relative px-4 pt-8">
          <h1 className="text-[28px] leading-tight font-bold text-brand-800">My Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your active documentation</p>
        </div>

        {/* Stats Cards */}
        <div className="relative px-4 pt-6 grid grid-cols-2 gap-3">
          <StatCard icon={FolderOpen} hint={Activity} label="Active" value={stats.active} caption="projects in progress" tone="brand" />
          <StatCard
            icon={Clock}
            hint={AlertTriangle}
            label="Delayed"
            value={stats.delayed}
            caption="past deadline"
            tone={stats.delayed > 0 ? "danger" : "oak"}
          />
          <StatCard icon={CheckCircle2} hint={BarChart3} label="Completed" value={stats.completed} caption="projects handed over" tone="success" />
          <StatCard
            icon={MessageSquare}
            hint={BarChart3}
            label="Comments"
            value={stats.pendingComments}
            caption="client comments & AI edits"
            tone={stats.pendingComments > 0 ? "warning" : "neutral"}
          />
        </div>
      </div>

      {/* Create Project Button */}
      <div className="px-4 pt-5">
        <Button asChild fullWidth size="lg" className="shadow-md shadow-brand-900/15">
          <Link href="/projects/new">
            <Plus size={20} />
            Create Project
          </Link>
        </Button>
      </div>

      <ProjectList projects={projects} />
    </PageShell>
  );
}
