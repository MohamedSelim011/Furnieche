import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import {
  getAnalyzableFile,
  parseAnalysisDate,
  type ContractAnalysisResult,
} from "@/lib/contract-analysis";

// POST /api/projects/[id]/files/[fileId]/analysis/apply
// Body: { analysisId, dates?: boolean, budget?: boolean, payments?: boolean }
// Values always come from the stored analysis, never from the request body.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const file = await getAnalyzableFile(user.id, id, fileId);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { analysisId, dates, budget, payments } = body ?? {};
  if (typeof analysisId !== "string" || (!dates && !budget && !payments)) {
    return NextResponse.json({ error: "Nothing to apply" }, { status: 400 });
  }

  const analysis = await prisma.contractAnalysis.findFirst({
    where: { id: analysisId, fileId, projectId: id, status: "COMPLETED" },
  });
  if (!analysis?.result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = analysis.result as unknown as ContractAnalysisResult;

  if (payments && analysis.paymentsCreatedAt) {
    return NextResponse.json(
      { error: "Payment requests were already created from this analysis" },
      { status: 409 }
    );
  }

  const projectData: { startDate?: Date; estimatedEndDate?: Date; budget?: number } = {};
  if (dates) {
    const start = parseAnalysisDate(result.key_dates?.start_date);
    const end = parseAnalysisDate(result.key_dates?.end_date);
    if (start) projectData.startDate = start;
    if (end) projectData.estimatedEndDate = end;
  }
  if (budget && typeof result.financials?.total_value === "number" && result.financials.total_value > 0) {
    projectData.budget = result.financials.total_value;
  }

  const milestones = payments
    ? (result.payment_schedule ?? []).filter((m) => typeof m.amount === "number" && m.amount > 0)
    : [];

  const now = new Date();
  await prisma.$transaction([
    ...(Object.keys(projectData).length > 0
      ? [prisma.project.update({ where: { id }, data: projectData })]
      : []),
    ...(milestones.length > 0
      ? [
          prisma.payment.createMany({
            data: milestones.map((m) => ({
              projectId: id,
              type: "REQUEST" as const,
              status: "PENDING" as const,
              amount: m.amount as number,
              description: [m.label, m.trigger].filter(Boolean).join(" — ").slice(0, 300),
            })),
          }),
        ]
      : []),
    prisma.contractAnalysis.update({
      where: { id: analysis.id },
      data: { appliedAt: now, ...(milestones.length > 0 && { paymentsCreatedAt: now }) },
    }),
  ]);

  return NextResponse.json({
    applied: {
      startDate: projectData.startDate ?? null,
      estimatedEndDate: projectData.estimatedEndDate ?? null,
      budget: projectData.budget ?? null,
      paymentRequests: milestones.length,
    },
  });
}
