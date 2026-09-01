import { apiFetch, isBackendConfigured } from "./apiClient";

import type { CohortYear, EmailAddress, RankingSubmissionPayload } from "../types/domain";

export const WM_EMAIL_RE = /^[^@\s]+@wm\.edu$/i;
export const DEFAULT_POLL_CLOSED_MESSAGE = "The ranking poll is not open for this cohort.";

type LiveApiError = {
  code?: string;
  message?: string;
  context?: unknown;
};

export type SubmitRankingResult =
  | { mode: "created" | "updated"; error?: never }
  | { error: LiveApiError; mode?: never };

type SubmitRankingArgs = {
  payload: RankingSubmissionPayload;
  cohortYear: CohortYear;
  cleanEmail: EmailAddress;
};

type StudentAllowedArgs = {
  cohortYear: CohortYear;
  cleanEmail: EmailAddress;
};

const missingBackendError = (): LiveApiError => ({
  message: "Live ranking submission is not configured.",
});

const toLiveError = (error: unknown): LiveApiError => {
  if (error && typeof error === "object") {
    const value = error as { code?: string; message?: string; status?: number };
    return { code: value.code, message: value.message, context: value.status };
  }
  return { message: "Live ranking submission failed." };
};

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

export const isDuplicateSubmissionError = (error: LiveApiError | null | undefined) =>
  error?.code === "23505" ||
  /ranking_one_response_per_student|duplicate key/i.test(error?.message || "");

export const isPolicyError = (error: LiveApiError | null | undefined) =>
  error?.code === "42501" || error?.code === "poll_closed" || error?.code === "not_allowed";

export const isMissingSubmitFunctionError = (error: LiveApiError | null | undefined) =>
  error?.code === "PGRST202" ||
  /submit_ranking_submission|could not find the function|function .* does not exist/i.test(
    error?.message || ""
  );

export const isStudentAllowed = async ({ cohortYear, cleanEmail }: StudentAllowedArgs) => {
  if (!isBackendConfigured) return { allowed: false, error: missingBackendError() };
  try {
    const result = await apiFetch<{ allowed: boolean }>("/api/ranking/check", {
      method: "POST",
      body: JSON.stringify({ cohortYear, email: cleanEmail }),
    });
    return { allowed: Boolean(result.allowed), error: null };
  } catch (error) {
    return { allowed: false, error: toLiveError(error) };
  }
};

export const submitRankingViaRows = async ({
  payload,
  cohortYear,
  cleanEmail,
}: SubmitRankingArgs): Promise<SubmitRankingResult> => {
  if (!isBackendConfigured) return { error: missingBackendError() };
  try {
    const result = await apiFetch<{ mode: "created" | "updated" }>("/api/ranking/submit", {
      method: "POST",
      body: JSON.stringify({
        cohortYear,
        studentName: payload.student_name,
        studentEmail: cleanEmail,
        ranking: payload.ranking,
        receiptCode: payload.receipt_code,
      }),
    });
    return { mode: result.mode };
  } catch (error) {
    return { error: toLiveError(error) };
  }
};

export const submitRankingLive = async ({
  payload,
  cohortYear,
  cleanEmail,
}: SubmitRankingArgs): Promise<SubmitRankingResult> => {
  return submitRankingViaRows({ payload, cohortYear, cleanEmail });
};
