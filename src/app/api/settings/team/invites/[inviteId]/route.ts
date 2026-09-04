import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";

// DELETE /api/settings/team/invites/[inviteId] — revoke a pending invite (ADMIN only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const { inviteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.companyId || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const invite = await prisma.companyInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.companyId !== dbUser.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.companyInvite.delete({ where: { id: inviteId } });
  return new NextResponse(null, { status: 204 });
}
