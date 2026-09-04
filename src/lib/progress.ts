import { prisma } from "@/lib/prisma";

/**
 * Recomputes a folder's progressPercent as the average of its files'
 * progressPercent, then rolls that up into the project's overall
 * progressPercent as the average across all its folders.
 */
export async function recalcFolderAndProjectProgress(folderId: string) {
  const files = await prisma.projectFile.findMany({
    where: { folderId },
    select: { progressPercent: true },
  });
  const folderProgress =
    files.length > 0
      ? Math.round(files.reduce((sum, f) => sum + f.progressPercent, 0) / files.length)
      : 0;

  const folder = await prisma.projectFolder.update({
    where: { id: folderId },
    data: { progressPercent: folderProgress },
    select: { projectId: true },
  });

  const folders = await prisma.projectFolder.findMany({
    where: { projectId: folder.projectId },
    select: { progressPercent: true },
  });
  const projectProgress =
    folders.length > 0
      ? Math.round(folders.reduce((sum, f) => sum + f.progressPercent, 0) / folders.length)
      : 0;

  await prisma.project.update({
    where: { id: folder.projectId },
    data: { progressPercent: projectProgress },
  });
}
