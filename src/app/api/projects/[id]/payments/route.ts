import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit, isPortalTokenValid } from "@/lib/authz";

// GET /api/projects/[id]/payments — engineer or client via token
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tokenParam = req.nextUrl.searchParams.get("token");

  let project;

  if (tokenParam) {
    // Client access via portal token
    const accessToken = await prisma.accessToken.findUnique({
      where: { token: tokenParam },
      include: { project: true },
    });
    if (!isPortalTokenValid(accessToken) || accessToken.projectId !== id || accessToken.type !== "OWNER") {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }
    project = accessToken.project;
  } else {
    // Engineer/teammate access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await syncUser(user);
    const access = await getProjectAccess(user.id, id);
    if (!access.role || !access.canViewBudget) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    project = await prisma.project.findFirst({ where: { id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payments = await prisma.payment.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  const totalRequested = payments
    .filter((p) => p.type === "REQUEST")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = payments
    .filter((p) => p.type === "DEPOSIT" && p.status === "VERIFIED")
    .reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({
    payments,
    budget: project.budget,
    totalRequested,
    totalPaid,
    balance: totalRequested - totalPaid,
  });
}

// POST /api/projects/[id]/payments — engineer creates a REQUEST, or client creates a DEPOSIT via token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { amount, description, type, token } = body;

  const parsedAmount = parseFloat(amount);
  if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Client deposit via portal token
  if (type === "DEPOSIT" && token) {
    const accessToken = await prisma.accessToken.findUnique({
      where: { token },
      include: { project: true },
    });
    if (!isPortalTokenValid(accessToken) || accessToken.projectId !== id || accessToken.type !== "OWNER") {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const payment = await prisma.payment.create({
      data: {
        projectId: id,
        type: "DEPOSIT",
        status: "PENDING",
        amount: parsedAmount,
        description: description || null,
        screenshotUrl: body.screenshotUrl || null,
      },
    });
    return NextResponse.json(payment, { status: 201 });
  }

  // Engineer/teammate payment request
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role || !access.canViewBudget) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEdit(access)) {
    return NextResponse.json({ error: "You don't have permission to request payments" }, { status: 403 });
  }
  const project = await prisma.project.findFirst({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const paymentType = type === "DEPOSIT" ? "DEPOSIT" : "REQUEST";
  const payment = await prisma.payment.create({
    data: {
      projectId: id,
      type: paymentType,
      status: paymentType === "DEPOSIT" ? "VERIFIED" : "PENDING",
      amount: parsedAmount,
      description: description || null,
      screenshotUrl: body.screenshotUrl || null,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
