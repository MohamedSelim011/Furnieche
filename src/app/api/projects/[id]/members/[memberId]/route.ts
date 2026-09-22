import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess } from "@/lib/authz";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (access.role !== "OWNER") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { role, canViewBudget, allFolders, folderIds } = await req.json();

  // folderIds implies scoping to exactly those folders (allFolders: false)
  // unless allFolders is explicitly passed as true, which clears the
  // restriction and goes back to seeing everything.
  const restrictToFolders = Array.isArray(folderIds) && allFolders !== true;
  let validFolderIds: string[] = [];
  if (restrictToFolders) {
    const rootFolders = await prisma.projectFolder.findMany({
      where: { id: { in: folderIds }, projectId: id, parentId: null },
      select: { id: true },
    });
    validFolderIds = rootFolders.map((f) => f.id);
  }

  try {
    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.projectMember.update({
        where: { id: memberId, projectId: id },
        data: {
          ...(role && { role: role === "EDITOR" ? "EDITOR" : "VIEWER" }),
          ...(canViewBudget !== undefined && { canViewBudget: Boolean(canViewBudget) }),
          ...(allFolders === true && { allFolders: true }),
          ...(restrictToFolders && { allFolders: false }),
        },
      });

      if (allFolders === true) {
        await tx.projectMemberFolder.deleteMany({ where: { memberId: m.id } });
      } else if (restrictToFolders) {
        await tx.projectMemberFolder.deleteMany({ where: { memberId: m.id } });
        if (validFolderIds.length > 0) {
          await tx.projectMemberFolder.createMany({
            data: validFolderIds.map((folderId) => ({ memberId: m.id, folderId })),
          });
        }
      }

      return m;
    });
    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (access.role !== "OWNER") return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.projectMember.delete({ where: { id: memberId, projectId: id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
