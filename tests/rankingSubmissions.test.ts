import { describe, expect, it } from "vitest";

import {
  WM_EMAIL_RE,
  createReceiptCode,
  isDuplicateSubmissionError,
  isMissingSubmitFunctionError,
  isPolicyError,
  normalizeStudentEmail,
} from "../src/lib/rankingSubmissions";

describe("normalizeStudentEmail", () => {
  it("lowercases and trims surrounding whitespace", () => {
    expect(normalizeStudentEmail("  User@WM.EDU  ")).toBe("user@wm.edu");
  });

  it("strips zero-width characters", () => {
    expect(normalizeStudentEmail("user​@wm.edu")).toBe("user@wm.edu");
    expect(normalizeStudentEmail("﻿user@wm.edu")).toBe("user@wm.edu");
    expect(normalizeStudentEmail("user‍@wm.edu")).toBe("user@wm.edu");
  });

  it("preserves a clean address unchanged", () => {
    expect(normalizeStudentEmail("student@wm.edu")).toBe("student@wm.edu");
  });
});

describe("WM_EMAIL_RE", () => {
  it("accepts @wm.edu addresses", () => {
    expect(WM_EMAIL_RE.test("student@wm.edu")).toBe(true);
    expect(WM_EMAIL_RE.test("first.last@wm.edu")).toBe(true);
  });

  it("rejects addresses with other domains", () => {
    expect(WM_EMAIL_RE.test("student@gmail.com")).toBe(false);
    expect(WM_EMAIL_RE.test("student@williamandmary.edu")).toBe(false);
    expect(WM_EMAIL_RE.test("student@wm.edu.evil.com")).toBe(false);
  });

  it("rejects addresses with no @", () => {
    expect(WM_EMAIL_RE.test("studentwm.edu")).toBe(false);
  });
});

describe("createReceiptCode", () => {
  it("starts with EP-", () => {
    expect(createReceiptCode()).toMatch(/^EP-/);
  });

  it("has the expected format: EP- followed by 8 uppercase alphanumeric characters", () => {
    expect(createReceiptCode()).toMatch(/^EP-[A-Z0-9]{8}$/);
  });

  it("produces unique codes across repeated calls", () => {
    const codes = new Set(Array.from({ length: 20 }, createReceiptCode));
    expect(codes.size).toBe(20);
  });
});

describe("isDuplicateSubmissionError", () => {
  it("returns true for PostgreSQL unique-violation code 23505", () => {
    expect(isDuplicateSubmissionError({ code: "23505" })).toBe(true);
  });

  it("returns true when message contains 'duplicate key'", () => {
    expect(
      isDuplicateSubmissionError({ message: "duplicate key value violates unique constraint" })
    ).toBe(true);
  });

  it("returns true when message contains the constraint name", () => {
    expect(
      isDuplicateSubmissionError({ message: "ranking_one_response_per_student constraint" })
    ).toBe(true);
  });

  it("returns false for a policy error", () => {
    expect(isDuplicateSubmissionError({ code: "42501" })).toBe(false);
  });

  it("returns false for null or undefined", () => {
    expect(isDuplicateSubmissionError(null)).toBe(false);
    expect(isDuplicateSubmissionError(undefined)).toBe(false);
  });
});

describe("isPolicyError", () => {
  it("returns true for PostgreSQL insufficient-privilege code 42501", () => {
    expect(isPolicyError({ code: "42501" })).toBe(true);
  });

  it("returns false for a duplicate-key error", () => {
    expect(isPolicyError({ code: "23505" })).toBe(false);
  });

  it("returns false for null or undefined", () => {
    expect(isPolicyError(null)).toBe(false);
    expect(isPolicyError(undefined)).toBe(false);
  });
});

describe("isMissingSubmitFunctionError", () => {
  it("returns true for PostgREST PGRST202 code", () => {
    expect(isMissingSubmitFunctionError({ code: "PGRST202" })).toBe(true);
  });

  it("returns true when message references submit_ranking_submission", () => {
    expect(
      isMissingSubmitFunctionError({
        message: "could not find the function submit_ranking_submission",
      })
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isMissingSubmitFunctionError({ code: "23505" })).toBe(false);
    expect(isMissingSubmitFunctionError(null)).toBe(false);
  });
});
