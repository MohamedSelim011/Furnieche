"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Loader2,
  Trash2, GripVertical, Pencil, RefreshCw, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_STEPS } from "@/lib/constants";
import { toast } from "sonner";

type Step = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
};

const STATUS_OPTIONS: { value: Step["status"]; label: string }[] = [
  { value: "PENDING", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "SKIPPED", label: "Skipped" },
];

export default function StepsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStepName, setNewStepName] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  useEffect(() => {
    fetch(`/api/projects/${id}/steps`)
      .then((r) => r.json())
      .then((data) => { setSteps(data); setLoading(false); })
      .catch(() => { toast.error("Failed to load steps"); setLoading(false); });
  }, [id]);

  async function updateStatus(step: Step, next: Step["status"]) {
    if (next === step.status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update step");
      }
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, status: next } : s))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update step");
    } finally {
      setSaving(false);
    }
  }

  async function addStep() {
    if (!newStepName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStepName.trim(), order: steps.length + 1 }),
      });
      if (!res.ok) throw new Error();
      const step = await res.json();
      setSteps((prev) => [...prev, step]);
      setNewStepName("");
      setAddingStep(false);
      toast.success("Step added");
    } catch {
      toast.error("Failed to add step");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStep(stepId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/steps/${stepId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
      toast.success("Step removed");
    } catch {
      toast.error("Failed to delete step");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(stepId: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error();
      setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, name: editName.trim() } : s)));
      setEditingId(null);
      toast.success("Step updated");
    } catch {
      toast.error("Failed to update step");
    } finally {
      setSaving(false);
    }
  }

  async function loadDefaultSteps() {
    if (!confirm("This will add all default steps. Continue?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/steps/defaults`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSteps(data);
      toast.success("Default steps loaded");
    } catch {
      toast.error("Failed to load default steps");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Project Steps</h1>
            <p className="text-xs text-gray-400">{completedSteps}/{totalSteps} completed</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress}% complete</span>
            <span>{totalSteps - completedSteps} remaining</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      {/* Steps List */}
      <div className="px-4 pt-4 space-y-2">
        {steps.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No steps yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadDefaultSteps}
              disabled={saving}
            >
              <RefreshCw size={14} /> Load {DEFAULT_STEPS.length} default steps
            </Button>
          </div>
        )}

        {steps.map((step) => (
          <div key={step.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <div className="flex items-center gap-3">
              <GripVertical size={16} className="text-gray-300 shrink-0" />

              {/* Status Dropdown */}
              <select
                value={step.status}
                disabled={saving}
                onChange={(e) => updateStatus(step, e.target.value as Step["status"])}
                className={`shrink-0 text-xs font-semibold rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer ${
                  step.status === "COMPLETED"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : step.status === "IN_PROGRESS"
                    ? "bg-blue-50 text-brand-700 border-blue-200"
                    : step.status === "SKIPPED"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-gray-50 text-gray-500 border-gray-200"
                }`}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Name / Edit */}
              {editingId === step.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(step.id)}
                    autoFocus
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={() => saveEdit(step.id)} disabled={saving}>Save</Button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${step.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {step.name}
                  </p>
                </div>
              )}

              {editingId !== step.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/projects/${id}/update/new?stepId=${step.id}`)}
                    title="Add update for this phase"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50"
                  >
                    <Camera size={13} className="text-brand-400" />
                  </button>
                  <button
                    onClick={() => { setEditingId(step.id); setEditName(step.name); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
                  >
                    <Pencil size={13} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => deleteStep(step.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Step */}
        {addingStep ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-2">
            <Input
              placeholder="Step name..."
              value={newStepName}
              onChange={(e) => setNewStepName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStep()}
              autoFocus
              className="h-10 text-sm flex-1"
            />
            <Button size="sm" onClick={addStep} disabled={saving || !newStepName.trim()}>Add</Button>
            <button onClick={() => { setAddingStep(false); setNewStepName(""); }} className="text-xs text-gray-400 px-1">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingStep(true)}
            className="w-full flex items-center gap-2 py-3 px-3 text-sm text-brand-600 font-semibold rounded-2xl border border-dashed border-brand-200 hover:bg-blue-50 transition-colors"
          >
            <Plus size={16} /> Add custom step
          </button>
        )}

        {steps.length > 0 && (
          <Button variant="ghost" size="sm" onClick={loadDefaultSteps} disabled={saving} className="w-full text-gray-400">
            <RefreshCw size={13} /> Add default steps
          </Button>
        )}
      </div>
    </div>
  );
}
