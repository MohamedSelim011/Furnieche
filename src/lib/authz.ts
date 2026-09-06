import { prisma } from "@/lib/prisma";

export type ProjectAccess = {
  /** OWNER = the engineer the project was created under (always full access). */
  role: "OWNER" | "EDITOR" | "VIEWER" | null;
  canViewBudget: boolean;
};

const NO_ACCESS: ProjectAccess = { role: null, canViewBudget: false };

/**
 * Resolves a user's access level for a project: the creating engineer is the
 * OWNER (full access, always sees budget); everyone else's access comes from
 * their ProjectMember row, if any. Returns NO_ACCESS if the user has neither.
 */
export async function getProjectAccess(
  userId: string,
  projectId: string
): Promise<ProjectAccess> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { engineerId: true },
  });
  if (!project) return NO_ACCESS;

  if (project.engineerId === userId) {
    return { role: "OWNER", canViewBudget: true };
  }

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) return NO_ACCESS;

  return { role: member.role, canViewBudget: member.canViewBudget };
}

export function canEdit(access: ProjectAccess): boolean {
  return access.role === "OWNER" || access.role === "EDITOR";
}

/**
 * A portal AccessToken is valid only if it's active AND not past its
 * expiresAt. Every route that accepts a client portal token should check
 * this — checking `isActive` alone (as several routes used to) leaves an
 * expired link fully functional for reading/writing payments and comments,
 * even though the portal page itself correctly shows "This link has expired".
 */
export function isPortalTokenValid<T extends { isActive: boolean; expiresAt: Date | null }>(
  accessToken: T | null
): accessToken is T {
  if (!accessToken || !accessToken.isActive) return false;
  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) return false;
  return true;
}
