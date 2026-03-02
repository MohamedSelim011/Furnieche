import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { CLIENT_COOKIE_NAME } from "@/lib/constants";
import { sendNewCommentEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the token is still valid
  const accessToken = await prisma.accessToken.findUnique({
    where: { token, isActive: true },
    include: {
      project: {
        include: {
          engineer: { select: { email: true, name: true } },
        },
      },
    },
  });

  if (!accessToken) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await req.json();
  const { updateId, body: commentBody, clientName, clientEmail } = body;

  if (!updateId || !commentBody) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      updateId,
      body: commentBody,
      clientName: clientName ?? null,
      clientEmail: clientEmail ?? null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      projectId: accessToken.projectId,
      action: "comment.added",
      metadata: { updateId, clientName },
    },
  });

  // Notify engineer via email (non-blocking)
  if (process.env.RESEND_API_KEY && accessToken.project.engineer.email) {
    const engineerName =
      accessToken.project.engineer.name ??
      accessToken.project.engineer.email.split("@")[0];

    sendNewCommentEmail({
      engineerEmail: accessToken.project.engineer.email,
      engineerName,
      clientName: clientName ?? "Your client",
      projectName: accessToken.project.name,
      projectId: accessToken.projectId,
      commentBody,
    }).catch((err) => console.error("Failed to send comment email:", err));
  }

  return NextResponse.json(comment, { status: 201 });
}
