import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";

// PATCH /api/projects/[id]/links/[tokenId] — revoke or restore a link
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> }
) {
  const { id, tokenId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { isActive } = await req.json();
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  try {
    const link = await prisma.accessToken.update({
      where: { id: tokenId, projectId: id },
      data: { isActive },
    });
    return NextResponse.json(link);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
