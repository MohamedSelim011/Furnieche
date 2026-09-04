import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";

// PATCH /api/settings/team/members/[userId] — change a teammate's company role (ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.companyId || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.companyId !== dbUser.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { role } = await req.json();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: role === "ADMIN" ? "ADMIN" : "ENGINEER" },
  });

  return NextResponse.json(updated);
}

// DELETE /api/settings/team/members/[userId] — remove a teammate from the company (ADMIN only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.companyId || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.companyId !== dbUser.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.projectMember.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { companyId: null } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
