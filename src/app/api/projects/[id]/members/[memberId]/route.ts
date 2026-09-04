import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess } from "@/lib/authz";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (access.role !== "OWNER") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { role, canViewBudget } = await req.json();

  const member = await prisma.projectMember.update({
    where: { id: memberId, projectId: id },
    data: {
      ...(role && { role: role === "EDITOR" ? "EDITOR" : "VIEWER" }),
      ...(canViewBudget !== undefined && { canViewBudget: Boolean(canViewBudget) }),
    },
  });

  return NextResponse.json(member);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (access.role !== "OWNER") return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectMember.delete({ where: { id: memberId, projectId: id } });
  return new NextResponse(null, { status: 204 });
}
