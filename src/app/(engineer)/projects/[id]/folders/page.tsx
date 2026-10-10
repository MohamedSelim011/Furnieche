"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Loader2,
  Trash2, Pencil, FolderOpen, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Folder = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  progressPercent: number;
  isDefault: boolean;
  _count: { files: number; children: number };
};

export default function FoldersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  // Inline confirm — window.confirm is silently blocked in some mobile browsers
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const totalFolders = folders.length;
  const progress =
    totalFolders > 0
      ? Math.round(folders.reduce((sum, f) => sum + f.progressPercent, 0) / totalFolders)
      : 0;

  useEffect(() => {
    fetch(`/api/projects/${id}/folders`)
      .then((r) => r.json())
      .then((data) => { setFolders(data); setLoading(false); })
      .catch(() => { toast.error("Failed to load folders"); setLoading(false); });
  }, [id]);

  async function addFolder() {
    if (!newFolderName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), order: folders.length + 1 }),
      });
      if (!res.ok) throw new Error();
      const folder = await res.json();
      setFolders((prev) => [...prev, { ...folder, _count: { files: 0, children: 0 } }]);
      setNewFolderName("");
      setAddingFolder(false);
      toast.success("Folder added");
    } catch {
      toast.error("Failed to add folder");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFolder(folderId: string) {
    setConfirmDeleteId(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/folders/${folderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      toast.success("Folder removed");
    } catch {
      toast.error("Failed to delete folder");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(folderId: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error();
      setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: editName.trim() } : f)));
      setEditingId(null);
      toast.success("Folder updated");
    } catch {
      toast.error("Failed to update folder");
    } finally {
      setSaving(false);
    }
  }

  function updateProgressLocally(folderId: string, progressPercent: number) {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, progressPercent } : f)));
  }

  async function commitProgress(folderId: string, progressPercent: number) {
    try {
      const res = await fetch(`/api/projects/${id}/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to save progress");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen max-w-md mx-auto flex items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto pb-28">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Folders</h1>
            <p className="text-xs text-gray-400">{totalFolders} folder{totalFolders === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      {/* Add folder stays pinned at the top */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-[#f8f5f0]/90 backdrop-blur border-b border-gray-100">
        {addingFolder ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex gap-2">
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFolder()}
              autoFocus
              className="h-10 text-sm flex-1"
            />
            <Button size="sm" className="h-10" onClick={addFolder} disabled={saving || !newFolderName.trim()}>Add</Button>
            <button onClick={() => { setAddingFolder(false); setNewFolderName(""); }} className="text-xs text-gray-400 px-1">
              Cancel
            </button>
          </div>
        ) : (
          <Button fullWidth className="h-11" onClick={() => setAddingFolder(true)}>
            <Plus size={16} /> Add folder
          </Button>
        )}
      </div>

      {/* Folders List */}
      <div className="px-4 pt-4 space-y-2">
        {folders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No folders yet</p>
          </div>
        )}

        {folders.map((folder) => (
          <div key={folder.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <FolderOpen size={16} className="text-brand-600" />
              </div>

              {editingId === folder.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(folder.id)}
                    autoFocus
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={() => saveEdit(folder.id)} disabled={saving}>Save</Button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/projects/${id}/folders/${folder.id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{folder.name}</p>
                  <p className="text-xs text-gray-400">
                    {folder._count.children > 0 && `${folder._count.children} subfolder${folder._count.children === 1 ? "" : "s"} · `}
                    {folder._count.files} file{folder._count.files === 1 ? "" : "s"} · {folder.progressPercent}%
                  </p>
                </button>
              )}

              {editingId !== folder.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingId(folder.id); setEditName(folder.name); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
                  >
                    <Pencil size={13} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(folder.id)}
                    aria-label="Delete folder"
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={15} className="text-red-400" />
                  </button>
                  <button
                    onClick={() => router.push(`/projects/${id}/folders/${folder.id}`)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
                  >
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                </div>
              )}
            </div>
            {confirmDeleteId === folder.id && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                <p className="flex-1 text-xs font-medium text-red-700">Delete this folder and all its files?</p>
                <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-white">
                  Cancel
                </button>
                <button
                  onClick={() => deleteFolder(folder.id)}
                  disabled={saving}
                  className="text-xs font-semibold text-white bg-red-500 px-3 py-1.5 rounded-lg disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            )}
            {editingId !== folder.id && (
              <>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={folder.progressPercent}
                  onChange={(e) => updateProgressLocally(folder.id, Number(e.target.value))}
                  onMouseUp={(e) => commitProgress(folder.id, Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => commitProgress(folder.id, Number((e.target as HTMLInputElement).value))}
                  className="w-full mt-2.5 accent-brand-600"
                />
                {folder._count.files > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Auto-tracks the average of its {folder._count.files} file{folder._count.files === 1 ? "" : "s"} — dragging this overrides it until a file's progress next changes.
                  </p>
                )}
              </>
            )}
          </div>
        ))}

      </div>
    </div>
  );
}
