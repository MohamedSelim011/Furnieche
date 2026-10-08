import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STAT_TONES = {
  brand:   { card: "bg-brand-50/90 border-brand-100",   tile: "bg-brand-100/80 text-brand-600", label: "text-brand-700", hint: "text-brand-500" },
  oak:     { card: "bg-oak-50/90 border-oak-100",       tile: "bg-oak-100/80 text-oak-600",     label: "text-oak-700",   hint: "text-oak-400" },
  danger:  { card: "bg-red-50/90 border-red-100",       tile: "bg-red-100/80 text-red-600",     label: "text-red-700",   hint: "text-red-400" },
  success: { card: "bg-green-50/90 border-green-100",   tile: "bg-green-100/80 text-green-700", label: "text-green-700", hint: "text-green-300" },
  warning: { card: "bg-amber-50/90 border-amber-100",   tile: "bg-amber-100/80 text-amber-700", label: "text-amber-700", hint: "text-amber-400" },
  neutral: { card: "bg-gray-100/80 border-gray-200/70", tile: "bg-gray-200/80 text-gray-600",   label: "text-gray-600",  hint: "text-gray-300" },
} as const;

export function StatCard({
  icon: Icon,
  hint: Hint,
  label,
  value,
  caption,
  tone,
}: {
  icon: LucideIcon;
  hint: LucideIcon;
  label: string;
  value: number;
  caption: string;
  tone: keyof typeof STAT_TONES;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className={cn("relative rounded-2xl border p-3 flex gap-2.5 backdrop-blur-sm", t.card)}>
      <Hint size={15} className={cn("absolute top-3 right-3", t.hint)} />
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", t.tile)}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn("block pr-5 text-[11px] font-semibold uppercase tracking-wide", t.label)}>{label}</span>
        <p className="text-3xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
        <p className="text-[11px] leading-snug text-gray-500">{caption}</p>
      </div>
    </div>
  );
}
