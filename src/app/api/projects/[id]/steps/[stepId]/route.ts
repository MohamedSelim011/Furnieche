import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, name } = body;

  // Business rule: a phase cannot be marked completed without at least 1 published update
  if (status === "COMPLETED") {
    const step = await prisma.projectStep.findUnique({ where: { id: stepId } });
    if (step) {
      const updateCount = await prisma.projectUpdate.count({
        where: { projectId: step.projectId, isPublished: true },
      });
      if (updateCount === 0) {
        return NextResponse.json(
          { error: "Add at least one update before completing this phase" },
          { status: 400 }
        );
      }
    }
  }

  const data: Record<string, unknown> = {};
  if (status) {
    data.status = status;
    data.completedAt = status === "COMPLETED" ? new Date() : null;
    if (status === "IN_PROGRESS") data.startDate = new Date();
  }
  if (name) data.name = name;

  const step = await prisma.projectStep.update({
    where: { id: stepId },
    data,
  });

  // Recalculate project progress
  const allSteps = await prisma.projectStep.findMany({
    where: { projectId: step.projectId },
  });
  const completedCount = allSteps.filter((s) => s.status === "COMPLETED").length;
  const progress = allSteps.length > 0 ? Math.round((completedCount / allSteps.length) * 100) : 0;
  await prisma.project.update({
    where: { id: step.projectId },
    data: { progressPercent: progress },
  });

  return NextResponse.json(step);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.projectStep.delete({ where: { id: stepId } });
  return new NextResponse(null, { status: 204 });
}
