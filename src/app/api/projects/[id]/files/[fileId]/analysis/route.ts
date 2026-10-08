import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getAnalyzableFile } from "@/lib/contract-analysis";

// A job still marked pending/processing after this long is treated as lost
// (e.g. the service restarted), so the engineer can start a new one.
const STALE_JOB_MS = 15 * 60 * 1000;

// GET /api/projects/[id]/files/[fileId]/analysis — latest analysis for a file
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const file = await getAnalyzableFile(user.id, id, fileId);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const analysis = await prisma.contractAnalysis.findFirst({
    where: { fileId, projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    file: { id: file.id, name: file.name, url: file.url, type: file.type },
    analysis,
  });
}

// POST /api/projects/[id]/files/[fileId]/analysis — start a new analysis
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const file = await getAnalyzableFile(user.id, id, fileId);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const serviceUrl = process.env.CONTRACT_SERVICE_URL;
  const serviceToken = process.env.CONTRACT_SERVICE_TOKEN;
  if (!serviceUrl || !serviceToken) {
    return NextResponse.json({ error: "Contract analysis is not configured" }, { status: 503 });
  }

  // Don't start a duplicate while one is already running for this file
  const running = await prisma.contractAnalysis.findFirst({
    where: {
      fileId,
      status: { in: ["PENDING", "PROCESSING"] },
      updatedAt: { gt: new Date(Date.now() - STALE_JOB_MS) },
    },
  });
  if (running) return NextResponse.json(running);

  const analysis = await prisma.contractAnalysis.create({
    data: { projectId: id, fileId, requestedById: user.id },
  });

  try {
    const res = await fetch(`${serviceUrl.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Service-Token": serviceToken },
      body: JSON.stringify({ analysis_id: analysis.id, file_url: file.url, file_name: file.name }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Service responded ${res.status}`);
  } catch (err) {
    console.error("Contract service unreachable:", err);
    const failed = await prisma.contractAnalysis.update({
      where: { id: analysis.id },
      data: { status: "FAILED", error: "The analysis service is unavailable. Try again later." },
    });
    return NextResponse.json(failed, { status: 502 });
  }

  return NextResponse.json(analysis, { status: 202 });
}
