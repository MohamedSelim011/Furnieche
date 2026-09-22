import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";

// GET /api/projects/[id]/links — list the client portal links for this project
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
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const links = await prisma.accessToken.findMany({
    where: { projectId: id },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(links);
}

// POST /api/projects/[id]/links — create or regenerate a link of the given type
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

  const { type } = await req.json();
  if (type !== "OWNER" && type !== "VISITOR") {
    return NextResponse.json({ error: "Invalid link type" }, { status: 400 });
  }

  const link = await prisma.$transaction(async (tx) => {
    // Regenerating retires any existing active link of this type — a
    // previously shared link of that type stops working the moment a new
    // one is issued.
    await tx.accessToken.updateMany({
      where: { projectId: id, type, isActive: true },
      data: { isActive: false },
    });
    return tx.accessToken.create({
      data: { projectId: id, type, isActive: true },
    });
  });

  return NextResponse.json(link, { status: 201 });
}
