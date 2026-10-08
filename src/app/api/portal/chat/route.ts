import { NextRequest, NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isPortalTokenValid } from "@/lib/authz";
import { CLIENT_COOKIE_NAME } from "@/lib/constants";
import { createChatMessage, getChatMessages, resolveAttachment } from "@/lib/chat";
import { sendNewCommentEmail } from "@/lib/email";

async function resolvePortal(tokenFromRequest: string | null | undefined) {
  const cookieStore = await cookies();
  const token = tokenFromRequest || cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  if (!token) return null;
  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: {
      project: { select: { id: true, name: true, clientName: true, clientEmail: true, engineer: { select: { email: true, name: true } } } },
    },
  });
  return isPortalTokenValid(accessToken) ? accessToken : null;
}

// GET /api/portal/chat?token=... — the project's chat for the client
export async function GET(req: NextRequest) {
  const portal = await resolvePortal(req.nextUrl.searchParams.get("token"));
  if (!portal) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  return NextResponse.json({ messages: await getChatMessages(portal.projectId) });
}

// POST /api/portal/chat — client message. Body: { token, body, fileId?, updateId? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const portal = await resolvePortal(body?.token);
  if (!portal) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });

  const attachment = await resolveAttachment(portal.projectId, body?.fileId, body?.updateId);
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  const message = await createChatMessage({
    projectId: portal.projectId,
    body: text,
    clientName: portal.project.clientName,
    clientEmail: portal.project.clientEmail,
    ...attachment,
  });

  await prisma.auditLog.create({
    data: { projectId: portal.projectId, action: "chat.client_message", metadata: { messageId: message.id } },
  });

  const engineer = portal.project.engineer;
  if (process.env.RESEND_API_KEY && engineer.email) {
    after(() =>
      sendNewCommentEmail({
        engineerEmail: engineer.email,
        engineerName: engineer.name ?? engineer.email.split("@")[0],
        clientName: portal.project.clientName,
        projectName: portal.project.name,
        projectId: portal.projectId,
        commentBody: message.context ? `On "${message.context.title}": ${text}` : text,
      }).catch((err) => console.error("[EMAIL ERROR] chat notification failed:", err))
    );
  }

  return NextResponse.json(message, { status: 201 });
}
