"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Trash2, FileText, Image as ImageIcon, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type ProjectFile = {
  id: string;
  name: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  progressPercent: number;
};

function fileIcon(type: ProjectFile["type"]) {
  if (type === "IMAGE") return <ImageIcon size={16} className="text-brand-600" />;
  if (type === "VIDEO") return <Video size={16} className="text-brand-600" />;
  return <FileText size={16} className="text-brand-600" />;
}

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
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const progress =
    files.length > 0
      ? Math.round(files.reduce((sum, f) => sum + f.progressPercent, 0) / files.length)
      : 0;

  useEffect(() => {
    fetch(`/api/projects/${id}/folders`)
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) => {
        setFolderName(data.find((f) => f.id === folderId)?.name ?? "Folder");
      })
      .catch(() => {});

    fetch(`/api/projects/${id}/folders/${folderId}/files`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, folderId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setUploading(true);

    // Upload files in parallel instead of one at a time — these are
    // independent Storage uploads + API calls, so serializing them just
    // adds up each file's latency instead of overlapping it.
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
    if (failedCount > 0) toast.error(`Failed to upload ${failedCount} file${failedCount > 1 ? "s" : ""}`);
    if (created.length > 0) toast.success("File(s) added");

    setUploading(false);
    e.target.value = "";
  }

  async function updateProgress(fileId: string, progressPercent: number) {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progressPercent } : f)));
  }

  async function commitProgress(fileId: string, progressPercent: number) {
    setSaving(fileId);
    try {
      const res = await fetch(`/api/projects/${id}/folders/${folderId}/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to save progress");
    } finally {
      setSaving(null);
    }
  }

  async function deleteFile(fileId: string) {
    if (!confirm("Delete this file?")) return;
    try {
      const res = await fetch(`/api/projects/${id}/folders/${folderId}/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File removed");
    } catch {
      toast.error("Failed to delete file");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto pb-8">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{folderName}</h1>
            <p className="text-xs text-gray-400">{files.length} file{files.length === 1 ? "" : "s"}</p>
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
        {files.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No files yet</p>
        )}

        {files.map((file) => (
          <div key={file.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <div className="flex items-center gap-3">
              <a href={file.url} target="_blank" rel="noreferrer" className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                {fileIcon(file.type)}
              </a>
              <div className="flex-1 min-w-0">
                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-800 truncate block hover:underline">
                  {file.name}
                </a>
              </div>
              <span className="text-xs font-semibold text-gray-400 shrink-0">
                {saving === file.id ? <Loader2 size={12} className="animate-spin" /> : `${file.progressPercent}%`}
              </span>
              <button onClick={() => deleteFile(file.id)} className="shrink-0">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={file.progressPercent}
              onChange={(e) => updateProgress(file.id, Number(e.target.value))}
              onMouseUp={(e) => commitProgress(file.id, Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => commitProgress(file.id, Number((e.target as HTMLInputElement).value))}
              className="w-full mt-2.5 accent-brand-600"
            />
          </div>
        ))}

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
