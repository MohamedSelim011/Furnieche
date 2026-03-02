"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function SharePortalButton({ token, projectName }: { token: string; projectName: string }) {
  function handleShare() {
    const url = `${window.location.origin}/portal/${token}`;
    if (navigator.share) {
      navigator.share({ title: projectName, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Client portal link copied!");
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm"
    >
      <Share2 size={16} className="text-gray-600" />
    </button>
  );
}
