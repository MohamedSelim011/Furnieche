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
  { value: "OTHER", label: "Other" },
] as const;

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
