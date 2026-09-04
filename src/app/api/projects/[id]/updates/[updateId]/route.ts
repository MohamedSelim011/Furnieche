import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  const { id, updateId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update = await prisma.projectUpdate.findFirst({
    where: { id: updateId, projectId: id },
  });
  if (!update) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectUpdate.delete({ where: { id: updateId } });
  return new NextResponse(null, { status: 204 });
}
