import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { sendClientPortalEmail } from "@/lib/email";
import { getPlan } from "@/lib/plans";
import { DEFAULT_FOLDERS } from "@/lib/constants";
import { isStorageUrl } from "@/lib/storage";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  // Projects the user owns, plus projects a teammate has shared with them.
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { engineerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      folders: { select: { progressPercent: true } },
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
  const { name, category, clientName, clientEmail, location, startDate, estimatedEndDate, budget, coverUrl } = body;

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
      budget: budget ?? null,
      coverUrl: isStorageUrl(coverUrl) ? coverUrl : null,
      engineerId: user.id,
      companyId: dbUser?.company?.id ?? null,
      // Every project starts with the same three folders — Contract, Design,
      // Site. The engineer can rename/delete/add to these afterward.
      folders: {
        create: DEFAULT_FOLDERS.map((f) => ({
          name: f.name,
          description: f.description,
          order: f.order,
          isDefault: true,
        })),
      },
      // Two client links: the OWNER link sees everything including the
      // wallet (this is what gets emailed to the client below); the
      // VISITOR link sees everything except the wallet, for handing out
      // to anyone else who shouldn't see financials.
      accessTokens: {
        create: [
          { isActive: true, type: "OWNER" },
          { isActive: true, type: "VISITOR" },
        ],
      },
    },
    include: { accessTokens: true },
  });

  const accessToken = project.accessTokens.find((t) => t.type === "OWNER");

  // Send client portal email — scheduled with after() so it isn't cut off
  // by the function freezing right after we return the response below.
  if (accessToken && process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portalUrl = `${appUrl}/portal/${accessToken.token}`;
    const engineerName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Your engineer";

    after(() =>
      sendClientPortalEmail({
        clientName,
        clientEmail,
        projectName: name,
        engineerName,
        portalUrl,
      }).catch((err) => console.error("[EMAIL ERROR] sendClientPortalEmail failed:", JSON.stringify(err, null, 2)))
    );
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
