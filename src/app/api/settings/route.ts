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

  if (dbUser?.companyId) {
    await prisma.company.update({
      where: { id: dbUser.companyId },
      data: { name: companyName.trim(), email: companyEmail?.trim() || null },
    });
  } else {
    const company = await prisma.company.create({
      data: { name: companyName.trim(), email: companyEmail?.trim() || null },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
    });
  }

  return NextResponse.json({ ok: true });
}
