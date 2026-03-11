import { notFound } from "next/navigation";
import { Shield, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatRelativeTime, formatTime } from "@/lib/utils";
import { CommentForm } from "./comment-form";
import { ScopeSection } from "./scope-section";

type PortalResult =
  | { status: "ok"; data: NonNullable<Awaited<ReturnType<typeof fetchAccessToken>>> }
  | { status: "expired" }
  | { status: "notfound" };

async function fetchAccessToken(token: string) {
  return prisma.accessToken.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          steps: { orderBy: { order: "asc" } },
          updates: {
            where: { isPublished: true },
            include: {
              media: true,
              comments: { orderBy: { createdAt: "asc" } },
            },
            orderBy: { createdAt: "desc" },
          },
          engineer: { select: { name: true, email: true } },
          company: { select: { name: true, logoUrl: true } },
        },
      },
    },
  });
}

async function getPortalData(token: string): Promise<PortalResult> {
  const accessToken = await fetchAccessToken(token);

  if (!accessToken || !accessToken.isActive) return { status: "notfound" };
  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) return { status: "expired" };

  // Update last used
  await prisma.accessToken.update({
    where: { id: accessToken.id },
    data: { lastUsedAt: new Date() },
  });

  return { status: "ok", data: accessToken };
}

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED": return { label: "Completed", cls: "bg-green-50 text-green-700" };
    case "DELAYED":   return { label: "Delayed",   cls: "bg-red-50 text-red-700" };
    case "ON_HOLD":   return { label: "On Hold",   cls: "bg-amber-50 text-amber-700" };
    case "ARCHIVED":  return { label: "Archived",  cls: "bg-gray-100 text-gray-500" };
    default:          return { label: "In Progress", cls: "bg-green-50 text-green-700" };
  }
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await getPortalData(token);

  if (result.status === "notfound") notFound();
  if (result.status === "expired") return <ExpiredLinkState />;

  const { project } = result.data;
  const totalSteps = project.steps.length;
  const completedSteps = project.steps.filter((s) => s.status === "COMPLETED").length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const statusBadge = getStatusBadge(project.status);

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto pb-12">
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-1">
              Project Live View
            </p>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            {project.location && (
              <p className="text-xs text-gray-400 mt-0.5">{project.location}</p>
            )}
          </div>
          {/* Test 5: real project status badge */}
          <span className={`${statusBadge.cls} text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-600 font-medium">{progress}% Complete</span>
            {project.estimatedEndDate && (
              <span className="text-gray-400 text-xs">Est. Completion: {formatDate(project.estimatedEndDate)}</span>
            )}
          </div>
          <Progress value={progress} />
        </div>

        {/* Client info */}
        <div className="mt-3 flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
          <Shield size={14} className="text-brand-600 shrink-0" />
          <p className="text-xs text-gray-600">
            Accessing as <strong>{project.clientName}</strong> · Secure link active · Read-only access
          </p>
        </div>
      </div>

      {/* Updates Timeline */}
      <div className="px-4 pt-4 space-y-1">
        {project.updates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No updates posted yet</p>
            <p className="text-xs text-gray-300 mt-1">Check back soon for progress updates</p>
          </div>
        ) : (
          project.updates.map((update, index) => (
            <div key={update.id} className="relative">
              {/* Timeline dot */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                    index === 0 ? "bg-brand-600" : "bg-gray-300"
                  }`} />
                  {index < project.updates.length - 1 && (
                    <div className="w-0.5 bg-gray-200 flex-1 my-1" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  {/* Date + Category */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 font-medium">
                      {formatDate(update.createdAt).toUpperCase()}, {formatTime(update.createdAt)}
                    </span>
                    {update.category && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {update.category}
                      </span>
                    )}
                  </div>

                  {/* Update Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-bold text-gray-900 text-base">{update.title}</h3>
                    {update.description && (
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{update.description}</p>
                    )}

                    {/* Media */}
                    {update.media.length > 0 && (
                      <div className={`mt-3 grid gap-1.5 ${update.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {update.media.slice(0, 4).map((m, mi) => (
                          <div key={m.id} className={`relative rounded-xl overflow-hidden ${
                            update.media.length === 1 ? "h-48" : "h-32"
                          }`}>
                            {m.type === "IMAGE" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <video src={m.url} className="w-full h-full object-cover" controls />
                            )}
                            {mi === 3 && update.media.length > 4 && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">+{update.media.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comments */}
                    {update.comments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-50 space-y-2.5">
                        {update.comments.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2">
                            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-gray-500">
                                {(comment.clientName || "U")[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-semibold text-gray-700">
                                  {comment.clientName || "Anonymous"}
                                  {comment.clientName && " (Client)"}
                                </span>
                                <span className="text-[10px] text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{comment.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    <CommentForm updateId={update.id} clientName={project.clientName} clientEmail={project.clientEmail} />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mx-4 mt-4 text-center">
        <p className="text-xs text-gray-400">Documentation verified and managed by</p>
        {project.company ? (
          <div className="flex items-center justify-center gap-2 mt-2">
            {/* Test 3: show logo if available */}
            {project.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.company.logoUrl}
                alt={project.company.name}
                className="w-7 h-7 rounded-lg object-contain"
              />
            ) : (
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">{project.company.name[0]}</span>
              </div>
            )}
            <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              {project.company.name}
            </span>
          </div>
        ) : (
          <p className="text-sm font-semibold text-gray-700 mt-1">{project.engineer.name || project.engineer.email}</p>
        )}

        {/* Test 2: expandable project scope */}
        <ScopeSection steps={project.steps} />

        <p className="text-[10px] text-gray-300 mt-3 uppercase tracking-widest">Secure Client Portal v2.4.0</p>
      </div>
    </div>
  );
}

function ExpiredLinkState() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 w-full">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock size={28} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">This link has expired</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Your secure access link is no longer active. Project portal links expire after 90 days for your security.
        </p>
        <div className="bg-amber-50 rounded-2xl px-4 py-3">
          <p className="text-sm text-amber-700 font-medium">
            Contact your engineer to get a new access link sent to your email.
          </p>
        </div>
        <p className="text-[10px] text-gray-300 mt-6 uppercase tracking-widest">Furniche Secure Client Portal</p>
      </div>
    </div>
  );
}
