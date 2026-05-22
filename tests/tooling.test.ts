import { describe, expect, it } from "vitest";

import { TEAM_MAX, TEAM_MIN, rankSatisfaction } from "../js/teamMatching.js";

describe("frontend quality tooling", () => {
  it("loads existing matching utilities in Vitest", () => {
    expect(TEAM_MIN).toBe(2);
    expect(TEAM_MAX).toBe(3);
    expect(rankSatisfaction(0, 5)).toBeGreaterThan(rankSatisfaction(3, 5));
  });
});
