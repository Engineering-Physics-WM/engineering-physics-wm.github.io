import { describe, expect, it } from "vitest";

import {
  type AllocationMap,
  INVESTMENT_BUDGET,
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
} from "../src/lib/pitchInvestments";

const IDS = ["a", "b", "c"];

describe("sanitizeAmount", () => {
  it("clamps to whole dollars between zero and the budget", () => {
    expect(sanitizeAmount(-5)).toBe(0);
    expect(sanitizeAmount(Number.NaN)).toBe(0);
    expect(sanitizeAmount("abc")).toBe(0);
    expect(sanitizeAmount(1234.6)).toBe(1235);
    expect(sanitizeAmount(5_000_000)).toBe(INVESTMENT_BUDGET);
  });
});

describe("parseDollarInput", () => {
  it("accepts plain numbers, dollar formatting, and k/m suffixes", () => {
    expect(parseDollarInput("250000")).toBe(250_000);
    expect(parseDollarInput("$1,000,000")).toBe(1_000_000);
    expect(parseDollarInput("250k")).toBe(250_000);
    expect(parseDollarInput("1.5K")).toBe(1_500);
    expect(parseDollarInput("1m")).toBe(1_000_000);
    expect(parseDollarInput("  ")).toBe(0);
  });

  it("returns null for text that is not an amount", () => {
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

  it("lets a project be lowered and frees that budget for others", () => {
    let allocations: AllocationMap = { a: 1_000_000, b: 0, c: 0 };
    allocations = setAllocation(allocations, "a", 400_000);
    expect(maxForProject(allocations, "b")).toBe(600_000);
    allocations = setAllocation(allocations, "b", 600_000);
    expect(totalInvested(allocations)).toBe(1_000_000);
  });
});

describe("normalizeAllocations", () => {
  it("drops unknown projects, fills missing ones, and caps the running total", () => {
    expect(normalizeAllocations({ a: 900_000, b: 500_000, z: 10 }, IDS)).toEqual({
      a: 900_000,
      b: 100_000,
      c: 0,
    });
    expect(normalizeAllocations(null, IDS)).toEqual({ a: 0, b: 0, c: 0 });
  });
});

describe("validateAllocations", () => {
  it("flags totals over budget, unknown projects, and fractional amounts", () => {
    expect(validateAllocations({ a: 600_000, b: 500_000 }, IDS)).toMatch(/cannot be more/);
    expect(validateAllocations({ z: 1 }, IDS)).toMatch(/Unknown project/);
    expect(validateAllocations({ a: 10.5 }, IDS)).toMatch(/whole-dollar/);
    expect(validateAllocations({ a: 1_000_000, b: 0, c: 0 }, IDS)).toBeNull();
  });
});

describe("summarizeInvestments", () => {
  it("totals capital and counts investors per project", () => {
    const summary = summarizeInvestments(
      [{ allocations: { a: 500_000, b: 500_000 } }, { allocations: { a: 250_000, c: 0 } }],
      IDS
    );
    expect(summary.projects).toEqual([
      { projectId: "a", total: 750_000, investors: 2 },
      { projectId: "b", total: 500_000, investors: 1 },
      { projectId: "c", total: 0, investors: 0 },
    ]);
    expect(summary.investorCount).toBe(2);
    expect(summary.capitalDeployed).toBe(1_250_000);
    expect(summary.capitalAvailable).toBe(2_000_000);
  });
});

describe("dollar formatting", () => {
  it("formats full and compact amounts", () => {
    expect(formatDollars(1_000_000)).toBe("$1,000,000");
    expect(formatCompactDollars(1_000_000)).toBe("$1M");
    expect(formatCompactDollars(1_250_000)).toBe("$1.25M");
    expect(formatCompactDollars(250_000)).toBe("$250K");
    expect(formatCompactDollars(12_500)).toBe("$12.5K");
    expect(formatCompactDollars(900)).toBe("$900");
  });
});
