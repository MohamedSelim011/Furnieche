"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, Shield, Trash2, Camera, LogOut, Eye, EyeOff, Loader2, CheckCircle2, Headphones, Zap } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PLANS, getPlan, type PlanKey } from "@/lib/plans";

const tabs = ["Company", "Account", "Billing"] as const;
type Tab = (typeof tabs)[number];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Company");
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanKey>("free");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setCompanyName(data.company.name ?? "");
          setCompanyEmail(data.company.email ?? "");
          setLogoUrl(data.company.logoUrl ?? null);
        }
        if (data.plan) setCurrentPlan(data.plan as PlanKey);
      })
      .catch(() => {});
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `company-logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("furniche-media").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("furniche-media").getPublicUrl(path);
      setLogoUrl(publicUrl);
      toast.success("Logo uploaded — click Save to apply");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    if (activeTab !== "Company") return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyEmail, logoUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        {activeTab === "Company" && (
          <button
            onClick={handleSave}
            disabled={saving || uploadingLogo}
            className="text-sm font-semibold text-brand-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
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
        {activeTab === "Company" && (
          <CompanyTab
            companyName={companyName}
            companyEmail={companyEmail}
            logoUrl={logoUrl}
            uploadingLogo={uploadingLogo}
            logoInputRef={logoInputRef}
            onNameChange={setCompanyName}
            onEmailChange={setCompanyEmail}
            onLogoUpload={handleLogoUpload}
          />
        )}
        {activeTab === "Account" && <AccountTab />}
        {activeTab === "Billing" && <BillingTab currentPlan={currentPlan} />}
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

function CompanyTab({
  companyName, companyEmail, logoUrl, uploadingLogo, logoInputRef,
  onNameChange, onEmailChange, onLogoUpload,
}: {
  companyName: string;
  companyEmail: string;
  logoUrl: string | null;
  uploadingLogo: boolean;
  logoInputRef: React.RefObject<HTMLInputElement>;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Company Profile</p>

        {/* Logo */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center">
                <Building2 size={20} className="text-gray-300" />
                <span className="text-[9px] text-gray-400 mt-1">LOGO</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Company Logo</p>
            <p className="text-xs text-gray-400">JPG, PNG or SVG. Max 2MB.</p>
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
              className="text-xs text-brand-600 font-semibold mt-1 flex items-center gap-1 disabled:opacity-50"
            >
              {uploadingLogo ? <><Loader2 size={11} className="animate-spin" /> Uploading...</> : <><Camera size={12} /> Update Logo</>}
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              value={companyName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Precision Furnishing Ltd."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Email</Label>
            <Input
              type="email"
              value={companyEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="e.g. ops@yourcompany.com"
            />
          </div>
        </div>
      </section>

      <div className="bg-red-50 rounded-2xl p-4">
        <button className="w-full text-red-500 font-semibold text-sm flex items-center justify-center gap-2 py-1">
          <Trash2 size={16} /> Delete Company Profile
        </button>
      </div>
    </div>
  );
}

function AccountTab() {
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setShowForm(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Security</p>
        <div className="space-y-2">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
                <Shield size={18} className="text-gray-500" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800 text-left">Change Password</span>
              <span className="text-xs text-brand-600 font-semibold">Change</span>
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Set New Password</p>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password</Label>
                <Input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleChangePassword} disabled={saving}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Update Password"}
                </Button>
                <button
                  onClick={() => { setShowForm(false); setNewPassword(""); setConfirmPassword(""); }}
                  className="text-sm text-gray-400 font-medium px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const PLAN_ORDER: PlanKey[] = ["free", "pro", "business"];

function BillingTab({ currentPlan }: { currentPlan: PlanKey }) {
  const current = getPlan(currentPlan);

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Subscription & Billing</p>

        {/* Current plan summary */}
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Current Plan</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {current.label}
              {current.price > 0 && (
                <span className="text-sm font-normal text-gray-400 ml-1">${current.price}/mo</span>
              )}
              {current.price === 0 && (
                <span className="text-sm font-normal text-gray-400 ml-1">Free</span>
              )}
            </p>
            <p className="text-xs text-brand-600 mt-0.5">
              {current.maxProjects === Infinity ? "Unlimited projects" : `Up to ${current.maxProjects} projects`}
            </p>
          </div>
          {current.prioritySupport && (
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <Headphones size={13} />
              Priority Support
            </div>
          )}
        </div>

        {/* All plan cards */}
        <div className="space-y-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const isCurrent = key === currentPlan;
            const isUpgrade = PLAN_ORDER.indexOf(key) > PLAN_ORDER.indexOf(currentPlan);

            return (
              <div
                key={key}
                className={`bg-white rounded-2xl border shadow-sm p-4 ${
                  isCurrent ? "border-brand-400 ring-1 ring-brand-300" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{plan.label}</span>
                      {isCurrent && (
                        <span className="bg-brand-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Current
                        </span>
                      )}
                      {key === "business" && (
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                          <Zap size={9} />
                          Best Value
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {plan.price === 0 ? (
                        <span>Free</span>
                      ) : (
                        <span>${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span></span>
                      )}
                    </p>
                  </div>

                  {!isCurrent && (
                    <button
                      disabled
                      title="Payment integration coming soon"
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isUpgrade
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                    </button>
                  )}
                </div>

                {/* Feature list */}
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle2 size={13} className={isCurrent ? "text-brand-500" : "text-gray-300"} />
                      {f}
                    </li>
                  ))}
                  {plan.prioritySupport && (
                    <li className="flex items-center gap-2 text-xs text-amber-700 font-medium">
                      <Headphones size={13} className="text-amber-500" />
                      Priority support
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">
          Payment integration coming soon —{" "}
          <a href="/pricing" className="text-brand-600 font-semibold">view pricing page</a>
          {" "}or contact us to upgrade manually
        </p>
      </section>
    </div>
  );
}
