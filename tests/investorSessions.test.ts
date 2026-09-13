import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TERMS } from "../js/syllabusData";
import { courseDay, groupActivity, type AdminActivity } from "../src/lib/investorGame";

describe("syllabus and database session alignment", () => {
  it("includes every Yang-only session, and excludes guest sessions and breaks", () => {
    const syllabus = TERMS.flatMap((t) => t.rows).filter((r) => r.yangOnly);
    const sql = readFileSync("supabase/investor-game.sql", "utf8");
    const seeded = [
      ...sql.matchAll(
        /\('ep-investor-(\d{4}-\d{2}-\d{2})', 'ep-investor-2026-2027', '([^']+)', '([^']+)'::timestamptz, '([^']+)'::timestamptz\)/g
      ),
    ];
    expect(seeded.map((r) => r[1])).toEqual(syllabus.map((r) => r.isoDate));
    expect(syllabus).toHaveLength(14);
    for (const [i, row] of syllabus.entries()) {
      expect(seeded[i][2]).toBe(row.topic);
      expect(seeded[i][3]).toBe(
        `${row.isoDate} ${row.investmentWindow?.start || "13:00"} America/New_York`
      );
      expect(seeded[i][4]).toBe(
        `${row.isoDate} ${row.investmentWindow?.end || "14:00"} America/New_York`
      );
    }
    expect(syllabus.map((r) => r.topic)).toContain("Writing Thesis III");
    expect(syllabus.map((r) => r.topic)).not.toContain("EP Spring Showcase");
  });
});

describe("grouped event history", () => {
  it("groups by Eastern date, receiving team, then investor while retaining every change", () => {
    const entry: AdminActivity = {
      id: 1,
      created_at: "2026-09-15T00:10:00Z",
      player_id: "a",
      player_name: "Angel A",
      team_project_id: "own",
      event_label: "Pitch",
      allocations_before: { x: 5000000 },
      allocations_after: { x: 3000000, y: 2000000 },
      total_before: 5000000,
      total_after: 5000000,
    };
    const groups = groupActivity(
      [entry, { ...entry, id: 2, player_id: "b", player_name: "Angel B" }],
      ["x", "y"]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].day).toBe("2026-09-14");
    expect(groups[0].teams.map((t) => t.projectId)).toEqual(["x", "y"]);
    expect(groups[0].teams[0].people.map((p) => p.name)).toEqual(["Angel A", "Angel B"]);
    expect(groups[0].teams[0].people[0].entries[0].delta).toBe(-2000000);
    expect(groups[0].teams[1].people[0].entries[0].delta).toBe(2000000);
    expect(courseDay("2027-03-23T00:30:00Z")).toBe("2027-03-22");
  });
});
