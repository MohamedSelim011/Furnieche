"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check, FileText, GripVertical, Loader2, MessageCircle, Pencil, Sparkles, Trash2, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { imgUrl } from "@/lib/img";
import { PhotoViewer } from "@/components/photo-viewer";
import { toast } from "sonner";

export type FolderFile = {
  id: string;
  name: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  progressPercent: number;
  _count?: { comments: number; imageEdits: number };
};

export function FileList({
  projectId,
  folderId,
  files,
  setFiles,
}: {
  projectId: string;
  folderId: string;
  files: FolderFile[];
  setFiles: React.Dispatch<React.SetStateAction<FolderFile[]>>;
}) {
  const [viewing, setViewing] = useState<FolderFile | null>(null);
  const photos = files.filter((f) => f.type === "IMAGE");
  const base = `/api/projects/${projectId}/folders/${folderId}/files`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const prev = files;
    const next = arrayMove(files, files.findIndex((f) => f.id === active.id), files.findIndex((f) => f.id === over.id));
    setFiles(next);
    try {
      const res = await fetch(base, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((f) => f.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setFiles(prev);
      toast.error("Couldn't save the new order");
    }
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                projectId={projectId}
                base={base}
                onView={() => setViewing(file)}
                onChange={(patch) => setFiles((all) => all.map((f) => (f.id === file.id ? { ...f, ...patch } : f)))}
                onDeleted={() => setFiles((all) => all.filter((f) => f.id !== file.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {viewing && (
        <PhotoViewer
          photos={photos.map((p) => ({
            id: p.id,
            name: p.name,
            previewSrc: imgUrl("file", p.id, 320, p.url),
            src: imgUrl("file", p.id, 1600, p.url),
            originalUrl: p.url,
          }))}
          startIndex={Math.max(0, photos.findIndex((p) => p.id === viewing.id))}
          onClose={() => setViewing(null)}
          actions={(photo) => (
            <a
              href={`/chats/${projectId}?file=${photo.id}`}
              className="flex items-center gap-1.5 rounded-full bg-white text-gray-900 px-4 py-2.5 text-sm font-semibold"
            >
              <MessageCircle size={15} /> Chat about this photo
            </a>
          )}
        />
      )}
    </>
  );
}

function FileRow({
  file,
  projectId,
  base,
  onView,
  onChange,
  onDeleted,
}: {
  file: FolderFile;
  projectId: string;
  base: string;
  onView: () => void;
  onChange: (patch: Partial<FolderFile>) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: file.id });

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(file.name);
  const [savingName, setSavingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === file.name) {
      setName(file.name);
      setRenaming(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`${base}/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      onChange({ name: trimmed });
      setRenaming(false);
    } catch {
      toast.error("Couldn't rename the file");
    } finally {
      setSavingName(false);
    }
  }

  async function commitProgress(progressPercent: number) {
    setSavingProgress(true);
    try {
      const res = await fetch(`${base}/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to save progress");
    } finally {
      setSavingProgress(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`${base}/${file.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          res.status === 404 ? "You don't have permission to delete this, or it no longer exists" : data?.error
        );
      }
      onDeleted();
      toast.success("File removed");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to delete file");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const comments = file._count?.comments ?? 0;
  const isImage = file.type === "IMAGE";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-3",
        isDragging && "relative z-10 shadow-lg ring-2 ring-brand-200"
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="shrink-0 -ml-1 w-6 h-10 flex items-center justify-center text-gray-300 hover:text-gray-500 touch-none cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>

        {isImage ? (
          <button onClick={onView} className="shrink-0" aria-label="View photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl("file", file.id, 160, file.url)}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-14 h-14 rounded-xl object-cover bg-gray-100"
            />
          </button>
        ) : (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"
          >
            {file.type === "VIDEO" ? <Video size={18} className="text-brand-600" /> : <FileText size={18} className="text-brand-600" />}
          </a>
        )}

        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setName(file.name);
                    setRenaming(false);
                  }
                }}
                autoFocus
                className="flex-1 min-w-0 h-8 rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={saveName}
                disabled={savingName}
                aria-label="Save name"
                className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0"
              >
                {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </div>
          ) : (
            <button onClick={() => setRenaming(true)} className="group flex items-center gap-1.5 max-w-full text-left">
              <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
              <Pencil size={12} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
            </button>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              onClick={() => router.push(`/chats/${projectId}?file=${file.id}`)}
              className="flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 px-2 py-1 text-[11px] font-semibold"
            >
              <MessageCircle size={12} /> {comments > 0 ? comments : "Chat"}
            </button>
            {file.type === "DOCUMENT" && (
              <button
                onClick={() => router.push(`/projects/${projectId}/files/${file.id}/analysis`)}
                className="flex items-center gap-1 rounded-full bg-oak-50 text-oak-700 border border-oak-100 px-2 py-1 text-[11px] font-semibold"
              >
                <Sparkles size={12} /> Analyze
              </button>
            )}
            <span className="text-[11px] font-semibold text-gray-400 ml-auto">
              {savingProgress ? <Loader2 size={12} className="animate-spin" /> : `${file.progressPercent}%`}
            </span>
          </div>
        </div>

        <button
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete file"
          className="shrink-0 w-9 h-9 -mr-1 rounded-full flex items-center justify-center hover:bg-red-50 self-start"
        >
          <Trash2 size={16} className="text-red-400" />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={file.progressPercent}
        onChange={(e) => onChange({ progressPercent: Number(e.target.value) })}
        onMouseUp={(e) => commitProgress(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => commitProgress(Number((e.target as HTMLInputElement).value))}
        className="w-full mt-2.5 accent-brand-600"
      />

      {confirmDelete && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
          <p className="flex-1 text-xs font-medium text-red-700">Delete this file?</p>
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
            className="text-xs font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={remove}
            disabled={deleting}
            className="text-xs font-semibold text-white bg-red-500 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-60"
          >
            {deleting && <Loader2 size={12} className="animate-spin" />} Delete
          </button>
        </div>
      )}
    </div>
  );
}
