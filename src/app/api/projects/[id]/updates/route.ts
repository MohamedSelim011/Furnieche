import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { sendUpdatePublishedEmail } from "@/lib/email";
import { getProjectAccess, canEdit, canAccessFolder } from "@/lib/authz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates = await prisma.projectUpdate.findMany({
    where: { projectId: id },
    include: { media: true, comments: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(updates);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, description, category, location, media, isPublished, folderId } = body;

  if (folderId) {
    const folder = await prisma.projectFolder.findFirst({ where: { id: folderId, projectId: id } });
    if (!folder || !(await canAccessFolder(user.id, id, folderId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const update = await prisma.projectUpdate.create({
    data: {
      projectId: id,
      folderId: folderId ?? null,
      title,
      description: description ?? null,
      category: category ?? null,
      location: location ?? null,
      isPublished: isPublished ?? true,
      media: media?.length
        ? {
            create: media.map((m: { url: string; type: string; filename?: string; sizeBytes?: number }) => ({
              url: m.url,
              type: m.type,
              filename: m.filename ?? null,
              sizeBytes: m.sizeBytes ?? null,
            })),
          }
        : undefined,
    },
    include: { media: true },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      projectId: id,
      userId: user.id,
      action: "update.uploaded",
      metadata: { title, mediaCount: media?.length ?? 0, folderId: folderId ?? null },
    },
  });

  // Update project's updatedAt
  await prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });

  // Notify client via email when update is published
  if ((isPublished ?? true) && process.env.RESEND_API_KEY) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        accessTokens: { where: { isActive: true, type: "OWNER" }, take: 1 },
      },
    });

    if (project && project.accessTokens[0]) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const portalUrl = `${appUrl}/portal/${project.accessTokens[0].token}`;
      const engineerName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Your engineer";

      after(() =>
        sendUpdatePublishedEmail({
          clientEmail: project.clientEmail,
          clientName: project.clientName,
          projectName: project.name,
          engineerName,
          updateTitle: title,
          portalUrl,
        }).catch((err) => console.error("[EMAIL ERROR] sendUpdatePublishedEmail failed:", JSON.stringify(err, null, 2)))
      );
    }
  }

  return NextResponse.json(update, { status: 201 });
}
