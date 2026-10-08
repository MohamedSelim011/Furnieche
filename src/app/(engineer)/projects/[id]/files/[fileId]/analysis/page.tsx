"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, CalendarDays, Check, ExternalLink, FileText, Loader2,
  RefreshCw, ShieldAlert, Sparkles, Users, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContractAnalysisResult } from "@/lib/contract-analysis";
import { toast } from "sonner";

type Analysis = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  result: ContractAnalysisResult | null;
  error: string | null;
  appliedAt: string | null;
  paymentsCreatedAt: string | null;
  createdAt: string;
};

type FileInfo = { id: string; name: string; url: string; type: string };

const LABELS = {
  en: {
    summary: "Summary", keyTerms: "Key terms", value: "Contract value", start: "Start", end: "End",
    duration: "Duration", risks: "Risks to watch", parties: "Parties", payments: "Payment schedule",
    scope: "Scope of work", exclusions: "Exclusions", clientObl: "Client obligations",
    contractorObl: "Your obligations", penalties: "Penalties", warranty: "Warranty",
    termination: "Termination", disputes: "Disputes", clauses: "Key clauses", missing: "Missing or unclear",
    notContract: "This document doesn't look like a contract. Results may be incomplete.",
  },
  ar: {
    summary: "الملخص", keyTerms: "البنود الأساسية", value: "قيمة العقد", start: "البداية", end: "النهاية",
    duration: "المدة", risks: "مخاطر يجب الانتباه لها", parties: "الأطراف", payments: "جدول الدفعات",
    scope: "نطاق العمل", exclusions: "المستثنيات", clientObl: "التزامات العميل",
    contractorObl: "التزاماتك", penalties: "الغرامات", warranty: "الضمان",
    termination: "إنهاء العقد", disputes: "فض النزاعات", clauses: "أهم البنود", missing: "بنود ناقصة أو غير واضحة",
    notContract: "هذا المستند لا يبدو عقداً، وقد تكون النتائج غير مكتملة.",
  },
} as const;

const SEVERITY = {
  high: "bg-red-50 border-red-100 text-red-700",
  medium: "bg-amber-50 border-amber-100 text-amber-700",
  low: "bg-gray-50 border-gray-200 text-gray-600",
} as const;

