"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Project deleted");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to delete project");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-500 font-medium">Delete project?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-bold text-white bg-red-500 px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Yes, Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-medium text-gray-400 px-2 py-1.5"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center"
      title="Delete project"
    >
      <Trash2 size={16} className="text-red-400" />
    </button>
  );
}
