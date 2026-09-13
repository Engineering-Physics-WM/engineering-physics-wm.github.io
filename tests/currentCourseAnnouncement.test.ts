import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { currentCourseAnnouncement } from "../js/news.jsx";

const item = (slug: string, date: string, pinned = false) => ({ slug, date, pinned });

describe("currentCourseAnnouncement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("features a pinned update even when it is dated in the future", () => {
    const items = [item("practice", "2026-09-11"), item("pitch-perfect-ii", "2026-09-14", true)];
    expect(currentCourseAnnouncement(items)?.slug).toBe("pitch-perfect-ii");
  });

  it("picks the latest-dated update when several are pinned", () => {
    const items = [
      item("welcome", "2026-08-23", true),
      item("practice", "2026-09-11"),
      item("pitch-perfect-ii", "2026-09-14", true),
    ];
    expect(currentCourseAnnouncement(items)?.slug).toBe("pitch-perfect-ii");
  });

  it("falls back to the newest update dated today or earlier when nothing is pinned", () => {
    const items = [
      item("old", "2026-08-23"),
      item("practice", "2026-09-11"),
      item("upcoming", "2026-09-20"),
    ];
    expect(currentCourseAnnouncement(items)?.slug).toBe("practice");
  });

  it("returns null when there are no updates", () => {
    expect(currentCourseAnnouncement([])).toBeNull();
  });
});
