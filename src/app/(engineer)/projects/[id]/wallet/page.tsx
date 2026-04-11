"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, CheckCircle2, XCircle, Clock,
  Wallet, Trash2, DollarSign, ImageIcon, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function ProjectWalletPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [budget, setBudget] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/payments`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      if (json.budget != null) setBudget(String(json.budget));
    } catch {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveBudget() {
    setSavingBudget(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: budget ? parseFloat(budget) : null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Budget updated");
      load();
    } catch {
      toast.error("Failed to update budget");
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleCreatePayment(type: PaymentType) {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: parseFloat(amount), description }),
      });
      if (!res.ok) throw new Error();
      toast.success(type === "REQUEST" ? "Payment request sent" : "Deposit recorded");
      setAmount(""); setDescription("");
      setShowRequestForm(false); setShowDepositForm(false);
      load();
    } catch {
      toast.error("Failed to create payment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(paymentId: string, status: PaymentStatus) {
    try {
      const res = await fetch(`/api/projects/${projectId}/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === "VERIFIED" ? "Deposit verified" : "Deposit rejected");
      load();
    } catch {
      toast.error("Failed to update payment");
    }
  }

  async function handleDelete(paymentId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Payment deleted");
      load();
    } catch {
      toast.error("Failed to delete payment");
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-brand-600" />
        </div>
      </PageShell>
    );
  }

  const balance = data?.balance ?? 0;
  const isOwed = balance > 0;

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Project Wallet</h1>
          <p className="text-xs text-gray-400">Manage payments & deposits</p>
        </div>
      </div>

      <div className="px-4 pb-32 space-y-4">
        {/* Balance Card */}
        <div className={`rounded-2xl p-5 ${isOwed ? "bg-red-500" : "bg-brand-600"}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Outstanding Balance</p>
          <p className="text-4xl font-extrabold text-white">{fmt(Math.abs(balance))}</p>
          <p className="text-sm text-white/80 mt-1">
            {isOwed ? "Client still owes this amount" : balance < 0 ? "Client overpaid" : "Fully paid"}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Budget</p>
              <p className="text-sm font-bold text-white">{data?.budget != null ? fmt(data.budget) : "—"}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Requested</p>
              <p className="text-sm font-bold text-white">{fmt(data?.totalRequested ?? 0)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Paid</p>
              <p className="text-sm font-bold text-white">{fmt(data?.totalPaid ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Budget Setting */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Project Budget</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Set total project budget..."
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              icon={<DollarSign size={14} />}
            />
            <button
              onClick={handleSaveBudget}
              disabled={savingBudget}
              className="shrink-0 bg-brand-600 text-white text-sm font-semibold px-4 rounded-xl disabled:opacity-50"
            >
              {savingBudget ? "..." : "Save"}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setShowRequestForm(true); setShowDepositForm(false); }}
            className="bg-brand-600 text-white rounded-2xl p-4 text-left"
          >
            <Plus size={20} className="mb-2" />
            <p className="text-sm font-bold">Request Payment</p>
            <p className="text-xs text-white/70">Send invoice to client</p>
          </button>
          <button
            onClick={() => { setShowDepositForm(true); setShowRequestForm(false); }}
            className="bg-green-600 text-white rounded-2xl p-4 text-left"
          >
            <CheckCircle2 size={20} className="mb-2" />
            <p className="text-sm font-bold">Record Deposit</p>
            <p className="text-xs text-white/70">Log a payment received</p>
          </button>
        </div>

        {/* Request Form */}
        {showRequestForm && (
          <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-4 space-y-3">
            <p className="text-sm font-bold text-gray-900">New Payment Request</p>
            <div className="space-y-1.5">
              <Label>Amount ($)</Label>
              <Input type="number" min="0" placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value)} icon={<DollarSign size={14} />} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="e.g. Stage 1 — Materials deposit" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => handleCreatePayment("REQUEST")} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "Send Request"}
              </Button>
              <button onClick={() => setShowRequestForm(false)} className="text-sm text-gray-400 px-2">Cancel</button>
            </div>
          </div>
        )}

        {/* Deposit Form */}
        {showDepositForm && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-4 space-y-3">
            <p className="text-sm font-bold text-gray-900">Record Deposit</p>
            <div className="space-y-1.5">
              <Label>Amount ($)</Label>
              <Input type="number" min="0" placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value)} icon={<DollarSign size={14} />} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="e.g. Initial deposit via bank transfer" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => handleCreatePayment("DEPOSIT")} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "Record"}
              </Button>
              <button onClick={() => setShowDepositForm(false)} className="text-sm text-gray-400 px-2">Cancel</button>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Transactions</p>
          {data?.payments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Wallet size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.payments.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        p.type === "REQUEST" ? "bg-blue-50" : "bg-green-50"
                      }`}>
                        {p.type === "REQUEST" ? (
                          <DollarSign size={16} className="text-brand-600" />
                        ) : (
                          <CheckCircle2 size={16} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{fmt(p.amount)}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            p.type === "REQUEST"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {p.type === "REQUEST" ? "Invoice" : "Deposit"}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            p.status === "VERIFIED" ? "bg-green-100 text-green-700"
                            : p.status === "REJECTED" ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                            {p.status === "VERIFIED" ? <CheckCircle2 size={9} /> : p.status === "REJECTED" ? <XCircle size={9} /> : <Clock size={9} />}
                            {p.status}
                          </span>
                        </div>
                        {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Screenshot preview */}
                  {p.screenshotUrl && (
                    <button
                      onClick={() => setSelectedScreenshot(p.screenshotUrl)}
                      className="mt-3 flex items-center gap-1.5 text-xs text-brand-600 font-semibold"
                    >
                      <ImageIcon size={13} /> View Payment Proof
                    </button>
                  )}

                  {/* Verify / Reject buttons for pending deposits */}
                  {p.type === "DEPOSIT" && p.status === "PENDING" && (
                    <div className="mt-3 flex gap-2 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => handleVerify(p.id, "VERIFIED")}
                        className="flex-1 bg-green-600 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={13} /> Verify
                      </button>
                      <button
                        onClick={() => handleVerify(p.id, "REJECTED")}
                        className="flex-1 bg-red-50 text-red-600 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Screenshot lightbox */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedScreenshot} alt="Payment proof" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </PageShell>
  );
}
