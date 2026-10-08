import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess } from "@/lib/authz";
import { createChatMessage, getChatMessages, markChatRead, resolveAttachment } from "@/lib/chat";

// GET /api/projects/[id]/chat — the project's chat (marks it read)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await getChatMessages(id);
  await markChatRead(user.id, id);
  return NextResponse.json({ messages });
}

// POST /api/projects/[id]/chat — team message. Body: { body, fileId?, updateId? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });

  const attachment = await resolveAttachment(id, body?.fileId, body?.updateId);
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  const message = await createChatMessage({ projectId: id, body: text, authorId: user.id, ...attachment });
  await markChatRead(user.id, id);
  return NextResponse.json(message, { status: 201 });
}
