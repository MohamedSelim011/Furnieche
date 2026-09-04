import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess } from "@/lib/authz";

// GET /api/projects/[id]/members — list who this project is shared with
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/projects/[id]/members — owner shares the project with a company teammate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  // Only the owner manages sharing.
  const access = await getProjectAccess(user.id, id);
  if (access.role !== "OWNER") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
  const body = await req.json();
  const { userId, role, canViewBudget } = body;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // The invited user must be in the same company.
  const teammate = await prisma.user.findUnique({ where: { id: userId } });
  if (!teammate || !project?.companyId || teammate.companyId !== project.companyId) {
    return NextResponse.json({ error: "User is not a member of your company" }, { status: 400 });
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: id, userId } },
    update: {
      role: role === "EDITOR" ? "EDITOR" : "VIEWER",
      canViewBudget: Boolean(canViewBudget),
    },
    create: {
      projectId: id,
      userId,
      role: role === "EDITOR" ? "EDITOR" : "VIEWER",
      canViewBudget: Boolean(canViewBudget),
    },
  });

  return NextResponse.json(member, { status: 201 });
}
