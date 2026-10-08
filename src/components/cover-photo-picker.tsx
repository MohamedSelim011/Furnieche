"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_MB = 10;

/** Uploads a project cover photo to storage and reports its public URL. */
export function CoverPhotoPicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Photo must be under ${MAX_MB} MB`);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `projects/covers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("furniche-media").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("furniche-media").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      toast.error("Failed to upload photo");
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Project cover" className="absolute inset-0 w-full h-full object-cover" />
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
