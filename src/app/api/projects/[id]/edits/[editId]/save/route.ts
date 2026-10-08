import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { canAccessFolder, canEdit, getProjectAccess } from "@/lib/authz";
import { recalcFolderAndProjectProgress } from "@/lib/progress";

// POST /api/projects/[id]/edits/[editId]/save
// Adds a finished AI edit to the original photo's folder as a new file.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; editId: string }> }
) {
  const { id, editId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const edit = await prisma.imageEdit.findFirst({
    where: { id: editId, projectId: id, status: "COMPLETED" },
    include: { file: { select: { name: true, folderId: true } } },
  });
  if (!edit?.resultUrl || !(await canAccessFolder(user.id, id, edit.file.folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (edit.savedFileId) {
    return NextResponse.json({ error: "Already saved to the folder" }, { status: 409 });
  }

  const folderId = edit.file.folderId;
  const last = await prisma.projectFile.findFirst({
    where: { folderId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const ext = edit.resultUrl.split(".").pop() ?? "png";

  const created = await prisma.projectFile.create({
    data: {
      folderId,
      name: `${edit.file.name.replace(/\.[^.]+$/, "")} (AI edit).${ext}`,
      url: edit.resultUrl,
      type: "IMAGE",
      uploadedById: user.id,
      order: (last?.order ?? 0) + 1,
    },
  });
  await prisma.imageEdit.update({ where: { id: edit.id }, data: { savedFileId: created.id } });
  await recalcFolderAndProjectProgress(folderId);

  return NextResponse.json(created, { status: 201 });
}
