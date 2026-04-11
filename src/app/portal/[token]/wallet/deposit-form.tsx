"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Upload, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function DepositForm({ token }: { token: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `payment-proofs/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("furniche-media")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("furniche-media").getPublicUrl(path);
      setScreenshotUrl(publicUrl);
      toast.success("Screenshot uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/payments?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          description: depositNote || null,
          screenshotUrl,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Deposit submitted — your engineer will verify it shortly");
      setDepositAmount("");
      setDepositNote("");
      setScreenshotUrl(null);
      setShowForm(false);
      router.refresh(); // re-fetch server data to update history
    } catch {
      toast.error("Failed to submit deposit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-brand-600 text-white rounded-2xl p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
          <Upload size={18} />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">Upload Payment Proof</p>
          <p className="text-xs text-white/70">Submit a deposit screenshot for verification</p>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-4 space-y-3">
      <p className="text-sm font-bold text-gray-900">Submit Deposit</p>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-600">Amount Paid ($)</label>
        <div className="relative">
          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            min="0"
            placeholder="e.g. 5000"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="w-full h-12 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-600">Note (optional)</label>
        <input
          type="text"
          placeholder="e.g. Bank transfer ref #123456"
          value={depositNote}
          onChange={(e) => setDepositNote(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">
          Payment Screenshot (optional)
        </label>
        {screenshotUrl ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotUrl}
              alt="proof"
              className="w-16 h-16 rounded-xl object-cover border border-gray-200"
            />
            <div>
              <p className="text-xs text-green-600 font-semibold">Screenshot uploaded</p>
              <button onClick={() => setScreenshotUrl(null)} className="text-xs text-red-400">
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1.5 text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            <span className="text-xs font-medium">
              {uploading ? "Uploading..." : "Tap to upload screenshot"}
            </span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-brand-600 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : "Submit Deposit"}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setScreenshotUrl(null);
            setDepositAmount("");
            setDepositNote("");
          }}
          className="text-sm text-gray-400 font-medium px-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
