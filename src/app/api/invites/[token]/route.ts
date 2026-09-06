import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";

// GET /api/invites/[token] — public preview of an invite
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.companyInvite.findUnique({
    where: { token },
    include: { company: { select: { name: true, logoUrl: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invite.email,
    companyName: invite.company.name,
    companyLogoUrl: invite.company.logoUrl,
  });
}

// POST /api/invites/[token] — accept the invite as the currently logged-in user
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const invite = await prisma.companyInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Log in with that email to accept it.` },
      { status: 403 }
    );
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (dbUser?.companyId && dbUser.companyId !== invite.companyId) {
    return NextResponse.json(
      { error: "You already belong to a different company. Leave it before accepting this invite." },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { companyId: invite.companyId, role: invite.role },
    }),
    prisma.companyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
