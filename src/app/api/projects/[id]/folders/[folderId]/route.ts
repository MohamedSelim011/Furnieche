import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit, canAccessFolder } from "@/lib/authz";
import { propagateProgressUpward } from "@/lib/progress";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const { id, folderId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const folder = await prisma.projectFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.projectId !== id || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(folder);
}

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

  const existing = await prisma.projectFolder.findUnique({ where: { id: folderId } });
  if (!existing || existing.projectId !== id || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
      // Manual override — a folder with files/subfolders will get this
      // recalculated back to their average the next time one changes.
      ...(progressPercent !== undefined && { progressPercent }),
    },
  });

  if (progressPercent !== undefined) {
    await propagateProgressUpward(id, existing.parentId);
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

  const existing = await prisma.projectFolder.findUnique({ where: { id: folderId } });
  if (!existing || existing.projectId !== id || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Deleting a main folder also removes any per-member access grants that
  // pointed at it (cascades via the FK) and, via the self-relation cascade,
  // every subfolder and file nested underneath it.
  await prisma.projectFolder.delete({ where: { id: folderId, projectId: id } });

  await propagateProgressUpward(id, existing.parentId);

  return new NextResponse(null, { status: 204 });
}
