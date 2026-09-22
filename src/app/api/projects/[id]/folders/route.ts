import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit, canAccessFolder, getAllowedFolderRootIds } from "@/lib/authz";
import { recalcFolderAndProjectProgress } from "@/lib/progress";

// GET /api/projects/[id]/folders?parentId=<id> — omit parentId for main
// (root) folders, pass it to list a folder's subfolders.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parentId = req.nextUrl.searchParams.get("parentId");

  if (parentId) {
    // Listing a specific folder's subfolders — confirm it actually belongs
    // to this project (an OWNER's "ALL" access would otherwise say yes to
    // any folder id from any project) and that the caller can reach it.
    const parent = await prisma.projectFolder.findUnique({
      where: { id: parentId },
      select: { projectId: true },
    });
    if (!parent || parent.projectId !== id || !(await canAccessFolder(user.id, id, parentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const folders = await prisma.projectFolder.findMany({
      where: { projectId: id, parentId },
      include: { _count: { select: { files: true, children: true } } },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(folders);
  }

  // Main (root) folders — filtered to whatever this user is allowed to see.
  const allowed = await getAllowedFolderRootIds(user.id, id);
  const folders = await prisma.projectFolder.findMany({
    where: {
      projectId: id,
      parentId: null,
      ...(allowed === "ALL" ? {} : { id: { in: allowed } }),
    },
    include: { _count: { select: { files: true, children: true } } },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(folders);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, order, parentId } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

  if (parentId) {
    // Creating a subfolder — confirm the parent belongs to this project and
    // that the caller can actually reach it.
    const parent = await prisma.projectFolder.findUnique({
      where: { id: parentId },
      select: { projectId: true },
    });
    if (!parent || parent.projectId !== id || !(await canAccessFolder(user.id, id, parentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const folder = await prisma.projectFolder.create({
    data: {
      projectId: id,
      name: name.trim(),
      description: description ?? null,
      order: order ?? 1,
      parentId: parentId ?? null,
    },
  });

  if (parentId) {
    // A brand-new subfolder starts at 0% — bubble that into its parent chain.
    await recalcFolderAndProjectProgress(parentId);
  } else if (access.role !== "OWNER") {
    // A restricted member just created a new main folder — grant them
    // access to it so they don't immediately lose sight of what they made.
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: user.id } },
    });
    if (member && !member.allFolders) {
      await prisma.projectMemberFolder.create({
        data: { memberId: member.id, folderId: folder.id },
      });
    }
  }

  return NextResponse.json(folder, { status: 201 });
}