function formatMoney(value: number | null, currency: string | null) {
  if (value === null) return "—";
  try {
    if (currency && /^[A-Z]{3}$/.test(currency)) {
      return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
    }
  } catch {
    // unknown currency code — fall through to plain number
  }
  return `${new Intl.NumberFormat("en").format(value)}${currency ? ` ${currency}` : ""}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h2 className="text-sm font-bold text-gray-900 mb-2.5">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-oak-400 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ContractAnalysisPage() {
  const { id, fileId } = useParams<{ id: string; fileId: string }>();
  const router = useRouter();
  const [file, setFile] = useState<FileInfo | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const endpoint = `/api/projects/${id}/files/${fileId}/analysis`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        setLoadError(
          res.status === 404
            ? "You don't have access to analyze this file. It needs edit access and budget visibility."
            : "Couldn't load the analysis. Try again in a moment."
        );
        return;
      }
      const data = await res.json();
      setLoadError(null);
      setFile(data.file);
      setAnalysis(data.analysis);
    } catch {
      setLoadError("Couldn't load the analysis. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  // Poll while the service is working
  const running = analysis?.status === "PENDING" || analysis?.status === "PROCESSING";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [running, load]);

  async function start() {
    setStarting(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok && !data?.id) throw new Error(data?.error);
      setAnalysis(data);
      if (data.status === "FAILED") toast.error(data.error ?? "Analysis failed");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Could not start the analysis");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen max-w-md mx-auto flex items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
    );
  }

  const result = analysis?.status === "COMPLETED" ? analysis.result : null;

  return (
    <div className="min-h-screen max-w-md mx-auto pb-28">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-white/80 border border-gray-100 rounded-full flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-oak-600 flex items-center gap-1">
            <Sparkles size={12} /> AI contract analysis
          </p>
          <h1 className="text-lg font-bold text-gray-900 truncate">{file?.name ?? "Contract"}</h1>
        </div>
        {file && (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open original file"
            className="w-9 h-9 bg-white/80 border border-gray-100 rounded-full flex items-center justify-center shrink-0"
          >
            <ExternalLink size={16} className="text-gray-600" />
          </a>
        )}
      </div>

      <div className="px-4 space-y-3">
        {loadError && !file && (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 flex-1">{loadError}</p>
            </div>
            <Button fullWidth variant="outline" className="mt-4" onClick={() => { setLoading(true); load(); }}>
              <RefreshCw size={16} /> Retry
            </Button>
          </div>
        )}

        {/* Not started */}
        {!analysis && file && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-oak-50 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={24} className="text-oak-600" />
            </div>
            <h2 className="font-bold text-gray-900">Analyze this contract</h2>
            <p className="text-sm text-gray-500 mt-1.5 mb-5">
              Extract parties, dates, value, payment schedule and scope, and flag risky clauses. Works with
              Arabic and English PDFs, Word files and photos.
            </p>
            <Button fullWidth onClick={start} loading={starting}>
              {starting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Analyze contract
            </Button>
          </div>
        )}

        {/* Running */}
        {running && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <Loader2 size={30} className="text-brand-600 animate-spin mx-auto mb-3" />
            <h2 className="font-bold text-gray-900">Reading the contract…</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              This usually takes 1–3 minutes. You can leave this page; the result will be saved.
            </p>
          </div>
        )}

        {/* Failed */}
        {analysis?.status === "FAILED" && (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-bold text-gray-900">Analysis failed</h2>
                <p className="text-sm text-gray-600 mt-1">{analysis.error ?? "Something went wrong."}</p>
              </div>
            </div>
            <Button fullWidth variant="outline" className="mt-4" onClick={start} loading={starting}>
              <RefreshCw size={16} /> Try again
            </Button>
          </div>
        )}

        {result && analysis && (
          <AnalysisResult
            result={result}
            analysis={analysis}
            applyEndpoint={`${endpoint}/apply`}
            onApplied={load}
            onReanalyze={start}
            reanalyzing={starting}
          />
        )}
      </div>
    </div>
  );
}

function AnalysisResult({
  result,
  analysis,
  applyEndpoint,
  onApplied,
  onReanalyze,
  reanalyzing,
}: {
  result: ContractAnalysisResult;
  analysis: Analysis;
  applyEndpoint: string;
  onApplied: () => void;
  onReanalyze: () => void;
  reanalyzing: boolean;
}) {
  const L = LABELS[result.output_language === "ar" ? "ar" : "en"];
  const dir = result.output_language === "ar" ? "rtl" : "ltr";
  const { financials: fin, key_dates: dates } = result;

  return (
    <>
      {!result.is_contract && (
        <div className="flex gap-2 rounded-2xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800" dir={dir}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {L.notContract}
        </div>
      )}

      <div dir={dir} className="space-y-3">
        {/* Summary */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">{result.contract_type}</p>
          <h2 className="text-base font-bold text-gray-900 mt-0.5">{result.title}</h2>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{result.summary}</p>
          {(result.project_name || result.project_location) && (
            <p className="text-xs text-gray-400 mt-2">
              {[result.project_name, result.project_location].filter(Boolean).join(" · ")}
            </p>
          )}
        </section>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-2xl bg-brand-600 text-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{L.value}</p>
            <p className="text-2xl font-extrabold mt-0.5" dir="ltr">{formatMoney(fin.total_value, fin.currency)}</p>
            {(fin.includes_vat !== null || fin.advance_payment) && (
              <p className="text-xs text-white/75 mt-1">
                {[fin.includes_vat === null ? null : fin.includes_vat ? "VAT included" : "VAT excluded", fin.advance_payment]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{L.start}</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5" dir="ltr">{formatDate(dates.start_date)}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{L.end}</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5" dir="ltr">{formatDate(dates.end_date)}</p>
            {dates.duration && <p className="text-[11px] text-gray-500 mt-0.5">{dates.duration}</p>}
          </div>
        </div>
      </div>

      <ApplyCard result={result} analysis={analysis} endpoint={applyEndpoint} onApplied={onApplied} />

      <div dir={dir} className="space-y-3">
        {result.risks.length > 0 && (
          <Section title={L.risks}>
            <div className="space-y-2">
              {result.risks.map((risk, i) => (
                <div key={i} className={cn("rounded-xl border p-3", SEVERITY[risk.severity])}>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={14} className="shrink-0" />
                    <p className="text-sm font-semibold">{risk.title}</p>
                    <span className="ms-auto text-[10px] font-bold uppercase tracking-wide opacity-80">{risk.severity}</span>
                  </div>
                  <p className="text-[13px] text-gray-700 mt-1 leading-relaxed">{risk.detail}</p>
                  {risk.reference && <p className="text-[11px] text-gray-400 mt-1">{risk.reference}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {result.parties.length > 0 && (
          <Section title={L.parties}>
            <div className="space-y-2.5">
              {result.parties.map((p, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Users size={14} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-oak-600 font-semibold">{p.role}</p>
                    {p.details && <p className="text-xs text-gray-500 mt-0.5">{p.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {result.payment_schedule.length > 0 && (
          <Section title={L.payments}>
            <div className="divide-y divide-gray-100">
              {result.payment_schedule.map((m, i) => (
                <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.label}</p>
                    {(m.trigger || m.due_date) && (
                      <p className="text-xs text-gray-500 mt-0.5">{m.trigger ?? formatDate(m.due_date)}</p>
                    )}
                  </div>
                  <div className="text-end shrink-0" dir="ltr">
                    <p className="text-sm font-bold text-gray-900">{formatMoney(m.amount, fin.currency)}</p>
                    {m.percent !== null && <p className="text-[11px] text-gray-400">{m.percent}%</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {result.scope_of_work.length > 0 && <Section title={L.scope}><BulletList items={result.scope_of_work} /></Section>}
        {result.exclusions.length > 0 && <Section title={L.exclusions}><BulletList items={result.exclusions} /></Section>}
        {result.contractor_obligations.length > 0 && (
          <Section title={L.contractorObl}><BulletList items={result.contractor_obligations} /></Section>
        )}
        {result.client_obligations.length > 0 && (
          <Section title={L.clientObl}><BulletList items={result.client_obligations} /></Section>
        )}

        {result.penalties.length > 0 && (
          <Section title={L.penalties}>
            <div className="space-y-2">
              {result.penalties.map((p, i) => (
                <div key={i} className="text-sm">
                  <p className="text-gray-700">{p.description}</p>
                  {p.amount && <p className="text-xs font-semibold text-red-600 mt-0.5">{p.amount}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {[
          [L.warranty, result.warranty],
          [L.termination, result.termination],
          [L.disputes, result.dispute_resolution],
        ].map(([title, text]) =>
          text ? (
            <Section key={title} title={title as string}>
              <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
            </Section>
          ) : null
        )}

        {result.key_clauses.length > 0 && (
          <Section title={L.clauses}>
            <div className="space-y-3">
              {result.key_clauses.map((c, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-gray-900">
                    {c.title}
                    {c.reference && <span className="text-xs font-normal text-gray-400"> · {c.reference}</span>}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{c.summary}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {result.missing_or_unclear.length > 0 && (
          <Section title={L.missing}><BulletList items={result.missing_or_unclear} /></Section>
        )}
      </div>

      <div className="pt-1 pb-2 text-center space-y-2">
        <p className="text-xs text-gray-400">Generated by AI. Always check it against the original contract.</p>
        <button
          onClick={onReanalyze}
          disabled={reanalyzing}
          className="text-xs font-semibold text-brand-600 inline-flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={12} /> Analyze again
        </button>
      </div>
    </>
  );
}

function ApplyCard({
  result,
  analysis,
  endpoint,
  onApplied,
}: {
  result: ContractAnalysisResult;
  analysis: Analysis;
  endpoint: string;
  onApplied: () => void;
}) {
  const hasDates = Boolean(result.key_dates.start_date || result.key_dates.end_date);
  const hasBudget = typeof result.financials.total_value === "number" && result.financials.total_value > 0;
  const payable = result.payment_schedule.filter((m) => typeof m.amount === "number" && m.amount > 0);
  const paymentsDone = Boolean(analysis.paymentsCreatedAt);

  const [dates, setDates] = useState(hasDates);
  const [budget, setBudget] = useState(hasBudget);
  const [payments, setPayments] = useState(false);
  const [applying, setApplying] = useState(false);

  if (!hasDates && !hasBudget && payable.length === 0) return null;

  async function apply() {
    setApplying(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id, dates, budget, payments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      toast.success("Applied to project");
      setPayments(false);
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to apply");
    } finally {
      setApplying(false);
    }
  }

  const options = [
    {
      key: "dates",
      icon: CalendarDays,
      label: "Project dates",
      detail: `${formatDate(result.key_dates.start_date)} → ${formatDate(result.key_dates.end_date)}`,
      checked: dates,
      set: setDates,
      disabled: !hasDates,
    },
    {
      key: "budget",
      icon: Wallet,
      label: "Project budget",
      detail: formatMoney(result.financials.total_value, result.financials.currency),
      checked: budget,
      set: setBudget,
      disabled: !hasBudget,
    },
    {
      key: "payments",
      icon: FileText,
      label: `${payable.length} payment request${payable.length === 1 ? "" : "s"}`,
      detail: paymentsDone ? "Already created" : "Added to the wallet — your client will see them",
      checked: payments,
      set: setPayments,
      disabled: payable.length === 0 || paymentsDone,
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">Apply to project</h2>
        {analysis.appliedAt && (
          <span className="text-[11px] font-semibold text-green-700 flex items-center gap-1">
            <Check size={12} /> Applied
          </span>
        )}
      </div>
      <div className="space-y-2">
        {options.map(({ key, icon: Icon, label, detail, checked, set, disabled }) => (
          <label
            key={key}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-colors",
              disabled ? "opacity-50 border-gray-100" : checked ? "border-brand-200 bg-brand-50/60 cursor-pointer" : "border-gray-100 cursor-pointer"
            )}
          >
            <Icon size={16} className="text-brand-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 truncate">{detail}</p>
            </div>
            <input
              type="checkbox"
              checked={checked && !disabled}
              disabled={disabled}
              onChange={(e) => set(e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
          </label>
        ))}
      </div>
      <Button
        fullWidth
        className="mt-3"
        onClick={apply}
        loading={applying}
        disabled={applying || !((dates && hasDates) || (budget && hasBudget) || (payments && !paymentsDone && payable.length > 0))}
      >
        {applying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Apply selected
      </Button>
    </section>
  );
}
