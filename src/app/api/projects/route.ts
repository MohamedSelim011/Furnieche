import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { sendClientPortalEmail } from "@/lib/email";
import { getPlan } from "@/lib/plans";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const projects = await prisma.project.findMany({
    where: { engineerId: user.id },
    include: {
      steps: { select: { status: true } },
      _count: { select: { updates: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  // Enforce plan project limit
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { company: true },
  });
  const planKey = dbUser?.company?.plan ?? "free";
  const plan = getPlan(planKey);
  if (plan.maxProjects !== Infinity) {
    const count = await prisma.project.count({ where: { engineerId: user.id } });
    if (count >= plan.maxProjects) {
      return NextResponse.json(
        { error: `You've reached the ${plan.label} plan limit of ${plan.maxProjects} projects. Upgrade to create more.` },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const { name, category, clientName, clientEmail, location, startDate, estimatedEndDate, steps } = body;

  if (!name || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      category: category ?? "RESIDENTIAL",
      clientName,
      clientEmail,
      location: location || null,
      startDate: startDate ? new Date(startDate) : null,
      estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
      engineerId: user.id,
      steps: steps?.length
        ? {
            create: steps.map((s: { name: string; description?: string; order: number }) => ({
              name: s.name,
              description: s.description ?? null,
              order: s.order,
            })),
          }
        : undefined,
      accessTokens: {
        create: [{ isActive: true }],
      },
    },
  });

  // Fetch the generated access token
  const accessToken = await prisma.accessToken.findFirst({
    where: { projectId: project.id, isActive: true },
  });

  // Send client portal email (non-blocking — don't fail project creation if email fails)
  if (accessToken && process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portalUrl = `${appUrl}/portal/${accessToken.token}`;
    const engineerName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Your engineer";

    sendClientPortalEmail({
      clientName,
      clientEmail,
      projectName: name,
      engineerName,
      portalUrl,
    }).catch((err) => console.error("[EMAIL ERROR] sendClientPortalEmail failed:", JSON.stringify(err, null, 2)));
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      projectId: project.id,
      userId: user.id,
      action: "project.created",
      metadata: { name, clientEmail },
    },
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
