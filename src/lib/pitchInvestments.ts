import { supabase } from "./supabaseClient";

import type { EmailAddress, PitchInvestmentRow, ProjectId } from "../types/domain";

export const PITCH_II_ROUND_ID = "pitch-perfect-ii-2026";
export const PITCH_II_COHORT_YEAR = "2026-2027";
export const INVESTMENT_BUDGET = 1_000_000;
export const INVESTMENT_STEP = 10_000;

/** Project ids in the Pitch Perfect II round. Must match supabase/pitch-investment-survey.sql. */
export const PITCH_II_PROJECT_IDS: readonly ProjectId[] = [
  "animal-crossing",
  "smr-heat-load",
  "irays-pupillometry",
  "usv-race-boat",
  "laser-optics",
  "soft-bio-robot",
];

export type AllocationMap = Record<ProjectId, number>;

type SupabaseLikeError = { code?: string; message?: string };

export type InvestmentRound = {
  round_id: string;
  cohort_year: string;
  title: string;
  is_open: boolean;
  budget: number;
  project_ids: ProjectId[];
};

const notConfiguredError = (): SupabaseLikeError => ({
  message: "Live investing is not configured.",
});

// ── Budget math ───────────────────────────────────────────────────────────────

/** Coerce any input to a whole-dollar amount between 0 and the budget. */
export const sanitizeAmount = (value: unknown, budget = INVESTMENT_BUDGET) => {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(Math.round(amount), budget);
};

/** Parse typed dollar text such as "250000", "$250,000", "250k", or "1m".
 *  Returns null when the text is not a dollar amount. */
export const parseDollarInput = (raw: string) => {
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/[$,\s]/g, "");
  if (!text) return 0;
  const match = text.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.round(Number(match[1]) * multiplier);
};

export const emptyAllocations = (projectIds: readonly ProjectId[]): AllocationMap =>
  Object.fromEntries(projectIds.map((id) => [id, 0]));

export const totalInvested = (allocations: AllocationMap) =>
  Object.values(allocations).reduce(
    (sum, amount) => sum + (Number.isFinite(amount) ? amount : 0),
    0
  );

/** Build a clean allocation map for the listed projects, dropping unknown keys and never
 *  letting the running total pass the budget. */
export const normalizeAllocations = (
  value: unknown,
  projectIds: readonly ProjectId[],
  budget = INVESTMENT_BUDGET
): AllocationMap => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const next = emptyAllocations(projectIds);
  let remaining = budget;
  for (const id of projectIds) {
    const amount = Math.min(sanitizeAmount(source[id], budget), remaining);
    next[id] = amount;
    remaining -= amount;
  }
  return next;
};

/** Largest amount this project can hold given what is invested elsewhere. */
export const maxForProject = (
  allocations: AllocationMap,
  projectId: ProjectId,
  budget = INVESTMENT_BUDGET
) => Math.max(0, budget - (totalInvested(allocations) - (allocations[projectId] || 0)));

/** Set one project's amount, clamped so the portfolio total never exceeds the budget. */
export const setAllocation = (
  allocations: AllocationMap,
  projectId: ProjectId,
  requested: unknown,
  budget = INVESTMENT_BUDGET
): AllocationMap => ({
  ...allocations,
  [projectId]: Math.min(
    sanitizeAmount(requested, budget),
    maxForProject(allocations, projectId, budget)
  ),
});

export const validateAllocations = (
  allocations: AllocationMap,
  projectIds: readonly ProjectId[],
  budget = INVESTMENT_BUDGET
) => {
  for (const [id, amount] of Object.entries(allocations)) {
    if (!projectIds.includes(id)) return `Unknown project: ${id}.`;
    if (!Number.isInteger(amount) || amount < 0 || amount > budget) {
      return `Each investment must be a whole-dollar amount from $0 to ${formatDollars(budget)}.`;
    }
  }
  if (totalInvested(allocations) > budget) {
    return `Your total cannot be more than ${formatDollars(budget)}.`;
  }
  return null;
};

// ── Formatting ────────────────────────────────────────────────────────────────

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatDollars = (amount: number) => usd.format(amount);

