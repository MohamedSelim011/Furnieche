import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { company: true },
  });

  return NextResponse.json({
    company: dbUser?.company ?? null,
    plan: dbUser?.company?.plan ?? "free",
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const { companyName, companyEmail, logoUrl } = await req.json();

  if (!companyName?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { companyId: true },
  });

  const companyData = {
    name: companyName.trim(),
    email: companyEmail?.trim() || null,
    ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
  };

  if (dbUser?.companyId) {
    await prisma.company.update({
      where: { id: dbUser.companyId },
      data: companyData,
    });
  } else {
    // Creating a brand-new company: the creator becomes its ADMIN so they
    // can actually invite teammates afterward — otherwise nobody could ever
    // become ADMIN and the team feature would be permanently locked.
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: companyData });
      await tx.user.update({
        where: { id: user.id },
        data: { companyId: company.id, role: "ADMIN" },
      });
    });
  }

  return NextResponse.json({ ok: true });
}
