import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STATUSES = ["PROCESSING", "COMPLETED", "FAILED"] as const;
type CallbackStatus = (typeof STATUSES)[number];

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CONTRACT_SERVICE_TOKEN;
  const given = req.headers.get("x-service-token");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/internal/contract-analysis — results from the contract-service
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const analysisId: unknown = body?.analysisId;
  const status: unknown = body?.status;
  if (typeof analysisId !== "string" || !STATUSES.includes(status as CallbackStatus)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.contractAnalysis.findUnique({ where: { id: analysisId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Finished analyses are final — ignore late or repeated callbacks
  if (existing.status === "COMPLETED" || existing.status === "FAILED") {
    return NextResponse.json({ ok: true });
  }

  if (status === "COMPLETED" && (typeof body.result !== "object" || body.result === null)) {
    return NextResponse.json({ error: "Missing result" }, { status: 400 });
  }

  await prisma.contractAnalysis.update({
    where: { id: analysisId },
    data: {
      status: status as CallbackStatus,
      ...(status === "COMPLETED" && {
        result: body.result as Prisma.InputJsonValue,
        model: typeof body.model === "string" ? body.model : null,
        error: null,
      }),
      ...(status === "FAILED" && {
        error: typeof body.error === "string" ? body.error.slice(0, 500) : "Analysis failed",
      }),
    },
  });

  return NextResponse.json({ ok: true });
}
