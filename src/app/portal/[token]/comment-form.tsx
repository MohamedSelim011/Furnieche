"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

export function CommentForm({
  updateId,
  clientName,
  clientEmail,
}: {
  updateId: string;
  clientName: string;
  clientEmail: string;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId, body: body.trim(), clientName, clientEmail }),
      });
      if (!res.ok) throw new Error();
      setBody("");
      toast.success("Comment posted");
      // Refresh to show new comment
      window.location.reload();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
      <input
        type="text"
        placeholder="Add a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="flex-1 h-9 text-sm px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
      />
      <button
        type="submit"
        disabled={loading || !body.trim()}
        className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center disabled:opacity-50"
      >
        <Send size={14} className="text-white" />
      </button>
    </form>
  );
}
