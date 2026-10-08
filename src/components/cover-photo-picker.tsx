"use client";

import { useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadCoverPhoto } from "@/lib/upload-cover";
import { isHeic } from "@/lib/img";
import { toast } from "sonner";

/** Uploads a project cover photo to storage and reports its public URL. */
export function CoverPhotoPicker({
  value,
  onChange,
  projectId,
  previewUrl,
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Known after creation; stores the photo alongside the project's other files. */
  projectId?: string;
  /** Web-friendly version to display (e.g. from the image service); defaults to value */
  previewUrl?: string | null;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      onChange(await uploadCoverPhoto(file, projectId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "relative w-full h-40 rounded-2xl overflow-hidden flex items-center justify-center transition-colors",
          value ? "bg-gray-100" : "border-2 border-dashed border-gray-200 bg-white/70 hover:bg-white"
        )}
      >
        {value ? (
          <>
            {previewUrl || !isHeic(value) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl ?? value} alt="Project cover" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-brand-50 text-brand-700">
                <Check size={22} />
                <span className="text-xs font-semibold">Photo added</span>
              </span>
            )}
            <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-black/55 text-white text-xs font-semibold px-3 py-1.5 backdrop-blur">
              <Camera size={13} /> Change
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-gray-400">
            <ImagePlus size={26} />
            <span className="text-sm font-semibold text-gray-600">Add project photo</span>
            <span className="text-xs">Shown on your dashboard and to your client</span>
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 size={24} className="text-brand-600 animate-spin" />
          </span>
        )}
      </button>
      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove photo"
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur"
        >
          <X size={15} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}
