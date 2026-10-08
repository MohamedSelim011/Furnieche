"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CoverPhotoPicker } from "@/components/cover-photo-picker";
import { imgUrl } from "@/lib/img";
import { toast } from "sonner";

export function ProjectCover({
  projectId,
  coverUrl,
  editable,
}: {
  projectId: string;
  coverUrl: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(coverUrl);

  if (!editable) {
    if (!coverUrl) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imgUrl("cover", projectId, 1080, coverUrl)} alt="" className="w-full h-40 rounded-2xl object-cover mb-4" />
    );
  }

  async function save(url: string | null) {
    const prev = value;
    setValue(url);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl: url }),
      });
      if (!res.ok) throw new Error();
      toast.success(url ? "Project photo updated" : "Project photo removed");
      router.refresh();
    } catch {
      setValue(prev);
      toast.error("Failed to save project photo");
    }
  }

  return (
    <CoverPhotoPicker
      value={value}
      previewUrl={value ? imgUrl("cover", projectId, 1080, value) : null}
      onChange={save}
      projectId={projectId}
      className="mb-4"
    />
  );
}
