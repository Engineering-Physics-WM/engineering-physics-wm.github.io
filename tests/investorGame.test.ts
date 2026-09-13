import { describe, expect, it } from "vitest";

import {
  type AllocationMap,
  INVESTMENT_BUDGET,
  cleanPlayerName,
  describeChanges,
  emptyAllocations,
  formatCompactDollars,
  formatDollars,
  maxForProject,
  normalizeAllocations,
  parseDollarInput,
  sanitizeAmount,
  setAllocation,
  summarizeInvestments,
  totalInvested,
  validateAllocations,
  validatePassword,
} from "../src/lib/investorGame";

const IDS = ["a", "b", "c"];

describe("login input", () => {
  it("collapses whitespace in names and checks password length", () => {
    expect(cleanPlayerName("  Kamila   ")).toBe("Kamila");
    expect(validatePassword("maple42")).toBeNull();
    expect(validatePassword(" ab ")).toMatch(/3 to 64/);
  });
});

describe("sanitizeAmount and parseDollarInput", () => {
  it("rounds amounts to $10K steps within the budget", () => {
    expect(sanitizeAmount(-5)).toBe(0);
    expect(sanitizeAmount("abc")).toBe(0);
    expect(sanitizeAmount(4_999)).toBe(0);
    expect(sanitizeAmount(14_999)).toBe(10_000);
    expect(sanitizeAmount(15_000)).toBe(20_000);
    expect(sanitizeAmount(5_000_000)).toBe(INVESTMENT_BUDGET);
  });

  it("reads plain, formatted, and k/m amounts", () => {
    expect(parseDollarInput("$1,000,000")).toBe(1_000_000);
    expect(parseDollarInput("250k")).toBe(250_000);
    expect(parseDollarInput("1m")).toBe(1_000_000);
    expect(parseDollarInput("  ")).toBe(0);
    expect(parseDollarInput("lots")).toBeNull();
    expect(parseDollarInput("-5")).toBeNull();
  });
});

describe("setAllocation", () => {
  it("never lets the portfolio total pass the budget", () => {
    let allocations = emptyAllocations(IDS);
    allocations = setAllocation(allocations, "a", 700_000);
    allocations = setAllocation(allocations, "b", 700_000);
    expect(allocations.b).toBe(300_000);
    expect(totalInvested(allocations)).toBe(INVESTMENT_BUDGET);
    expect(maxForProject(allocations, "c")).toBe(0);
  });

  it("lets money be pulled out of one team and moved to another", () => {
    let allocations: AllocationMap = { a: 1_000_000, b: 0, c: 0 };
    allocations = setAllocation(allocations, "a", 400_000);
    expect(maxForProject(allocations, "b")).toBe(600_000);
    allocations = setAllocation(allocations, "b", 600_000);
    expect(allocations).toEqual({ a: 400_000, b: 600_000, c: 0 });
  });

  it("rounds typed amounts to the nearest $10K step", () => {
    expect(setAllocation(emptyAllocations(IDS), "a", 25_000).a).toBe(30_000);
    expect(setAllocation(emptyAllocations(IDS), "a", 4_000).a).toBe(0);
  });

  it("keeps the student's own team at zero", () => {
    const allocations = setAllocation(emptyAllocations(IDS), "b", 500_000, "b");
    expect(allocations.b).toBe(0);
    expect(maxForProject(allocations, "b", "b")).toBe(0);
    expect(maxForProject(allocations, "a", "b")).toBe(INVESTMENT_BUDGET);
  });
});

describe("normalizeAllocations", () => {
  it("drops unknown teams, caps the total, and zeroes the own team", () => {
    expect(normalizeAllocations({ a: 900_000, b: 500_000, z: 10 }, IDS)).toEqual({
      a: 900_000,
      b: 100_000,
      c: 0,
    });
    expect(normalizeAllocations({ a: 300_000, b: 200_000 }, IDS, "b")).toEqual({
      a: 300_000,
      b: 0,
      c: 0,
    });
    expect(normalizeAllocations(null, IDS)).toEqual({ a: 0, b: 0, c: 0 });
  });
});

describe("validateAllocations", () => {
  it("flags totals over budget, unknown teams, fractions, and own-team money", () => {
    expect(validateAllocations({ a: 600_000, b: 500_000 }, IDS)).toMatch(/cannot be more/);
    expect(validateAllocations({ z: 1 }, IDS)).toMatch(/Unknown team/);
    expect(validateAllocations({ a: 10.5 }, IDS)).toMatch(/whole-dollar/);
    expect(validateAllocations({ a: 25_000 }, IDS)).toMatch(/\$10,000 steps/);
    expect(validateAllocations({ b: 1 }, IDS, "b")).toMatch(/own team/);
    expect(validateAllocations({ a: 1_000_000, b: 0, c: 0 }, IDS, "b")).toBeNull();
  });
});

describe("describeChanges", () => {
  it("lists only the teams whose amounts moved", () => {
    expect(
      describeChanges({ a: 500_000, b: 200_000 }, { a: 300_000, b: 200_000, c: 200_000 }, IDS)
    ).toEqual([
      { projectId: "a", delta: -200_000 },
      { projectId: "c", delta: 200_000 },
    ]);
    expect(describeChanges({ a: 1 }, { a: 1 }, IDS)).toEqual([]);
  });
});

describe("summarizeInvestments", () => {
  it("totals capital, counts investors and team members, and ignores own-team money", () => {
    const summary = summarizeInvestments(
      [
        { allocations: { a: 500_000, b: 500_000 }, team_project_id: "c" },
        { allocations: { a: 250_000, c: 100 }, team_project_id: "c" },
        { allocations: { b: 100_000 }, team_project_id: null },
      ],
      IDS
    );
    expect(summary.projects).toEqual([
      { projectId: "a", total: 750_000, investors: 2, teamPlayers: 0 },
      { projectId: "b", total: 600_000, investors: 2, teamPlayers: 0 },
      { projectId: "c", total: 0, investors: 0, teamPlayers: 2 },
    ]);
    expect(summary.playerCount).toBe(3);
    expect(summary.capitalDeployed).toBe(1_350_000);
    expect(summary.capitalAvailable).toBe(3_000_000);
  });
});

describe("dollar formatting", () => {
  it("formats full and compact amounts", () => {
    expect(formatDollars(1_000_000)).toBe("$1,000,000");
    expect(formatCompactDollars(1_250_000)).toBe("$1.25M");
    expect(formatCompactDollars(250_000)).toBe("$250K");
    expect(formatCompactDollars(12_500)).toBe("$12.5K");
    expect(formatCompactDollars(900)).toBe("$900");
  });
});
