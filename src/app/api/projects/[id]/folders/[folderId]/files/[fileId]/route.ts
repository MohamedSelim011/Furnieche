import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit, canAccessFolder } from "@/lib/authz";
import { recalcFolderAndProjectProgress } from "@/lib/progress";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string; fileId: string }> }
) {
  const { id, folderId, fileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const folder = await prisma.projectFolder.findFirst({ where: { id: folderId, projectId: id } });
  if (!folder || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, url, progressPercent } = body;

  if (progressPercent !== undefined && (progressPercent < 0 || progressPercent > 100)) {
    return NextResponse.json({ error: "Progress must be between 0 and 100" }, { status: 400 });
  }

  const file = await prisma.projectFile.update({
    where: { id: fileId, folderId },
    data: {
      ...(name && { name: name.trim() }),
      ...(url && { url }),
      ...(progressPercent !== undefined && { progressPercent }),
    },
  });

  await recalcFolderAndProjectProgress(folderId);

  return NextResponse.json(file);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string; fileId: string }> }
) {
  const { id, folderId, fileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const folder = await prisma.projectFolder.findFirst({ where: { id: folderId, projectId: id } });
  if (!folder || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.projectFile.delete({ where: { id: fileId, folderId } });

  await recalcFolderAndProjectProgress(folderId);

  return new NextResponse(null, { status: 204 });
}
