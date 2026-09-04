import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";
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

  const files = await prisma.projectFile.findMany({
    where: { folderId },
    orderBy: { createdAt: "asc" },
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

  const body = await req.json();
  const { name, url, type, sizeBytes, progressPercent } = body;
  if (!name?.trim() || !url) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const file = await prisma.projectFile.create({
    data: {
      folderId,
      name: name.trim(),
      url,
      type: type ?? "DOCUMENT",
      sizeBytes: sizeBytes ?? null,
      progressPercent: progressPercent ?? 0,
      uploadedById: user.id,
    },
  });

  await recalcFolderAndProjectProgress(folderId);

  return NextResponse.json(file, { status: 201 });
}
