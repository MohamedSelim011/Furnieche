import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPortalTokenValid } from "@/lib/authz";

// GET /api/portal/payments?token=xxx
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: { project: true },
  });

  if (!isPortalTokenValid(accessToken)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const projectId = accessToken.projectId;
  const project = accessToken.project;

  const payments = await prisma.payment.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  const totalRequested = payments
    .filter((p) => p.type === "REQUEST")
    .reduce((s, p) => s + p.amount, 0);

  const totalPaid = payments
    .filter((p) => p.type === "DEPOSIT" && p.status === "VERIFIED")
    .reduce((s, p) => s + p.amount, 0);

  return NextResponse.json({
    projectId,
    payments,
    budget: project.budget,
    totalRequested,
    totalPaid,
    balance: totalRequested - totalPaid,
  });
}

// POST /api/portal/payments?token=xxx — client submits a deposit
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
  });

  if (!isPortalTokenValid(accessToken)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const body = await req.json();
  const { amount, description, screenshotUrl } = body;

  const parsedAmount = parseFloat(amount);
  if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const payment = await prisma.payment.create({
    data: {
      projectId: accessToken.projectId,
      type: "DEPOSIT",
      status: "PENDING",
      amount: parsedAmount,
      description: description || null,
      screenshotUrl: screenshotUrl || null,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
