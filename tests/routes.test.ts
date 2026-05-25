import { describe, expect, it } from "vitest";

import { hashForPage, parseHashToPage } from "../js/routes.js";

describe("parseHashToPage", () => {
  it("maps canonical hash fragments to page names", () => {
    expect(parseHashToPage("#/")).toBe("catalog");
    expect(parseHashToPage("#/updates")).toBe("news");
    expect(parseHashToPage("#/ranking")).toBe("ranking");
    expect(parseHashToPage("#/dashboard")).toBe("dashboard");
    expect(parseHashToPage("#/archive")).toBe("archive");
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
  it("maps page names to hash fragments", () => {
    expect(hashForPage("catalog")).toBe("#/");
    expect(hashForPage("news")).toBe("#/updates");
    expect(hashForPage("ranking")).toBe("#/ranking");
    expect(hashForPage("dashboard")).toBe("#/dashboard");
    expect(hashForPage("archive")).toBe("#/archive");
  });

  it("defaults to the catalog hash for an unknown page name", () => {
    expect(hashForPage("unknown")).toBe("#/");
    expect(hashForPage("")).toBe("#/");
  });

  it("round-trips: parseHashToPage(hashForPage(page)) === page", () => {
    const pages = ["catalog", "news", "ranking", "dashboard", "archive"];
    for (const page of pages) {
      expect(parseHashToPage(hashForPage(page))).toBe(page);
    }
  });
});
