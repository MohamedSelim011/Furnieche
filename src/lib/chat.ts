import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { imgUrl } from "@/lib/img";

export type ChatContext =
  | { kind: "file"; id: string; title: string; imageUrl: string | null; url: string; folderId: string }
  | { kind: "update"; id: string; title: string; imageUrl: string | null }
  | {
      kind: "edit";
      /** The ImageEdit id */
      id: string;
      /** The client's prompt */
      title: string;
      /** The generated photo, once ready */
      imageUrl: string | null;
      originalUrl: string;
      fileId: string;
      status: "PROCESSING" | "COMPLETED" | "FAILED";
      error: string | null;
      savedToFolder: boolean;
    };

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  from: "client" | "team";
  authorName: string;
  context: ChatContext | null;
};

/** Every message in a project's chat, including older update comments saved before chat existed. */
export function projectChatWhere(projectId: string): Prisma.CommentWhereInput {
  return {
    OR: [
      { projectId },
      { projectId: null, update: { projectId } },
      { projectId: null, file: { folder: { projectId } } },
    ],
  };
}

const messageInclude = {
  author: { select: { name: true, email: true } },
  update: {
    select: {
      id: true,
      title: true,
      media: { where: { type: "IMAGE" as const }, take: 1, select: { id: true, url: true } },
    },
  },
  file: { select: { id: true, name: true, url: true, type: true, folderId: true } },
  imageEdit: { include: { file: { select: { url: true } } } },
} satisfies Prisma.CommentInclude;

type CommentWithContext = Prisma.CommentGetPayload<{ include: typeof messageInclude }>;

function toMessage(c: CommentWithContext): ChatMessage {
  let context: ChatContext | null = null;
  if (c.imageEdit) {
    const e = c.imageEdit;
    context = {
      kind: "edit",
      id: e.id,
      title: e.prompt,
      imageUrl: e.resultUrl ? imgUrl("edit", e.id, 1080, e.resultUrl) : null,
      originalUrl: imgUrl("file", e.fileId, 640, e.file.url),
      fileId: e.fileId,
      status: e.status,
      error: e.error,
      savedToFolder: e.savedFileId !== null,
    };
  } else if (c.file) {
    context = {
      kind: "file",
      id: c.file.id,
      title: c.file.name,
      imageUrl: c.file.type === "IMAGE" ? imgUrl("file", c.file.id, 1080, c.file.url) : null,
      url: c.file.url,
      folderId: c.file.folderId,
    };
  } else if (c.update) {
    const m = c.update.media[0];
    context = { kind: "update", id: c.update.id, title: c.update.title, imageUrl: m ? imgUrl("media", m.id, 1080, m.url) : null };
  }
  const isTeam = c.authorId !== null;
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    from: isTeam ? "team" : "client",
    authorName: isTeam ? c.author?.name ?? c.author?.email?.split("@")[0] ?? "Team" : c.clientName ?? "Client",
    context,
  };
}

export async function getChatMessages(projectId: string, take = 300): Promise<ChatMessage[]> {
  const rows = await prisma.comment.findMany({
    where: projectChatWhere(projectId),
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.reverse().map(toMessage);
}

/**
 * Validates an optional attachment for a new message: the file or update must
 * belong to the project. Returns the fields to store, or null if invalid.
 */
export async function resolveAttachment(
  projectId: string,
  fileId: unknown,
  updateId: unknown
): Promise<{ fileId?: string; updateId?: string } | null> {
  if (typeof fileId === "string" && fileId) {
    const file = await prisma.projectFile.findFirst({ where: { id: fileId, folder: { projectId } }, select: { id: true } });
    return file ? { fileId: file.id } : null;
  }
  if (typeof updateId === "string" && updateId) {
    const update = await prisma.projectUpdate.findFirst({ where: { id: updateId, projectId }, select: { id: true } });
    return update ? { updateId: update.id } : null;
  }
  return {};
}

export async function createChatMessage(data: {
  projectId: string;
  body: string;
  authorId?: string;
  clientName?: string | null;
  clientEmail?: string | null;
  fileId?: string;
  updateId?: string;
  imageEditId?: string;
}): Promise<ChatMessage> {
  const row = await prisma.comment.create({
    data: {
      projectId: data.projectId,
      body: data.body.slice(0, 2000),
      authorId: data.authorId ?? null,
      clientName: data.clientName ?? null,
      clientEmail: data.clientEmail ?? null,
      fileId: data.fileId ?? null,
      updateId: data.updateId ?? null,
      imageEditId: data.imageEditId ?? null,
    },
    include: messageInclude,
  });
  return toMessage(row);
}

/** Client messages in a project newer than the user's last visit to its chat. */
export async function unreadClientCount(userId: string, projectId: string): Promise<number> {
  const read = await prisma.chatRead.findUnique({ where: { userId_projectId: { userId, projectId } } });
  return prisma.comment.count({
    where: {
      AND: [projectChatWhere(projectId), { authorId: null }, ...(read ? [{ createdAt: { gt: read.lastReadAt } }] : [])],
    },
  });
}

export async function markChatRead(userId: string, projectId: string) {
  await prisma.chatRead.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

/** Loads what a new message will be "about", for pre-filling the composer. */
export async function getAttachmentInfo(
  projectId: string,
  fileId?: string | null,
  updateId?: string | null
): Promise<Pick<ChatContext, "kind" | "id" | "title" | "imageUrl"> | null> {
  if (fileId) {
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, folder: { projectId } },
      select: { id: true, name: true, url: true, type: true },
    });
    if (file) {
      return { kind: "file", id: file.id, title: file.name, imageUrl: file.type === "IMAGE" ? imgUrl("file", file.id, 640, file.url) : null };
    }
  }
  if (updateId) {
    const update = await prisma.projectUpdate.findFirst({
      where: { id: updateId, projectId },
      select: { id: true, title: true, media: { where: { type: "IMAGE" }, take: 1, select: { id: true, url: true } } },
    });
    if (update) {
      const m = update.media[0];
      return { kind: "update", id: update.id, title: update.title, imageUrl: m ? imgUrl("media", m.id, 640, m.url) : null };
    }
  }
  return null;
}
