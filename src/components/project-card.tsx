"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

type Project = {
  id: string;
  name: string;
  clientName: string;
  status: string;
  category: string;
  updatedAt: Date;
  steps: { status: string }[];
  _count: { updates: number };
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

function getStatusDropdownClass(status: string) {
  switch (status) {
    case "ACTIVE":     return "bg-blue-50 text-brand-700 border-blue-200";
    case "ON_HOLD":    return "bg-amber-50 text-amber-700 border-amber-200";
    case "COMPLETED":  return "bg-green-50 text-green-700 border-green-200";
    case "ARCHIVED":   return "bg-gray-100 text-gray-500 border-gray-200";
    default:           return "bg-gray-50 text-gray-500 border-gray-200";
  }
}

function getCategoryVariant(category: string) {
  switch (category) {
    case "RESIDENTIAL": return "residential";
    case "COMMERCIAL":  return "commercial";
    case "HOSPITALITY": return "hospitality";
    default:            return "other";
  }
}

export function ProjectCard({ project: initial }: { project: Project }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial.status);
  const [saving, setSaving] = useState(false);

  const totalSteps = initial.steps.length;
  const completedSteps = initial.steps.filter((s) => s.status === "COMPLETED").length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  async function handleStatusChange(next: ProjectStatus) {
    if (next === status) return;
    setSaving(true);
    const prev = status;
    setStatus(next); // optimistic
    try {
      const res = await fetch(`/api/projects/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
    } catch {
      setStatus(prev); // revert
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={() => router.push(`/projects/${initial.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.99] transition-transform cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant={getCategoryVariant(initial.category) as "residential" | "commercial" | "hospitality" | "other"}>
          {initial.category}
        </Badge>

        {/* Status dropdown — stops card navigation on interact */}
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={status}
            disabled={saving}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            className={`text-xs font-semibold rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer ${getStatusDropdownClass(status)}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 text-base mt-2">{initial.name}</h3>
      <p className="text-sm text-gray-500">Client: {initial.clientName}</p>

      {totalSteps > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{completedSteps}/{totalSteps} phases</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock size={12} />
          <span>{formatRelativeTime(initial.updatedAt)}</span>
        </div>
        <div className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center">
          <ChevronRight size={14} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
