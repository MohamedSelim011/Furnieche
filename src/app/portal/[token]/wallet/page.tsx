import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isPortalTokenValid } from "@/lib/authz";
import { PortalNav } from "../portal-nav";
import { DepositForm } from "./deposit-form";
import { CheckCircle2, XCircle, Clock, DollarSign, Upload, Wallet } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

async function getWalletData(token: string) {
  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!isPortalTokenValid(accessToken)) return null;

  const { project } = accessToken;
  const payments = project.payments;

  const totalRequested = payments
    .filter((p) => p.type === "REQUEST")
    .reduce((s, p) => s + p.amount, 0);

  const totalPaid = payments
    .filter((p) => p.type === "DEPOSIT" && p.status === "VERIFIED")
    .reduce((s, p) => s + p.amount, 0);

  return {
    project,
    payments,
    budget: project.budget,
    totalRequested,
    totalPaid,
    balance: totalRequested - totalPaid,
  };
}

export default async function ClientWalletPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getWalletData(token);

  if (!data) notFound();

  const { payments, budget, totalRequested, totalPaid, balance } = data;
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
        <p className="text-xs text-gray-400 mt-0.5">{data.project.name}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Balance Card */}
        <div className={`rounded-2xl p-5 ${isOwed ? "bg-red-500" : "bg-green-600"}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Balance Due</p>
          <p className="text-4xl font-extrabold text-white">{fmt(Math.abs(balance))}</p>
          <p className="text-sm text-white/80 mt-1">
            {isOwed
              ? "You still owe this amount"
              : balance < 0
              ? "You have a credit"
              : "All payments settled"}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Budget</p>
              <p className="text-sm font-bold text-white">{budget != null ? fmt(budget) : "—"}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Invoiced</p>
              <p className="text-sm font-bold text-white">{fmt(totalRequested)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/60 uppercase font-bold">Paid</p>
              <p className="text-sm font-bold text-white">{fmt(totalPaid)}</p>
            </div>
          </div>
        </div>

        {/* Deposit Form (client component) */}
        <DepositForm token={token} />

        {/* Transaction History */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">History</p>
          {payments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Wallet size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payment activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
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
                      {p.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                      {p.screenshotUrl && (
                        <a
                          href={p.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-600 font-semibold"
                        >
                          View screenshot →
                        </a>
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
    </div>
  );
}
