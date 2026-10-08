import { NextRequest, NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isPortalTokenValid } from "@/lib/authz";
import { CLIENT_COOKIE_NAME } from "@/lib/constants";
import { createChatMessage } from "@/lib/chat";
import { ImageEditError, editPhoto } from "@/lib/gemini";
import { uploadToMediaBucket } from "@/lib/storage";

// Generation runs after the response; give it room to finish on Vercel.
export const maxDuration = 120;

const DAILY_LIMIT_PER_LINK = 10;
const MAX_PROMPT = 500;

// POST /api/portal/image-edits — client asks AI to edit a folder photo.
// Body: { token, fileId, prompt }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const cookieStore = await cookies();
  const token = (typeof body?.token === "string" && body.token) || cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: { project: { select: { id: true, clientName: true, clientEmail: true } } },
  });
  if (!isPortalTokenValid(accessToken)) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "AI photo editing isn't available yet" }, { status: 503 });
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, MAX_PROMPT) : "";
  if (!prompt) return NextResponse.json({ error: "Describe the change you want" }, { status: 400 });

  const projectId = accessToken.projectId;
  const file = await prisma.projectFile.findFirst({
    where: { id: typeof body?.fileId === "string" ? body.fileId : "", folder: { projectId }, type: "IMAGE" },
  });
  if (!file) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const usedToday = await prisma.imageEdit.count({ where: { accessTokenId: accessToken.id, createdAt: { gte: since } } });
  if (usedToday >= DAILY_LIMIT_PER_LINK) {
    return NextResponse.json(
      { error: `You've reached today's limit of ${DAILY_LIMIT_PER_LINK} AI edits. Try again tomorrow.` },
      { status: 429 }
    );
  }

  const edit = await prisma.imageEdit.create({
    data: {
      projectId,
      fileId: file.id,
      prompt,
      clientName: accessToken.project.clientName,
      accessTokenId: accessToken.id,
    },
  });

  const message = await createChatMessage({
    projectId,
    body: prompt,
    clientName: accessToken.project.clientName,
    clientEmail: accessToken.project.clientEmail,
    imageEditId: edit.id,
  });

  after(async () => {
    try {
      const result = await editPhoto(file.url, prompt);
      const ext = result.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const url = await uploadToMediaBucket(`projects/${projectId}/ai-edits/${edit.id}.${ext}`, result.data, result.mimeType);
      await prisma.imageEdit.update({ where: { id: edit.id }, data: { status: "COMPLETED", resultUrl: url } });
    } catch (err) {
      console.error("[AI EDIT] failed:", err);
      await prisma.imageEdit.update({
        where: { id: edit.id },
        data: {
          status: "FAILED",
          error: err instanceof ImageEditError ? err.message : "The AI edit failed. Try again with a different request.",
        },
      });
    }
  });

  return NextResponse.json(message, { status: 202 });
}
