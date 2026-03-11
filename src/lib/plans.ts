export const PLANS = {
  free: {
    label: "Free",
    price: 0,
    maxProjects: 3,
    prioritySupport: false,
    features: [
      "Up to 3 projects",
      "Client portal link",
      "Progress tracking",
      "Photo & video uploads",
    ],
  },
  pro: {
    label: "Pro",
    price: 29,
    maxProjects: 15,
    prioritySupport: false,
    features: [
      "Up to 15 projects",
      "Everything in Free",
      "Company branding & logo",
      "Update categories & filters",
    ],
  },
  business: {
    label: "Business",
    price: 79,
    maxProjects: Infinity,
    prioritySupport: true,
    features: [
      "Unlimited projects",
      "Everything in Pro",
      "Priority support",
      "Early access to new features",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanKey];

export function getPlan(key: string): Plan {
  return (PLANS as Record<string, Plan>)[key] ?? PLANS.free;
}
