import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";

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

  const folders = await prisma.projectFolder.findMany({
    where: { projectId: id },
    include: { _count: { select: { files: true } } },
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
  const { name, description, order } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

  const folder = await prisma.projectFolder.create({
    data: {
      projectId: id,
      name: name.trim(),
      description: description ?? null,
      order: order ?? 1,
    },
  });

  return NextResponse.json(folder, { status: 201 });
}
