"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, MinusCircle, Clock } from "lucide-react";

type Step = {
  id: string;
  name: string;
  status: string;
  order: number;
};

function StepIcon({ status }: { status: string }) {
  if (status === "COMPLETED")  return <CheckCircle2 size={15} className="text-green-500 shrink-0" />;
  if (status === "IN_PROGRESS") return <Clock size={15} className="text-brand-500 shrink-0" />;
  if (status === "SKIPPED")    return <MinusCircle size={15} className="text-amber-400 shrink-0" />;
  return <Circle size={15} className="text-gray-300 shrink-0" />;
}

export function ScopeSection({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-900 text-white rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        View Project Scope
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left">
          {steps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No phases defined for this project.</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={step.id} className="flex items-center gap-3">
                  <StepIcon status={step.status} />
                  <span
                    className={`text-sm flex-1 ${
                      step.status === "COMPLETED"
                        ? "text-gray-400 line-through"
                        : step.status === "IN_PROGRESS"
                        ? "text-brand-700 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {i + 1}. {step.name}
                  </span>
                  {step.status === "IN_PROGRESS" && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-brand-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
