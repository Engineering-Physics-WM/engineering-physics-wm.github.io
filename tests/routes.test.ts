import { describe, expect, it } from "vitest";

import { hashForPage, parseHashToPage, parseHashToYear } from "../js/routes.js";

describe("parseHashToPage", () => {
  it("maps canonical hash fragments to page names", () => {
    expect(parseHashToPage("#/")).toBe("catalog");
    expect(parseHashToPage("#/updates")).toBe("news");
    expect(parseHashToPage("#/ranking")).toBe("ranking");
    expect(parseHashToPage("#/syllabus/pitch-perfect-i/assignment")).toBe("pitchPerfectAssignment");
    expect(parseHashToPage("#/syllabus/career-success-i/assignment")).toBe(
      "careerSuccessAssignment"
    );
    expect(parseHashToPage("#/dashboard")).toBe("dashboard");
    expect(parseHashToPage("#/archive")).toBe("archive");
  });

  it("strips ?year= query suffix before lookup", () => {
    expect(parseHashToPage("#/?year=2024-2025")).toBe("catalog");
    expect(parseHashToPage("#/updates?year=2024-2025")).toBe("news");
    expect(parseHashToPage("#/archive?year=2023-2024")).toBe("archive");
  });

  it("defaults to catalog for an unrecognized hash path", () => {
    expect(parseHashToPage("#/unknown")).toBe("catalog");
    expect(parseHashToPage("#/settings")).toBe("catalog");
  });

  it("defaults to catalog for an empty hash", () => {
    expect(parseHashToPage("")).toBe("catalog");
    expect(parseHashToPage("#")).toBe("catalog");
  });
});

describe("hashForPage", () => {
  it("maps page names to hash fragments (no year)", () => {
    expect(hashForPage("catalog")).toBe("#/");
    expect(hashForPage("news")).toBe("#/updates");
    expect(hashForPage("ranking")).toBe("#/ranking");
    expect(hashForPage("pitchPerfectAssignment")).toBe("#/syllabus/pitch-perfect-i/assignment");
    expect(hashForPage("careerSuccessAssignment")).toBe("#/syllabus/career-success-i/assignment");
    expect(hashForPage("dashboard")).toBe("#/dashboard");
    expect(hashForPage("archive")).toBe("#/archive");
  });

  it("defaults to the catalog hash for an unknown page name", () => {
    expect(hashForPage("unknown")).toBe("#/");
    expect(hashForPage("")).toBe("#/");
  });

  it("omits year param when year equals currentYear", () => {
    expect(hashForPage("news", "2025-2026", "2025-2026")).toBe("#/updates");
    expect(hashForPage("catalog", "2024-2025", "2024-2025")).toBe("#/");
  });

  it("appends ?year= when year differs from currentYear", () => {
    expect(hashForPage("news", "2024-2025", "2025-2026")).toBe("#/updates?year=2024-2025");
    expect(hashForPage("archive", "2023-2024", "2025-2026")).toBe("#/archive?year=2023-2024");
  });

  it("round-trips: parseHashToPage(hashForPage(page)) === page", () => {
    const pages = [
      "catalog",
      "news",
      "syllabus",
      "pitchPerfectAssignment",
      "careerSuccessAssignment",
      "ranking",
      "dashboard",
      "archive",
    ];
    for (const page of pages) {
      expect(parseHashToPage(hashForPage(page))).toBe(page);
    }
  });
});

describe("parseHashToYear", () => {
  const defaultYear = "2025-2026";

  it("returns defaultYear when no ?year= param is present", () => {
    expect(parseHashToYear("#/", defaultYear)).toBe(defaultYear);
    expect(parseHashToYear("#/updates", defaultYear)).toBe(defaultYear);
    expect(parseHashToYear("", defaultYear)).toBe(defaultYear);
  });

  it("parses a valid YYYY-YYYY year param", () => {
    expect(parseHashToYear("#/updates?year=2024-2025", defaultYear)).toBe("2024-2025");
    expect(parseHashToYear("#/archive?year=2023-2024", defaultYear)).toBe("2023-2024");
  });

  it("returns defaultYear for malformed year values", () => {
    expect(parseHashToYear("#/?year=2025", defaultYear)).toBe(defaultYear);
    expect(parseHashToYear("#/?year=bad", defaultYear)).toBe(defaultYear);
    expect(parseHashToYear("#/?year=", defaultYear)).toBe(defaultYear);
    expect(parseHashToYear("#/?year=2025-26", defaultYear)).toBe(defaultYear);
  });

  it("round-trips with hashForPage", () => {
    const year = "2024-2025";
    const hash = hashForPage("archive", year, defaultYear);
    expect(parseHashToYear(hash, defaultYear)).toBe(year);
  });
});
