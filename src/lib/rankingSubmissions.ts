import { supabase } from "./supabaseClient";

import type { CohortYear, EmailAddress, RankingSubmissionPayload } from "../types/domain";

export const WM_EMAIL_RE = /^[^@\s]+@wm\.edu$/i;
export const DEFAULT_POLL_CLOSED_MESSAGE = "The ranking poll is not open for this cohort.";

type SupabaseLikeError = {
  code?: string;
  message?: string;
  context?: unknown;
};

export type SubmitRankingResult =
  | { mode: "created" | "updated"; error?: never }
  | { error: SupabaseLikeError; mode?: never };

type SubmitRankingArgs = {
  payload: RankingSubmissionPayload;
  cohortYear: CohortYear;
  cleanEmail: EmailAddress;
};

type StudentAllowedArgs = {
  cohortYear: CohortYear;
  cleanEmail: EmailAddress;
};

const missingSupabaseError = (): SupabaseLikeError => ({
  message: "Live ranking submission is not configured.",
});

export const normalizeStudentEmail = (value: string) =>
  value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();

export const createReceiptCode = () => {
  if (globalThis.crypto?.randomUUID) {
    return `EP-${globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  }
  return `EP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
};

export const isDuplicateSubmissionError = (error: SupabaseLikeError | null | undefined) =>
  error?.code === "23505" ||
  /ranking_one_response_per_student|duplicate key/i.test(error?.message || "");

export const isPolicyError = (error: SupabaseLikeError | null | undefined) =>
  error?.code === "42501";

export const isMissingSubmitFunctionError = (error: SupabaseLikeError | null | undefined) =>
  error?.code === "PGRST202" ||
  /submit_ranking_submission|could not find the function|function .* does not exist/i.test(
    error?.message || ""
  );

export const isStudentAllowed = async ({ cohortYear, cleanEmail }: StudentAllowedArgs) => {
  if (!supabase) return { allowed: false, error: missingSupabaseError() };

  const { data, error } = await supabase.rpc("is_ranking_student_allowed", {
    check_cohort_year: cohortYear,
    check_student_email: cleanEmail,
  });

  return { allowed: Boolean(data), error };
};

export const submitRankingViaRows = async ({
  payload,
  cohortYear,
  cleanEmail,
}: SubmitRankingArgs): Promise<SubmitRankingResult> => {
  if (!supabase) return { error: missingSupabaseError() };

  const { error } = await supabase.from("ranking_submissions").insert(payload);

  if (!error) return { mode: "created" };
  if (!isDuplicateSubmissionError(error) && !isPolicyError(error)) return { error };

  const { error: updateError, count } = await supabase
    .from("ranking_submissions")
    .update(
      {
        student_name: payload.student_name,
        notes: payload.notes,
        ranking: payload.ranking,
        receipt_code: payload.receipt_code,
      },
      { count: "exact" }
    )
    .eq("cohort_year", cohortYear)
    .ilike("student_email", cleanEmail);

  if (!updateError && count && count > 0) return { mode: "updated" };
  if (!updateError) {
    return {
      error: {
        message:
          "No existing response was updated. Please ask Prof. Yang to run the latest poll database update.",
      },
    };
  }
  return { error: updateError };
};

export const submitRankingLive = async ({
  payload,
  cohortYear,
  cleanEmail,
}: SubmitRankingArgs): Promise<SubmitRankingResult> => {
  if (!supabase) return { error: missingSupabaseError() };

  const { data, error } = await supabase.rpc("submit_ranking_submission", {
    submit_cohort_year: cohortYear,
    submit_student_name: payload.student_name,
    submit_student_email: cleanEmail,
    submit_ranking: payload.ranking,
    submit_receipt_code: payload.receipt_code,
  });

  if (!error) {
    return {
      mode: data?.[0]?.submission_mode === "updated" ? "updated" : "created",
    };
  }

  if (isMissingSubmitFunctionError(error)) {
    return submitRankingViaRows({ payload, cohortYear, cleanEmail });
  }

  return { error };
};
