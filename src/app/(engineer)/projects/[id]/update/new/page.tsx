"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { X, Camera, FileImage, Loader2, Send, MapPin, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UPDATE_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type UploadedFile = {
  file: File;
  preview: string;
  progress: number;
  url?: string;
  error?: boolean;
};

type ProjectStep = {
  id: string;
  name: string;
  status: string;
  order: number;
};

const STEP_STATUS_LABEL: Record<string, string> = {
  PENDING: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
};

export default function NewUpdatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(UPDATE_CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [stepId, setStepId] = useState<string>(searchParams.get("stepId") ?? "");
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const now = new Date();
  const autoStamp = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    fetch(`/api/projects/${id}/steps`)
      .then((r) => r.json())
      .then((data: ProjectStep[]) => setSteps(data))
      .catch(() => {});
  }, [id]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const newFiles: UploadedFile[] = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setUploading(true);

    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      try {
        for (let p = 10; p <= 70; p += 20) {
          await new Promise((r) => setTimeout(r, 150));
          setFiles((prev) =>
            prev.map((pf) => (pf.preview === f.preview ? { ...pf, progress: p } : pf))
          );
        }

        const ext = f.file.name.split(".").pop();
        const path = `projects/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("furniche-media")
          .upload(path, f.file, { contentType: f.file.type });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("furniche-media")
          .getPublicUrl(path);

        setFiles((prev) =>
          prev.map((pf) =>
            pf.preview === f.preview ? { ...pf, progress: 100, url: publicUrl } : pf
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast.error(`Failed to upload ${f.file.name}: ${msg}`);
        setFiles((prev) =>
          prev.map((pf) =>
            pf.preview === f.preview ? { ...pf, progress: 100, error: true } : pf
          )
        );
      }
    }
    setUploading(false);
    e.target.value = "";
  }

  function removeFile(preview: string) {
    setFiles((prev) => {
      const file = prev.find((f) => f.preview === preview);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.preview !== preview);
    });
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Add a title for this update"); return; }
    if (uploading) { toast.error("Wait for uploads to complete"); return; }

    setSubmitting(true);
    try {
      const mediaUrls = files.filter((f) => f.url).map((f) => ({
        url: f.url!,
        type: f.file.type.startsWith("video") ? "VIDEO" : "IMAGE",
        filename: f.file.name,
        sizeBytes: f.file.size,
      }));

      const res = await fetch(`/api/projects/${id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          location: location.trim() || null,
          stepId: stepId || null,
          media: mediaUrls,
          isPublished: true,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Update posted!");
      router.back();
    } catch {
      toast.error("Failed to post update");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => router.back()} className="text-sm text-gray-500 font-medium">
          Cancel
        </button>
        <h1 className="text-base font-bold text-gray-900">Add Update</h1>
        <div className="w-16" />
      </div>

      {/* Auto-stamp banner */}
      <div className="mx-4 mt-4 bg-blue-50 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={14} className="text-brand-600" />
          <span className="font-medium">
            {location || "Site location"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>Auto-stamped:</span>
          <span className="font-semibold">{autoStamp}</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-36 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <Label>Update Title</Label>
          <Input
            placeholder="e.g. Executive desks installed"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Phase */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Layers size={13} className="text-gray-400" />
            Phase (optional)
          </Label>
          <select
            value={stepId}
            onChange={(e) => setStepId(e.target.value)}
            className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Not linked to a phase —</option>
            {steps.map((s) => (
              <option key={s.id} value={s.id}>
                Phase {s.order}: {s.name} · {STEP_STATUS_LABEL[s.status] ?? s.status}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>Category</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {UPDATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label>Location (optional)</Label>
          <Input
            placeholder="e.g. North Tower - Floor 4"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            icon={<MapPin size={15} />}
          />
        </div>

        {/* Visual Evidence */}
        <div className="space-y-2">
          <Label>Visual Evidence</Label>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-brand-300 hover:bg-blue-50 transition-colors"
          >
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center">
              <Camera size={22} className="text-brand-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Tap to upload photos</p>
            <p className="text-xs text-gray-400">High-res required for dispute protection</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Current Uploads
                </span>
                <span className="text-xs bg-brand-50 text-brand-600 font-semibold px-2 py-0.5 rounded-full">
                  {files.length} of {files.length}
                </span>
              </div>
              {files.map((f) => (
                <div key={f.preview} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                    {f.file.type.startsWith("image") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <FileImage size={20} className="text-gray-400 m-auto mt-2.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {f.file.name.length > 24 ? f.file.name.slice(0, 21) + "..." : f.file.name}
                      {" "}<span className="text-gray-400">{f.progress}%</span>
                    </p>
                    <div className="h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${f.error ? "bg-red-400" : "bg-brand-600"}`}
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  </div>
                  <button onClick={() => removeFile(f.preview)} className="shrink-0">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-400 text-center">
                * Uploading must complete before posting to ensure secure backup.
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label>Update Description</Label>
          <Textarea
            placeholder="Describe progress, materials used, or any blockers encountered on site..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px]"
          />
        </div>
      </div>

      {/* Submit Button — sits above the bottom nav bar */}
      <div className="fixed bottom-[60px] left-0 right-0 max-w-md mx-auto px-4 pb-3 pt-3 bg-white border-t border-gray-100">
        <Button
          fullWidth
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || uploading}
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" /> Posting...</>
          ) : uploading ? (
            <><Loader2 size={18} className="animate-spin" /> Uploading...</>
          ) : (
            <><Send size={18} /> Post Project Update</>
          )}
        </Button>
      </div>
    </div>
  );
}