const trimDecimal = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");

/** "$1M", "$250K", "$12.5K", "$900". */
export const formatCompactDollars = (amount: number) => {
  if (amount >= 1_000_000) return `$${trimDecimal(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `$${trimDecimal(amount / 1_000)}K`;
  return `$${Math.round(amount)}`;
};

// ── Results ───────────────────────────────────────────────────────────────────

export type ProjectInvestmentSummary = {
  projectId: ProjectId;
  total: number;
  investors: number;
};

export const summarizeInvestments = (
  rows: Pick<PitchInvestmentRow, "allocations">[],
  projectIds: readonly ProjectId[],
  budget = INVESTMENT_BUDGET
) => {
  const projects: ProjectInvestmentSummary[] = projectIds.map((projectId) => ({
    projectId,
    total: 0,
    investors: 0,
  }));
  const byId = new Map(projects.map((project) => [project.projectId, project]));
  let capitalDeployed = 0;

  for (const row of rows) {
    const allocations = normalizeAllocations(row.allocations, projectIds, budget);
    for (const id of projectIds) {
      const amount = allocations[id];
      if (amount > 0) {
        const summary = byId.get(id)!;
        summary.total += amount;
        summary.investors += 1;
      }
    }
    capitalDeployed += totalInvested(allocations);
  }

  return {
    projects,
    investorCount: rows.length,
    capitalDeployed,
    capitalAvailable: rows.length * budget,
  };
};

// ── Live database ─────────────────────────────────────────────────────────────

export const isMissingSetupError = (error: SupabaseLikeError | null | undefined) =>
  error?.code === "PGRST202" ||
  error?.code === "PGRST205" ||
  error?.code === "42P01" ||
  /could not find the (function|table)|does not exist/i.test(error?.message || "");

export const fetchInvestmentRound = async (roundId: string) => {
  if (!supabase) return { round: null, error: notConfiguredError() };
  const { data, error } = await supabase.rpc("get_pitch_investment_round", {
    check_round_id: roundId,
  });
  return { round: (data?.[0] as InvestmentRound | undefined) ?? null, error };
};

type SubmitInvestmentArgs = {
  roundId: string;
  name: string;
  email: EmailAddress;
  allocations: AllocationMap;
};

export type SubmitInvestmentResult =
  | { mode: "created" | "updated"; savedAt: string; error?: never }
  | { error: SupabaseLikeError; mode?: never; savedAt?: never };

export const submitInvestment = async ({
  roundId,
  name,
  email,
  allocations,
}: SubmitInvestmentArgs): Promise<SubmitInvestmentResult> => {
  if (!supabase) return { error: notConfiguredError() };
  const { data, error } = await supabase.rpc("submit_pitch_investment", {
    submit_round_id: roundId,
    submit_student_name: name,
    submit_student_email: email,
    submit_allocations: allocations,
  });
  if (error) return { error };
  const row = data?.[0];
  return {
    mode: row?.submission_mode === "updated" ? "updated" : "created",
    savedAt: row?.saved_at ?? new Date().toISOString(),
  };
};

/** Instructor only: row-level security returns nothing to anyone else. */
export const fetchInvestments = async (roundId: string) => {
  if (!supabase) return { rows: [] as PitchInvestmentRow[], error: notConfiguredError() };
  const { data, error } = await supabase
    .from("pitch_investments")
    .select("*")
    .eq("round_id", roundId)
    .order("updated_at", { ascending: false });
  return { rows: (data ?? []) as PitchInvestmentRow[], error };
};

/** Instructor only: open or close investing for the round. */
export const setInvestmentRoundOpen = async (roundId: string, isOpen: boolean) => {
  if (!supabase) return { error: notConfiguredError() };
  const { data, error } = await supabase
    .from("pitch_investment_rounds")
    .update({ is_open: isOpen, updated_at: new Date().toISOString() })
    .eq("round_id", roundId)
    .select("is_open");
  if (!error && !data?.length) {
    return { error: { message: "The round was not updated. Check that you are signed in." } };
  }
  return { error };
};
