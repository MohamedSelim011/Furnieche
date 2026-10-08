"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, MapPin, ShieldCheck, ChevronRight, User, Mail, Calendar, Tag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_CATEGORIES } from "@/lib/constants";
import { CoverPhotoPicker } from "@/components/cover-photo-picker";
import { toast } from "sonner";

type Step1Data = {
  name: string;
  location: string;
  category: string;
  startDate: string;
  estimatedEndDate: string;
};

type Step2Data = {
  clientName: string;
  clientEmail: string;
  budget: string;
};

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step1, setStep1] = useState<Step1Data>({
    name: "",
    location: "",
    category: "RESIDENTIAL",
    startDate: "",
    estimatedEndDate: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
    clientName: "",
    clientEmail: "",
    budget: "",
  });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step1,
          coverUrl,
          clientName: step2.clientName,
          clientEmail: step2.clientEmail,
          budget: step2.budget ? parseFloat(step2.budget) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const { id } = await res.json();
      toast.success("Project created successfully!");
      router.push(`/projects/${id}`);
    } catch {
      toast.error("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <button
          onClick={() => (step === 1 ? router.back() : setStep(1))}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <X size={18} className="text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Step {step} of 2
          </p>
          <div className="flex gap-1.5 mt-1.5 justify-center">
            <div className={`h-1 rounded-full transition-all ${step >= 1 ? "w-8 bg-brand-600" : "w-4 bg-gray-200"}`} />
            <div className={`h-1 rounded-full transition-all ${step >= 2 ? "w-8 bg-brand-600" : "w-4 bg-gray-200"}`} />
          </div>
        </div>
        <div className="w-9" />
      </div>

      <div className="px-5 pb-8">
        {step === 1 ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Project Details</h2>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Set up your workspace to begin documenting furnishing progress.
            </p>

            <div className="space-y-4">
              <CoverPhotoPicker value={coverUrl} onChange={setCoverUrl} />

              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Riverside Apartment 402"
                  autoComplete="off"
                  value={step1.name}
                  onChange={(e) => setStep1({ ...step1, name: e.target.value })}
                  icon={<Tag size={15} />}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Property Address</Label>
                <Input
                  id="location"
                  placeholder="Enter the full site address..."
                  autoComplete="off"
                  value={step1.location}
                  onChange={(e) => setStep1({ ...step1, location: e.target.value })}
                  icon={<MapPin size={15} />}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={step1.category}
                  onChange={(e) => setStep1({ ...step1, category: e.target.value })}
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={step1.startDate}
                    onChange={(e) => setStep1({ ...step1, startDate: e.target.value })}
                    icon={<Calendar size={15} />}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estimatedEndDate">Deadline</Label>
                  <Input
                    id="estimatedEndDate"
                    type="date"
                    value={step1.estimatedEndDate}
                    onChange={(e) => setStep1({ ...step1, estimatedEndDate: e.target.value })}
                    icon={<Calendar size={15} />}
                  />
                </div>
              </div>

              {/* Default Folders Notice */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Contract, Design &amp; Site folders included</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Every project starts with these three folders. You can rename, add, or remove folders anytime after creation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Safeguard notice */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-brand-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Professional Safeguard</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Accurate project details ensure all time-stamped photos and notes are legally binding in case of client disputes.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  if (!step1.name) { toast.error("Project name is required"); return; }
                  setStep(2);
                }}
              >
                Continue to Client Details <ChevronRight size={18} />
              </Button>
              <button
                type="button"
                className="w-full text-sm text-gray-400 font-medium py-2"
                onClick={() => router.back()}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Client Details</h2>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Enter client information to generate their secure access link.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="e.g. Marina Bay Holdings"
                  autoComplete="off"
                  value={step2.clientName}
                  onChange={(e) => setStep2({ ...step2, clientName: e.target.value })}
                  icon={<User size={15} />}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@email.com"
                  value={step2.clientEmail}
                  onChange={(e) => setStep2({ ...step2, clientEmail: e.target.value })}
                  icon={<Mail size={15} />}
                />
                <p className="text-xs text-gray-400 mt-1">
                  A secure access link will be generated for this email.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget">Project Budget <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 25000"
                  value={step2.budget}
                  onChange={(e) => setStep2({ ...step2, budget: e.target.value })}
                  icon={<DollarSign size={15} />}
                />
                <p className="text-xs text-gray-400">Total project cost the client will pay. Can be set or adjusted later.</p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Secure Client Access</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Your client gets a unique link — no account needed. Sessions last 90 days. You can revoke access anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  if (!step2.clientName) { toast.error("Client name is required"); return; }
                  if (!step2.clientEmail) { toast.error("Client email is required"); return; }
                  handleSubmit();
                }}
                disabled={loading}
              >
                {loading ? "Creating Project..." : "Create Project"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-gray-400 font-medium py-2"
                onClick={() => setStep(1)}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
