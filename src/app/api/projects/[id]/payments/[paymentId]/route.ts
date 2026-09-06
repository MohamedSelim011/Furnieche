import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";

// PATCH /api/projects/[id]/payments/[paymentId] — engineer verifies or rejects a deposit
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role || !access.canViewBudget) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEdit(access)) {
    return NextResponse.json({ error: "You don't have permission to manage payments" }, { status: 403 });
  }

  const { status, amount, description } = await req.json();

  let parsedAmount: number | undefined;
  if (amount !== undefined) {
    parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.payment.update({
      where: { id: paymentId, projectId: id },
      data: {
        ...(status && { status }),
        ...(parsedAmount !== undefined && { amount: parsedAmount }),
        ...(description !== undefined && { description }),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/projects/[id]/payments/[paymentId] — engineer deletes a payment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const access = await getProjectAccess(user.id, id);
  if (!access.role || !access.canViewBudget) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEdit(access)) {
    return NextResponse.json({ error: "You don't have permission to manage payments" }, { status: 403 });
  }

  try {
    await prisma.payment.delete({ where: { id: paymentId, projectId: id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
