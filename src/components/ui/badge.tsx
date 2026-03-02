import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700",
        active: "bg-blue-50 text-brand-600",
        completed: "bg-green-50 text-green-700",
        archived: "bg-gray-100 text-gray-500",
        on_hold: "bg-amber-50 text-amber-700",
        draft: "bg-yellow-50 text-yellow-700",
        residential: "bg-blue-50 text-brand-600",
        commercial: "bg-purple-50 text-purple-700",
        hospitality: "bg-orange-50 text-orange-700",
        other: "bg-gray-50 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
