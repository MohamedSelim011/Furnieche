import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const { id, folderId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, order, progressPercent } = body;

  if (progressPercent !== undefined && (progressPercent < 0 || progressPercent > 100)) {
    return NextResponse.json({ error: "Progress must be between 0 and 100" }, { status: 400 });
  }

  const folder = await prisma.projectFolder.update({
    where: { id: folderId, projectId: id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(order !== undefined && { order }),
      // Manual override — a folder with files will get this recalculated
      // back to the files' average the next time a file's progress changes.
      ...(progressPercent !== undefined && { progressPercent }),
    },
  });

  if (progressPercent !== undefined) {
    const folders = await prisma.projectFolder.findMany({
      where: { projectId: id },
      select: { progressPercent: true },
    });
    const projectProgress = Math.round(
      folders.reduce((sum, f) => sum + f.progressPercent, 0) / folders.length
    );
    await prisma.project.update({ where: { id }, data: { progressPercent: projectProgress } });
  }

  return NextResponse.json(folder);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const { id, folderId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectFolder.delete({ where: { id: folderId, projectId: id } });

  // Recompute overall project progress now that a folder is gone.
  const folders = await prisma.projectFolder.findMany({
    where: { projectId: id },
    select: { progressPercent: true },
  });
  const projectProgress =
    folders.length > 0
      ? Math.round(folders.reduce((sum, f) => sum + f.progressPercent, 0) / folders.length)
      : 0;
  await prisma.project.update({ where: { id }, data: { progressPercent: projectProgress } });

  return new NextResponse(null, { status: 204 });
}
