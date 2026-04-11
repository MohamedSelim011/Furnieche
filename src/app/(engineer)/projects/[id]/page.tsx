import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, Plus, Share2, Clock, MapPin,
  CheckCircle2, Circle, MinusCircle, ChevronRight, Wallet,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { SharePortalButton } from "./share-portal-button";
import { DeleteProjectButton } from "./delete-project-button";

async function getProject(id: string, userId: string) {
  return prisma.project.findFirst({
    where: { id, engineerId: userId },
    include: {
      steps: { orderBy: { order: "asc" } },
      updates: {
        where: { isPublished: true },
        include: { media: true, comments: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      accessTokens: { where: { isActive: true }, take: 1 },
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

  const project = await getProject(id, user.id);
  if (!project) notFound();

  const totalSteps = project.steps.length;
  const completedSteps = project.steps.filter((s) => s.status === "COMPLETED").length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const portalToken = project.accessTokens[0]?.token;

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div className="flex items-center gap-2">
            <DeleteProjectButton projectId={id} />
            {portalToken && <SharePortalButton token={portalToken} projectName={project.name} />}
            <Link
              href={`/projects/${id}/wallet`}
              className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"
              title="Project Wallet"
            >
              <Wallet size={17} className="text-gray-600" />
            </Link>
            <Link
              href={`/projects/${id}/update/new`}
              className="h-9 px-4 bg-brand-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
            >
              <Plus size={16} /> Update
            </Link>
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
          <span>{completedSteps} of {totalSteps} steps completed</span>
          {project.estimatedEndDate && (
            <span>Est. {formatDate(project.estimatedEndDate)}</span>
          )}
        </div>
      </div>

      {/* Steps Section */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Project Steps</h2>
          <Link href={`/projects/${id}/steps`} className="text-xs text-brand-600 font-semibold flex items-center gap-1">
            Manage <ChevronRight size={12} />
          </Link>
        </div>

        {totalSteps === 0 ? (
          <Link href={`/projects/${id}/steps`}>
            <div className="bg-blue-50 border border-blue-100 border-dashed rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-brand-600">No steps yet</p>
              <p className="text-xs text-gray-500 mt-1">Tap to add predefined or custom steps</p>
            </div>
          </Link>
        ) : (
          <div className="space-y-2">
            {project.steps.slice(0, 5).map((step) => (
              <StepRow key={step.id} step={step} projectId={id} />
            ))}
            {project.steps.length > 5 && (
              <Link href={`/projects/${id}/steps`} className="block text-center text-xs text-brand-600 font-semibold py-2">
                View all {project.steps.length} steps →
              </Link>
            )}
          </div>
        )}
      </div>

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

function InProgressPie() {
  // SVG donut showing ~65% arc to indicate in-progress
  const r = 8;
  const cx = 10;
  const cy = 10;
  const circumference = 2 * Math.PI * r; // ~50.27
  const filled = circumference * 0.65;   // ~32.67

  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#dbeafe" strokeWidth="2.5" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#2563eb"
        strokeWidth="2.5"
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  );
}

function StepRow({ step, projectId }: { step: { id: string; name: string; status: string; order: number }; projectId: string }) {
  const isCompleted = step.status === "COMPLETED";
  const isInProgress = step.status === "IN_PROGRESS";
  const isSkipped = step.status === "SKIPPED";

  return (
    <Link
      href={`/projects/${projectId}/updates?stepId=${step.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 active:bg-gray-50"
    >
      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 size={20} className="text-green-500" />
        ) : isInProgress ? (
          <InProgressPie />
        ) : isSkipped ? (
          <MinusCircle size={20} className="text-amber-400" />
        ) : (
          <Circle size={20} className="text-gray-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          isCompleted ? "line-through text-gray-400"
          : isSkipped ? "line-through text-amber-400"
          : "text-gray-800"
        }`}>
          {step.name}
        </p>
      </div>
      <ChevronRight size={14} className="text-gray-300 shrink-0" />
    </Link>
  );
}
