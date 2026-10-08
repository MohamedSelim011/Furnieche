import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";
import { getProjectAccess, canEdit } from "@/lib/authz";
import { isStorageUrl } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const { id } = await params;
  const body = await req.json();
  const { status, budget, coverUrl } = body;

  const validStatuses = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED", "DELAYED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const access = await getProjectAccess(user.id, id);
  if (!canEdit(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (budget !== undefined && !access.canViewBudget) {
    return NextResponse.json({ error: "You don't have access to budget details" }, { status: 403 });
  }

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(coverUrl === null && { coverUrl: null }),
        ...(isStorageUrl(coverUrl) && { coverUrl }),
        ...(budget !== undefined && { budget: budget === null ? null : parseFloat(budget) }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUser(user);

  const { id } = await params;

  // Only the owner can delete the project outright.
  const access = await getProjectAccess(user.id, id);
  if (access.role !== "OWNER") return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
