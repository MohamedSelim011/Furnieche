"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Loader2, Trash2, FolderOpen, FolderPlus, ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { FileList, type FolderFile } from "./file-list";
import { imgUrl } from "@/lib/img";

type ProjectFile = FolderFile;

type Subfolder = {
  id: string;
  name: string;
  progressPercent: number;
  _count: { files: number; children: number };
};

function typeForMime(mime: string): ProjectFile["type"] {
  if (mime.startsWith("image")) return "IMAGE";
  if (mime.startsWith("video")) return "VIDEO";
  return "DOCUMENT";
}

export default function FolderDetailPage() {
  const { id, folderId } = useParams<{ id: string; folderId: string }>();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folderName, setFolderName] = useState("");
  const [subfolders, setSubfolders] = useState<Subfolder[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [addingSubfolder, setAddingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  // Inline delete confirmation (window.confirm is silently blocked in some
  // mobile/in-app browsers, which made deleting impossible there)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const progressSources = [...subfolders.map((s) => s.progressPercent), ...files.map((f) => f.progressPercent)];
  const progress =
    progressSources.length > 0
      ? Math.round(progressSources.reduce((sum, p) => sum + p, 0) / progressSources.length)
      : 0;

  function load() {
    fetch(`/api/projects/${id}/folders/${folderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { name: string } | null) => setFolderName(data?.name ?? "Folder"))
      .catch(() => {});

    fetch(`/api/projects/${id}/folders?parentId=${folderId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSubfolders)
      .catch(() => {});

    fetch(`/api/projects/${id}/folders/${folderId}/files`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [id, folderId]);

  async function addSubfolder() {
    if (!newSubfolderName.trim()) return;
    setCreatingSubfolder(true);
    try {
      const res = await fetch(`/api/projects/${id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubfolderName.trim(), parentId: folderId }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSubfolders((prev) => [...prev, { ...created, _count: { files: 0, children: 0 } }]);
      setNewSubfolderName("");
      setAddingSubfolder(false);
      toast.success("Subfolder added");
    } catch {
      toast.error("Failed to add subfolder");
    } finally {
      setCreatingSubfolder(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setUploading(true);

    const results = await Promise.allSettled(
      selected.map(async (file) => {
        const ext = file.name.split(".").pop();
        const path = `projects/${id}/folders/${folderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("furniche-media")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from("furniche-media").getPublicUrl(path);

        const res = await fetch(`/api/projects/${id}/folders/${folderId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            url: publicUrl,
            type: typeForMime(file.type),
            sizeBytes: file.size,
          }),
        });
        if (!res.ok) throw new Error();
        return { file, created: await res.json() };
      })
    );

    const created: ProjectFile[] = [];
    let failedCount = 0;
    for (const result of results) {
      if (result.status === "fulfilled") {
        created.push(result.value.created);
      } else {
        failedCount++;
      }
    }
    if (created.length > 0) setFiles((prev) => [...prev, ...created]);
    // Pre-generate web versions now so clients never wait for the first conversion
    for (const f of created) {
      if (f.type !== "IMAGE") continue;
      for (const w of [160, 320, 1600] as const) fetch(imgUrl("file", f.id, w, f.url)).catch(() => {});
    }
    if (failedCount > 0) toast.error(`Failed to upload ${failedCount} file${failedCount > 1 ? "s" : ""}`);
    if (created.length > 0) toast.success("File(s) added");

    setUploading(false);
    e.target.value = "";
  }

  async function errorMessage(res: Response, fallback: string) {
    const data = await res.json().catch(() => null);
    if (res.status === 404) return "You don't have permission to delete this, or it no longer exists";
    return data?.error ?? fallback;
  }

  async function deleteSubfolder(subId: string) {
    setDeleting(subId);
    try {
      const res = await fetch(`/api/projects/${id}/folders/${subId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete subfolder"));
      setSubfolders((prev) => prev.filter((s) => s.id !== subId));
      toast.success("Subfolder removed");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to delete subfolder");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  function deleteConfirm(targetId: string, label: string, onConfirm: () => void) {
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
        <p className="flex-1 text-xs font-medium text-red-700">{label}</p>
        <button
          onClick={() => setConfirmDelete(null)}
          disabled={deleting === targetId}
          className="text-xs font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-white"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting === targetId}
          className="text-xs font-semibold text-white bg-red-500 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-60"
        >
          {deleting === targetId && <Loader2 size={12} className="animate-spin" />} Delete
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen max-w-md mx-auto flex items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto pb-8">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{folderName}</h1>
            <p className="text-xs text-gray-400">
              {subfolders.length > 0 && `${subfolders.length} subfolder${subfolders.length === 1 ? "" : "s"} · `}
              {files.length} file{files.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {subfolders.length > 0 && (
          <div className="space-y-2 mb-1">
            {subfolders.map((sub) => (
              <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <FolderOpen size={16} className="text-brand-600" />
                </div>
                <button
                  onClick={() => router.push(`/projects/${id}/folders/${sub.id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{sub.name}</p>
                  <p className="text-xs text-gray-400">
                    {sub._count.children > 0 && `${sub._count.children} subfolder${sub._count.children === 1 ? "" : "s"} · `}
                    {sub._count.files} file{sub._count.files === 1 ? "" : "s"} · {sub.progressPercent}%
                  </p>
                </button>
                <button
                  onClick={() => setConfirmDelete(sub.id)}
                  aria-label="Delete subfolder"
                  className="shrink-0 w-9 h-9 -my-1 rounded-full flex items-center justify-center hover:bg-red-50"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
                <button onClick={() => router.push(`/projects/${id}/folders/${sub.id}`)} className="shrink-0">
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              </div>
              {confirmDelete === sub.id &&
                deleteConfirm(sub.id, "Delete this subfolder and everything inside it?", () => deleteSubfolder(sub.id))}
              </div>
            ))}
          </div>
        )}

        {addingSubfolder ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-2">
            <Input
              placeholder="Subfolder name..."
              value={newSubfolderName}
              onChange={(e) => setNewSubfolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubfolder()}
              autoFocus
              className="h-10 text-sm flex-1"
            />
            <Button size="sm" onClick={addSubfolder} disabled={creatingSubfolder || !newSubfolderName.trim()}>Add</Button>
            <button onClick={() => { setAddingSubfolder(false); setNewSubfolderName(""); }} className="text-xs text-gray-400 px-1">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSubfolder(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm text-brand-600 font-semibold rounded-2xl border border-dashed border-brand-200 hover:bg-blue-50 transition-colors"
          >
            <FolderPlus size={15} /> Add subfolder
          </button>
        )}

        {files.length === 0 && subfolders.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">Nothing here yet</p>
        )}

        <FileList projectId={id} folderId={folderId} files={files} setFiles={setFiles} />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 px-3 text-sm text-brand-600 font-semibold rounded-2xl border border-dashed border-brand-200 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {uploading ? "Uploading..." : "Add file"}
        </button>
        <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
      </div>
    </div>
  );
}
