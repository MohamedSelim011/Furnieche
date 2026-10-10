// The three folders every project starts with. Engineers can rename, add to,
// or delete these after creation — this is just the starting scaffold.
export const DEFAULT_FOLDERS = [
  {
    name: "Contract",
    description: "Signed contract, scope of work, and client agreements",
    order: 1,
  },
  {
    name: "Design",
    description: "Layout approvals, material selections, drawings, renders",
    order: 2,
  },
  {
    name: "Site",
    description: "Site photos, inspection reports, and on-site progress",
    order: 3,
  },
] as const;

export const PROJECT_CATEGORIES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "HOSPITALITY", label: "Hospitality" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "OTHER", label: "Other" },
] as const;

export type ProjectCategoryValue = (typeof PROJECT_CATEGORIES)[number]["value"];

export const CATEGORY_OTHER_MAX = 60;

/** What to show for a project's category — the engineer's own words when "Other". */
export function categoryLabel(category: string, categoryOther?: string | null): string {
  if (category === "OTHER" && categoryOther?.trim()) return categoryOther.trim();
  return PROJECT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export const UPDATE_CATEGORIES = [
  "Furniture Assembly",
  "Delivery",
  "Milestone",
  "Site Preparation",
  "Quality Check",
  "General Update",
] as const;

export const CLIENT_COOKIE_NAME = "furniche_portal_session";
export const CLIENT_SESSION_DAYS = 90;
