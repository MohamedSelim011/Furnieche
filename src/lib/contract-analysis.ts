import { prisma } from "@/lib/prisma";
import { canAccessFolder, canEdit, getProjectAccess } from "@/lib/authz";

// Mirrors contract-service/app/schema.py — keep the two in sync.
export type ContractAnalysisResult = {
  is_contract: boolean;
  document_language: "ar" | "en" | "mixed";
  output_language: "ar" | "en";
  title: string;
  contract_type: string;
  summary: string;
  parties: { name: string; role: string; details: string | null }[];
  project_name: string | null;
  project_location: string | null;
  key_dates: {
    signing_date: string | null;
    start_date: string | null;
    end_date: string | null;
    duration: string | null;
  };
  financials: {
    total_value: number | null;
    currency: string | null;
    includes_vat: boolean | null;
    advance_payment: string | null;
    retention: string | null;
    notes: string | null;
  };
  payment_schedule: {
    label: string;
    amount: number | null;
    percent: number | null;
    due_date: string | null;
    trigger: string | null;
  }[];
  scope_of_work: string[];
  exclusions: string[];
  client_obligations: string[];
  contractor_obligations: string[];
  penalties: { description: string; amount: string | null }[];
  warranty: string | null;
  termination: string | null;
  dispute_resolution: string | null;
  key_clauses: { title: string; summary: string; reference: string | null }[];
  risks: { severity: "high" | "medium" | "low"; title: string; detail: string; reference: string | null }[];
  missing_or_unclear: string[];
};

/**
 * Contract analysis exposes the contract's financial terms, so it requires
 * edit access *and* budget visibility, plus access to the file's folder.
 * Returns null when the user may not analyze this file (callers respond 404).
 */
export async function getAnalyzableFile(userId: string, projectId: string, fileId: string) {
  const access = await getProjectAccess(userId, projectId);
  if (!canEdit(access) || !access.canViewBudget) return null;

  const file = await prisma.projectFile.findFirst({
    where: { id: fileId, folder: { projectId } },
  });
  if (!file || !(await canAccessFolder(userId, projectId, file.folderId))) return null;

  return file;
}

/** Parses a YYYY-MM-DD string from the analysis into a Date, or null. */
export function parseAnalysisDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
