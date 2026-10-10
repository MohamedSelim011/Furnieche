"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronRight, FileText, Folder, Loader2, MoreHorizontal, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { uploadCoverPhoto } from "@/lib/upload-cover";
import { imgUrl } from "@/lib/img";
import { SmartImg } from "@/components/smart-img";
import { categoryLabel } from "@/lib/constants";
import { toast } from "sonner";

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" | "DELAYED";

export type ProjectCardData = {
  id: string;
  name: string;
  clientName: string;
  status: string;
  category: string;
  categoryOther: string | null;
  updatedAt: Date;
  coverUrl: string | null;
  folderCount: number;
  fileCount: number;
  memberCount: number;
  progress: number;
};

export const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "ACTIVE", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "DELAYED", label: "Delayed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

// Stock photos shown until a project has its own update photos.
const CATEGORY_COVERS: Record<string, string> = {
  RESIDENTIAL: "/images/residential.jpg",
  COMMERCIAL: "/images/commercial.jpg",
  HOSPITALITY: "/images/hospitality.jpg",
  INDUSTRIAL: "/images/industrial.jpg",
  OTHER: "/images/interior.jpg",
};

function getStatusStyle(status: string) {
  switch (status) {
    case "ACTIVE":    return { bar: "bg-brand-500", pill: "bg-brand-50 text-brand-700" };
    case "ON_HOLD":   return { bar: "bg-amber-400", pill: "bg-amber-50 text-amber-700" };
    case "COMPLETED": return { bar: "bg-green-400", pill: "bg-green-50 text-green-700" };
    case "DELAYED":   return { bar: "bg-red-400",   pill: "bg-red-50 text-red-700" };
    default:          return { bar: "bg-gray-300",  pill: "bg-gray-100 text-gray-500" };
  }
}

function getCategoryVariant(category: string) {
  switch (category) {
    case "RESIDENTIAL": return "residential";
    case "COMMERCIAL":  return "commercial";
    case "HOSPITALITY": return "hospitality";
    case "INDUSTRIAL":  return "industrial";
    default:            return "other";
  }
}

export function ProjectCard({ project: initial }: { project: ProjectCardData }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial.status);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const style = getStatusStyle(status);
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const cover = coverUrl ?? CATEGORY_COVERS[initial.category] ?? CATEGORY_COVERS.OTHER;

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadCoverPhoto(file, initial.id);
      const res = await fetch(`/api/projects/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl: url }),
      });
      if (!res.ok) throw new Error("Failed to save project photo");
      setCoverUrl(imgUrl("cover", initial.id, 320, url));
      toast.success("Project photo updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update photo");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleStatusChange(next: ProjectStatus) {
    setMenuOpen(false);
    if (next === status) return;
    setSaving(true);
    const prev = status;
    setStatus(next); // optimistic
    try {
      const res = await fetch(`/api/projects/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      router.refresh();
    } catch {
      setStatus(prev); // revert
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={() => router.push(`/projects/${initial.id}`)}
      className="relative bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(28,26,23,0.06)] p-3 active:scale-[0.99] transition-transform cursor-pointer"
    >
      <div className="flex gap-3">
        <div className="relative w-[104px] h-[84px] shrink-0">
          <SmartImg src={cover} className="w-full h-full rounded-xl" />
          {uploadingCover && (
            <span className="absolute inset-0 rounded-xl bg-white/70 flex items-center justify-center">
              <Loader2 size={20} className="text-brand-600 animate-spin" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={getCategoryVariant(initial.category) as "residential" | "commercial" | "hospitality" | "industrial" | "other"}>
                {categoryLabel(initial.category, initial.categoryOther)}
              </Badge>
              {status !== "ACTIVE" && (
                <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5", style.pill)}>
                  {statusLabel}
                </span>
              )}
            </div>

            {/* Options menu (photo + status) — stops card navigation on interact */}
            <div className="relative -mr-1 -mt-1" onClick={(e) => e.stopPropagation()}>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
              <button
                type="button"
                aria-label="Project options"
                disabled={saving}
                onClick={() => setMenuOpen((o) => !o)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        coverInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Camera size={14} className="text-gray-500" />
                      {coverUrl ? "Change photo" : "Add photo"}
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Set status
                    </p>
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleStatusChange(opt.value)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", getStatusStyle(opt.value).bar)} />
                          {opt.label}
                        </span>
                        {opt.value === status && <Check size={14} className="text-brand-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <h3 className="font-bold text-gray-900 text-base mt-1.5 truncate">{initial.name}</h3>
          <p className="text-sm text-gray-500 truncate">Client: {initial.clientName}</p>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", style.bar)}
                style={{ width: `${initial.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-8 text-right">{initial.progress}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Folder size={14} className="text-gray-400" />
            {initial.folderCount} folder{initial.folderCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText size={14} className="text-gray-400" />
            {initial.fileCount} file{initial.fileCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-gray-400" />
            {initial.memberCount} member{initial.memberCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
          <ChevronRight size={15} className="text-gray-500" />
        </div>
      </div>
    </div>
  );
}
