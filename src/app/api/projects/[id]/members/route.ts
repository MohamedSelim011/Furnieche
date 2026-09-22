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
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      folderAccess: { select: { folderId: true } },
    },
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
  const { userId, role, canViewBudget, folderIds } = body;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // The invited user must be in the same company.
  const teammate = await prisma.user.findUnique({ where: { id: userId } });
  if (!teammate || !project?.companyId || teammate.companyId !== project.companyId) {
    return NextResponse.json({ error: "User is not a member of your company" }, { status: 400 });
  }

  // Only main (root) folders of this project are valid grants.
  let validFolderIds: string[] = [];
  if (Array.isArray(folderIds)) {
    const rootFolders = await prisma.projectFolder.findMany({
      where: { id: { in: folderIds }, projectId: id, parentId: null },
      select: { id: true },
    });
    validFolderIds = rootFolders.map((f) => f.id);
  }
  const restrictToFolders = Array.isArray(folderIds);

  const member = await prisma.$transaction(async (tx) => {
    const m = await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId } },
      update: {
        role: role === "EDITOR" ? "EDITOR" : "VIEWER",
        canViewBudget: Boolean(canViewBudget),
        ...(restrictToFolders && { allFolders: false }),
      },
      create: {
        projectId: id,
        userId,
        role: role === "EDITOR" ? "EDITOR" : "VIEWER",
        canViewBudget: Boolean(canViewBudget),
        allFolders: !restrictToFolders,
      },
    });

    if (restrictToFolders) {
      await tx.projectMemberFolder.deleteMany({ where: { memberId: m.id } });
      if (validFolderIds.length > 0) {
        await tx.projectMemberFolder.createMany({
          data: validFolderIds.map((folderId) => ({ memberId: m.id, folderId })),
        });
      }
    }

    return m;
  });

  return NextResponse.json(member, { status: 201 });
}
