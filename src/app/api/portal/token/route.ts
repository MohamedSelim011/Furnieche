import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/portal/token?token=xxx — resolve token to projectId
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    select: { projectId: true, isActive: true },
  });

  if (!accessToken || !accessToken.isActive) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  return NextResponse.json({ projectId: accessToken.projectId });
}
