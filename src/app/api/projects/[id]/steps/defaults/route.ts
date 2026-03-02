import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STEPS } from "@/lib/constants";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get current step count to offset order
  const existing = await prisma.projectStep.count({ where: { projectId: id } });

  await prisma.projectStep.createMany({
    data: DEFAULT_STEPS.map((s) => ({
      projectId: id,
      name: s.name,
      description: s.description,
      order: existing + s.order,
    })),
  });

  const steps = await prisma.projectStep.findMany({
    where: { projectId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(steps);
}
