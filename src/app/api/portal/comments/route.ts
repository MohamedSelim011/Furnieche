import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { CLIENT_COOKIE_NAME } from "@/lib/constants";
import { sendNewCommentEmail } from "@/lib/email";
import { isPortalTokenValid } from "@/lib/authz";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { updateId, body: commentBody, clientName, clientEmail, token: bodyToken } = body;

  if (!updateId || !commentBody) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Prefer the httpOnly session cookie, but fall back to the token the page
  // already knows (belt-and-suspenders in case the cookie was never set or
  // got cleared by the client's browser — see #comment-bug fix).
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value ?? bodyToken;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the token is still valid
  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          engineer: { select: { email: true, name: true } },
        },
      },
    },
  });

  if (!isPortalTokenValid(accessToken)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Make sure the update actually belongs to this portal's project
  const update = await prisma.projectUpdate.findFirst({
    where: { id: updateId, projectId: accessToken.projectId },
    select: { id: true },
  });
  if (!update) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
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

  // Notify engineer via email. Scheduled with after() so the serverless
  // function isn't frozen/torn down before the send actually completes —
  // a bare fire-and-forget promise here would race the response teardown
  // and intermittently drop the email (see #email-reliability).
  if (process.env.RESEND_API_KEY && accessToken.project.engineer.email) {
    const engineerName =
      accessToken.project.engineer.name ??
      accessToken.project.engineer.email.split("@")[0];
    const engineerEmail = accessToken.project.engineer.email;
    const projectName = accessToken.project.name;
    const projectId = accessToken.projectId;

    after(() =>
      sendNewCommentEmail({
        engineerEmail,
        engineerName,
        clientName: clientName ?? "Your client",
        projectName,
        projectId,
        commentBody,
      }).catch((err) => console.error("Failed to send comment email:", err))
    );
  }

  return NextResponse.json(comment, { status: 201 });
}
