"use client";

import { useState } from "react";
import { ChevronRight, Building2, CreditCard, Shield, Trash2, Camera, LogOut } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const tabs = ["Company", "Account", "Billing"] as const;
type Tab = (typeof tabs)[number];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Company");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); toast.success("Settings saved"); }, 800); }}
          className="text-sm font-semibold text-brand-600"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-6">
        {activeTab === "Company" && <CompanyTab />}
        {activeTab === "Account" && <AccountTab />}
        {activeTab === "Billing" && <BillingTab />}
      </div>

      {/* Logout */}
      <div className="px-4 mt-8">
        <Button variant="ghost" fullWidth onClick={handleLogout} className="text-gray-500">
          <LogOut size={16} /> Sign Out
        </Button>
      </div>
    </PageShell>
  );
}

function CompanyTab() {
  return (
    <div className="space-y-6">
      {/* Company Profile */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Company Profile</p>

        {/* Logo */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50">
            <Building2 size={20} className="text-gray-300" />
            <span className="text-[9px] text-gray-400 mt-1">COMPANY</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Company Logo</p>
            <p className="text-xs text-gray-400">JPG, PNG or SVG. Max 2MB.</p>
            <button className="text-xs text-brand-600 font-semibold mt-1 flex items-center gap-1">
              <Camera size={12} /> Update Logo
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input defaultValue="Precision Furnishing Ltd." />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Email</Label>
            <Input type="email" defaultValue="ops@precisionfurnishing.com" />
          </div>
        </div>
      </section>

      {/* Delete */}
      <div className="bg-red-50 rounded-2xl p-4">
        <button className="w-full text-red-500 font-semibold text-sm flex items-center justify-center gap-2 py-1">
          <Trash2 size={16} /> Delete Company Profile
        </button>
      </div>
    </div>
  );
}

function AccountTab() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Security</p>
        <div className="space-y-2">
          <button className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-gray-500" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-800 text-left">Change Password</span>
            <ChevronRight size={16} className="text-gray-300" />
          </button>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-brand-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-800">Two-Factor Authentication</span>
            <div className="w-12 h-6 bg-brand-600 rounded-full flex items-center justify-end px-1">
              <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Subscription & Billing</p>

        {/* Plan Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Current Plan</span>
                <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PRO</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">$29<span className="text-sm font-normal text-gray-400">/mo</span></p>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <CreditCard size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">Next billing on Oct 12, 2023</span>
          </div>
          <button className="text-sm font-semibold text-brand-600">Manage</button>
        </div>
      </section>
    </div>
  );
}
