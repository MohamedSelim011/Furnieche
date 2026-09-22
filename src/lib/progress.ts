import { prisma } from "@/lib/prisma";

async function recalcProjectFromRoots(projectId: string) {
  const rootFolders = await prisma.projectFolder.findMany({
    where: { projectId, parentId: null },
    select: { progressPercent: true },
  });
  const projectProgress =
    rootFolders.length > 0
      ? Math.round(rootFolders.reduce((sum, f) => sum + f.progressPercent, 0) / rootFolders.length)
      : 0;

  await prisma.project.update({
    where: { id: projectId },
    data: { progressPercent: projectProgress },
  });
}

/**
 * Recomputes a folder's progressPercent as the average of its direct files'
 * and direct subfolders' progressPercent, then bubbles that same
 * recalculation up through its parent chain. Once it reaches a main (root)
 * folder, the project's overall progressPercent is recomputed from all root
 * folders — a root folder's value already has its own subtree rolled into
 * it, so the project average never double-counts nested folders.
 */
export async function recalcFolderAndProjectProgress(folderId: string): Promise<void> {
  const folder = await prisma.projectFolder.findUnique({
    where: { id: folderId },
    select: { projectId: true, parentId: true },
  });
  if (!folder) return;

  const [files, children] = await Promise.all([
    prisma.projectFile.findMany({ where: { folderId }, select: { progressPercent: true } }),
    prisma.projectFolder.findMany({ where: { parentId: folderId }, select: { progressPercent: true } }),
  ]);
  const parts = [...files.map((f) => f.progressPercent), ...children.map((c) => c.progressPercent)];
  const folderProgress =
    parts.length > 0 ? Math.round(parts.reduce((sum, p) => sum + p, 0) / parts.length) : 0;

  await prisma.projectFolder.update({
    where: { id: folderId },
    data: { progressPercent: folderProgress },
  });

  if (folder.parentId) {
    await recalcFolderAndProjectProgress(folder.parentId);
    return;
  }

  await recalcProjectFromRoots(folder.projectId);
}

/**
 * Bubbles a progress change upward without recomputing the folder itself —
 * used after a folder is deleted, or after a folder's progress was set
 * directly (a manual override), where the folder's own value is already
 * final and only its ancestors need to catch up.
 */
export async function propagateProgressUpward(projectId: string, parentId: string | null): Promise<void> {
  if (parentId) {
    await recalcFolderAndProjectProgress(parentId);
    return;
  }
  await recalcProjectFromRoots(projectId);
}
