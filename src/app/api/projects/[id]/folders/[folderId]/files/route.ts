import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit, canAccessFolder } from "@/lib/authz";
import { recalcFolderAndProjectProgress } from "@/lib/progress";

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

  // Confirm folderId actually belongs to this project (otherwise a valid
  // access check on `id` would let someone read another project's files by
  // guessing/enumerating a folderId), and that this user's per-folder
  // access grants — if they have any — cover this folder.
  const folder = await prisma.projectFolder.findFirst({ where: { id: folderId, projectId: id } });
  if (!folder || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const files = await prisma.projectFile.findMany({
    where: { folderId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { comments: true, imageEdits: true } } },
  });

  return NextResponse.json(files);
}

// POST /api/projects/[id]/folders/[folderId]/files
// The client uploads the raw file to Supabase Storage first, then posts the
// resulting URL/metadata here to attach it to the folder.
export async function POST(
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

  const folder = await prisma.projectFolder.findFirst({ where: { id: folderId, projectId: id } });
  if (!folder || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, url, type, sizeBytes, progressPercent } = body;
  if (!name?.trim() || !url) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const last = await prisma.projectFile.findFirst({
    where: { folderId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const file = await prisma.projectFile.create({
    data: {
      folderId,
      name: name.trim(),
      url,
      type: type ?? "DOCUMENT",
      sizeBytes: sizeBytes ?? null,
      progressPercent: progressPercent ?? 0,
      uploadedById: user.id,
      order: (last?.order ?? 0) + 1,
    },
  });

  await recalcFolderAndProjectProgress(folderId);

  return NextResponse.json(file, { status: 201 });
}

// PUT /api/projects/[id]/folders/[folderId]/files
// Body: { ids: string[] } — the folder's file ids in their new display order.
export async function PUT(
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

  const folder = await prisma.projectFolder.findFirst({ where: { id: folderId, projectId: id } });
  if (!folder || !(await canAccessFolder(user.id, id, folderId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  // Every id must belong to this folder
  const count = await prisma.projectFile.count({ where: { folderId, id: { in: ids as string[] } } });
  if (count !== ids.length) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  await prisma.$transaction(
    (ids as string[]).map((fileId, index) =>
      prisma.projectFile.update({ where: { id: fileId }, data: { order: index + 1 } })
    )
  );

  return new NextResponse(null, { status: 204 });
}
