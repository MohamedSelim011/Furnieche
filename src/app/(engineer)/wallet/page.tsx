import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync-user";

async function getWalletOverview(userId: string) {
  const projects = await prisma.project.findMany({
    where: { engineerId: userId },
    include: {
      payments: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((p) => {
    const totalRequested = p.payments
      .filter((x) => x.type === "REQUEST")
      .reduce((s, x) => s + x.amount, 0);
    const totalPaid = p.payments
      .filter((x) => x.type === "DEPOSIT" && x.status === "VERIFIED")
      .reduce((s, x) => s + x.amount, 0);
    const pendingDeposits = p.payments.filter(
      (x) => x.type === "DEPOSIT" && x.status === "PENDING"
    ).length;
    return {
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      budget: p.budget,
      totalRequested,
      totalPaid,
      balance: totalRequested - totalPaid,
      pendingDeposits,
    };
  });
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

export default async function WalletOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await syncUser(user);

  const projects = await getWalletOverview(user.id);

  const totalOutstanding = projects.reduce((s, p) => s + Math.max(p.balance, 0), 0);
  const totalCollected = projects.reduce((s, p) => s + p.totalPaid, 0);
  const totalPendingDeposits = projects.reduce((s, p) => s + p.pendingDeposits, 0);

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-sm text-gray-400 mt-0.5">All project financials at a glance</p>
      </div>

      <div className="px-4 pb-32 space-y-4">
        {/* Summary */}
        <div className="bg-brand-600 rounded-2xl p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Total Outstanding</p>
          <p className="text-4xl font-extrabold">{fmt(totalOutstanding)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-[10px] text-white/60 uppercase font-bold">Collected</p>
              <p className="text-lg font-bold">{fmt(totalCollected)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-[10px] text-white/60 uppercase font-bold">Pending Deposits</p>
              <p className="text-lg font-bold">{totalPendingDeposits}</p>
            </div>
          </div>
        </div>

        {/* Project list */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Projects</p>
          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Wallet size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => {
                const isOwed = p.balance > 0;
                const isPaid = p.balance <= 0 && p.totalRequested > 0;

                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/wallet`}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isOwed ? "bg-red-50" : isPaid ? "bg-green-50" : "bg-gray-50"
                    }`}>
                      {isOwed ? (
                        <TrendingDown size={18} className="text-red-500" />
                      ) : isPaid ? (
                        <TrendingUp size={18} className="text-green-500" />
                      ) : (
                        <Minus size={18} className="text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.clientName}</p>
                      {p.pendingDeposits > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          {p.pendingDeposits} deposit{p.pendingDeposits > 1 ? "s" : ""} to verify
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold ${isOwed ? "text-red-500" : "text-green-600"}`}>
                        {isOwed ? fmt(p.balance) : fmt(0)}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {isOwed ? "owed" : p.totalRequested > 0 ? "paid in full" : "no invoices"}
                      </p>
                    </div>

                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
