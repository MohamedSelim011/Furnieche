import Link from "next/link";
import { CheckCircle2, Zap, Headphones, ArrowRight } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/plans";

const PLAN_ORDER: PlanKey[] = ["free", "pro", "business"];

const PLAN_CTA: Record<PlanKey, string> = {
  free: "Get Started Free",
  pro: "Start Pro Trial",
  business: "Contact Us",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Furniche" className="w-8 h-8" />
          <span className="font-bold text-gray-900 text-base">Furniche</span>
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <div className="text-center px-6 pt-10 pb-12 max-w-2xl mx-auto">
        <span className="inline-block bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
          Pricing
        </span>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-gray-500 text-base max-w-sm mx-auto">
          Document furnishing projects and keep clients updated in real time. Start free, upgrade as you grow.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="px-4 pb-16 max-w-2xl mx-auto space-y-4">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isPro = key === "business";

          return (
            <div
              key={key}
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                isPro
                  ? "border-brand-400 ring-2 ring-brand-200 bg-white"
                  : "border-gray-100 bg-white"
              }`}
            >
              {isPro && (
                <div className="bg-brand-600 text-white text-xs font-bold text-center py-1.5 tracking-widest uppercase flex items-center justify-center gap-1.5">
                  <Zap size={12} />
                  Most Popular
                </div>
              )}

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-gray-900">{plan.label}</h2>
                      {key === "business" && (
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                          <Headphones size={9} />
                          Priority Support
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900">
                      {plan.price === 0 ? (
                        "Free"
                      ) : (
                        <>
                          ${plan.price}
                          <span className="text-base font-normal text-gray-400">/mo</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {plan.maxProjects === Infinity
                        ? "Unlimited projects"
                        : `Up to ${plan.maxProjects} projects`}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle2
                        size={15}
                        className={isPro ? "text-brand-500 shrink-0" : "text-gray-400 shrink-0"}
                      />
                      {f}
                    </li>
                  ))}
                  {plan.prioritySupport && (
                    <li className="flex items-center gap-2.5 text-sm text-amber-700 font-medium">
                      <Headphones size={15} className="text-amber-500 shrink-0" />
                      Priority support included
                    </li>
                  )}
                </ul>

                {/* CTA */}
                <Link
                  href={key === "business" ? "mailto:hello@teqniads.com" : "/register"}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isPro
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {PLAN_CTA[key]}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ / note */}
      <div className="text-center pb-16 px-6">
        <p className="text-xs text-gray-400">
          All plans include a secure client portal, progress tracking, and photo/video uploads.
          <br />
          Need a custom plan?{" "}
          <a href="mailto:hello@teqniads.com" className="text-brand-600 font-semibold">
            Contact us
          </a>
          .
        </p>
      </div>
    </div>
  );
}
