import { describe, expect, it } from "vitest";
import { PITCH_TEAMS, pitchOrderFor, sessionSchedule, TERMS } from "../js/syllabusData";

const sessions = TERMS.flatMap((t) => t.rows).filter(
  (r) => r.yangOnly && !["break", "cancelled", "tbd"].includes(r.kind || ""),
);

describe("investment session schedule", () => {
  it("fills a 50-minute class with 5-minute opening and closing", () => {
    const slots = sessionSchedule(sessions.find((r) => r.isoDate === "2026-09-14")!);
    expect(slots[0]).toMatchObject({ start: "1:00", end: "1:05", kind: "opening" });
    expect(slots.at(-1)).toMatchObject({ start: "1:45", end: "1:50", kind: "closing" });
    expect(slots.filter((s) => s.kind === "team")).toHaveLength(PITCH_TEAMS.length);
  });

  it("gives every team a slot and every session a different order", () => {
    const orders = sessions.map((r) => pitchOrderFor(r.isoDate));
    for (const order of orders) expect([...order].sort()).toEqual([...PITCH_TEAMS].sort());
    expect(new Set(orders.map((o) => o.join("|"))).size).toBe(orders.length);
  });

  it("is stable across calls", () => {
    expect(pitchOrderFor("2026-09-14")).toEqual(pitchOrderFor("2026-09-14"));
  });
});
