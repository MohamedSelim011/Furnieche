import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { sendCompanyInviteEmail } from "@/lib/email";

// GET /api/settings/team — list company members and pending invites
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.companyId) return NextResponse.json({ members: [], invites: [] });

  const [members, invites] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: dbUser.companyId },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.companyInvite.findMany({
      where: { companyId: dbUser.companyId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ members, invites, isAdmin: dbUser.role === "ADMIN" });
}

// POST /api/settings/team — invite a teammate by email (ADMIN only)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { company: true } });
  if (!dbUser?.companyId) {
    return NextResponse.json({ error: "Set up your company profile first" }, { status: 400 });
  }
  if (dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Only company admins can invite teammates" }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const invite = await prisma.companyInvite.create({
    data: {
      companyId: dbUser.companyId,
      email: email.trim().toLowerCase(),
      role: role === "ADMIN" ? "ADMIN" : "ENGINEER",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  if (process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    after(() =>
      sendCompanyInviteEmail({
        inviteEmail: invite.email,
        inviterName: dbUser.name ?? dbUser.email.split("@")[0],
        companyName: dbUser.company?.name ?? "your team",
        inviteUrl: `${appUrl}/invite/${invite.token}`,
      }).catch((err) => console.error("Failed to send invite email:", err))
    );
  }

  return NextResponse.json(invite, { status: 201 });
}
