import { prisma } from "@/lib/prisma";
import type { User } from "@supabase/supabase-js";

/**
 * Ensures the Supabase auth user exists in our custom users table.
 * Called on any authenticated API action.
 */
export async function syncUser(authUser: User) {
  await prisma.user.upsert({
    where: { id: authUser.id },
    update: {
      email: authUser.email ?? "",
    },
    create: {
      id: authUser.id,
      email: authUser.email ?? "",
      name: authUser.user_metadata?.full_name ?? authUser.email?.split("@")[0] ?? null,
    },
  });
}
