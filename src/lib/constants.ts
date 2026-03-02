export const DEFAULT_STEPS = [
  {
    name: "Site Handover & Inspection",
    description: "Apartment handover confirmation, initial condition documentation, measurements verification, issue recording",
    order: 1,
  },
  {
    name: "Design Finalization",
    description: "Final layout approval, material selection, client confirmation uploads, final drawings documentation",
    order: 2,
  },
  {
    name: "Demolition & Preparation",
    description: "Removal work, surface preparation, electrical rough-ins, plumbing rough-ins",
    order: 3,
  },
  {
    name: "Core Installation",
    description: "Flooring, ceilings, walls finishing, tiling, electrical installations, plumbing installations",
    order: 4,
  },
  {
    name: "Custom Furniture Production",
    description: "Kitchen cabinets, wardrobes, TV units, storage units",
    order: 5,
  },
  {
    name: "Furniture Installation",
    description: "Delivery documentation, installation confirmation, alignment & finishing checks",
    order: 6,
  },
  {
    name: "Final Finishing",
    description: "Paint touch-ups, silicone finishing, cleaning, snag list",
    order: 7,
  },
  {
    name: "Final Handover",
    description: "Client inspection, issue log, completion confirmation, sign-off documentation",
    order: 8,
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
