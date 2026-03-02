import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STEPS } from "@/lib/constants";
import { syncUser } from "@/lib/sync-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const steps = await prisma.projectStep.findMany({
    where: { projectId: id, project: { engineerId: user.id } },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(steps);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, order } = body;

  const step = await prisma.projectStep.create({
    data: {
      projectId: id,
      name,
      description: description ?? null,
      order: order ?? 1,
    },
  });

  return NextResponse.json(step, { status: 201 });
}
