"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Wallet, DollarSign, CheckCircle2, XCircle, Clock,
  Upload, Loader2, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PortalNav } from "../portal-nav";

type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";
type PaymentType = "REQUEST" | "DEPOSIT";

type Payment = {
  id: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  description: string | null;
  screenshotUrl: string | null;
  createdAt: string;
};

type WalletData = {
  payments: Payment[];
  budget: number | null;
  totalRequested: number;
  totalPaid: number;
  balance: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

export default function ClientWalletPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const supabase = createClient();

  async function load() {
    try {
      const res = await fetch(`/api/portal/payments?token=${token}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `payment-proofs/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("furniche-media").upload(path, file, { contentType: file.type, upsert: true });
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

  async function handleSubmitDeposit() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) { toast.error("Enter a valid amount"); return; }
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
      setDepositAmount(""); setDepositNote(""); setScreenshotUrl(null); setShowForm(false);
      load();
    } catch {
      toast.error("Failed to submit deposit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
        <PortalNav token={token} />
        <div className="flex items-center justify-center h-screen">
          <Loader2 size={24} className="animate-spin text-brand-600" />
        </div>
      </div>
    );
  }

  const balance = data?.balance ?? 0;
  const isOwed = balance > 0;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto pb-24">
      <PortalNav token={token} />

      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-1">
          Billing & Payments
        </p>
        <h1 className="text-xl font-bold text-gray-900">Your Wallet</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Balance Card */}
        <div className={`rounded-2xl p-5 ${isOwed ? "bg-red-500" : "bg-green-600"}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Balance Due</p>
          <p className="text-4xl font-extrabold text-white">{fmt(Math.abs(balance))}</p>
          <p className="text-sm text-white/80 mt-1">
            {isOwed ? "You still owe this amount" : balance < 0 ? "You have a credit" : "All payments settled"}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Budget</p>
              <p className="text-sm font-bold text-white">{data?.budget != null ? fmt(data.budget) : "—"}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Invoiced</p>
              <p className="text-sm font-bold text-white">{fmt(data?.totalRequested ?? 0)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Paid</p>
              <p className="text-sm font-bold text-white">{fmt(data?.totalPaid ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Submit Deposit */}
        {!showForm ? (
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
        ) : (
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
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Payment Screenshot (optional)</label>
              {screenshotUrl ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshotUrl} alt="proof" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                  <div>
                    <p className="text-xs text-green-600 font-semibold">Screenshot uploaded</p>
                    <button onClick={() => setScreenshotUrl(null)} className="text-xs text-red-400">Remove</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1.5 text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                  <span className="text-xs font-medium">{uploading ? "Uploading..." : "Tap to upload screenshot"}</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmitDeposit}
                disabled={submitting}
                className="flex-1 bg-brand-600 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "Submit Deposit"}
              </button>
              <button
                onClick={() => { setShowForm(false); setScreenshotUrl(null); setDepositAmount(""); setDepositNote(""); }}
                className="text-sm text-gray-400 font-medium px-3"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">History</p>
          {!data || data.payments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Wallet size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payment activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.payments.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      p.type === "REQUEST" ? "bg-blue-50" : "bg-green-50"
                    }`}>
                      {p.type === "REQUEST"
                        ? <DollarSign size={16} className="text-brand-600" />
                        : <Upload size={16} className="text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{fmt(p.amount)}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          p.type === "REQUEST" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                        }`}>
                          {p.type === "REQUEST" ? "Invoice" : "Your deposit"}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          p.status === "VERIFIED" ? "bg-green-100 text-green-700"
                          : p.status === "REJECTED" ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                        }`}>
                          {p.status === "VERIFIED" ? <CheckCircle2 size={9} />
                            : p.status === "REJECTED" ? <XCircle size={9} />
                            : <Clock size={9} />}
                          {p.status === "VERIFIED" ? "Verified"
                            : p.status === "REJECTED" ? "Rejected"
                            : "Awaiting verification"}
                        </span>
                      </div>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                      {p.screenshotUrl && (
                        <button
                          onClick={() => setSelectedScreenshot(p.screenshotUrl)}
                          className="mt-1.5 flex items-center gap-1 text-xs text-brand-600 font-semibold"
                        >
                          <ImageIcon size={12} /> View screenshot
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-center text-gray-300 uppercase tracking-widest pb-4">
          Furniche Secure Payment Portal
        </p>
      </div>

      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedScreenshot} alt="Payment proof" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
