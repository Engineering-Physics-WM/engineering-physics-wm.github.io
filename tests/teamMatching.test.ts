import { describe, expect, it } from "vitest";

import { buildTeams, TEAM_MAX, TEAM_MIN } from "../src/features/teams/teamMatching";

import type {
  AllowedStudent,
  ProjectId,
  ProjectRecord,
  RankingResponse,
  TeamMatchingSummary,
} from "../src/types/domain";

const makeProjects = (ids: ProjectId[]): ProjectRecord[] =>
  ids.map((id, index) => ({
    id,
    num: index + 1,
    title: `Project ${id}`,
    advisor: `Advisor ${id}`,
  }));

const rankingWithFirst = (projectIds: ProjectId[], firstChoice: ProjectId): ProjectId[] => [
  firstChoice,
  ...projectIds.filter((id) => id !== firstChoice),
];

const makeResponse = (
  label: string,
  ranking: ProjectId[],
  email = `${label.toLowerCase()}@wm.edu`
): RankingResponse => ({
  name: label,
  email,
  ranking,
});

const activeSizes = (result: TeamMatchingSummary) =>
  result.activeProjectIds.map((projectId) => result.teams[projectId].length);

const assignedCount = (result: TeamMatchingSummary) => Object.keys(result.assigned).length;

const firstChoiceCount = (result: TeamMatchingSummary) =>
  Object.values(result.assigned).filter((assignment) => assignment.prefRank === 0).length;

const topThreeCount = (result: TeamMatchingSummary) =>
  Object.values(result.assigned).filter(
    (assignment) => assignment.prefRank >= 0 && assignment.prefRank < 3
  ).length;

const sortedRosterSnapshot = (result: TeamMatchingSummary) =>
  Object.fromEntries(
    Object.entries(result.teams).map(([projectId, roster]) => [
      projectId,
      roster.map((student) => `${student.email}:${student.prefRank}:${student.locked}`).sort(),
    ])
  );

describe("team matching", () => {
  it("keeps every active team within the current minimum and maximum size rules", () => {
    const projectIds = ["alpha", "bravo", "charlie", "delta"];
    const projects = makeProjects(projectIds);
    const responses = [
      makeResponse("S1", rankingWithFirst(projectIds, "alpha")),
      makeResponse("S2", rankingWithFirst(projectIds, "alpha")),
      makeResponse("S3", rankingWithFirst(projectIds, "bravo")),
      makeResponse("S4", rankingWithFirst(projectIds, "bravo")),
      makeResponse("S5", rankingWithFirst(projectIds, "charlie")),
      makeResponse("S6", rankingWithFirst(projectIds, "charlie")),
      makeResponse("S7", rankingWithFirst(projectIds, "delta")),
      makeResponse("S8", rankingWithFirst(projectIds, "delta")),
    ];

    const result = buildTeams({ projects, responses, seed: "team-size" });

    expect(assignedCount(result)).toBe(responses.length);
    expect(result.activeProjectIds).toHaveLength(4);
    expect(activeSizes(result).every((size) => size >= TEAM_MIN && size <= TEAM_MAX)).toBe(true);
    expect(result.warnings).not.toContainEqual(
      expect.objectContaining({
        type: "team-size",
      })
    );
  });

  it("keeps locked honors project assignments fixed even when the student ranked another project first", () => {
    const projectIds = ["alpha", "bravo", "honors"];
    const projects = makeProjects(projectIds);
    const lockedEmail = "honors.student@wm.edu";
    const students: AllowedStudent[] = [
      {
        name: "Honors Student",
        email: lockedEmail,
        honorsProject: {
          number: 3,
          projectId: "honors",
          projectTitle: "Project honors",
          lockedForMatching: true,
        },
      },
    ];
    const responses = [
      makeResponse("Honors Student", ["alpha", "bravo", "honors"], lockedEmail),
      makeResponse("S1", ["alpha", "bravo", "honors"]),
      makeResponse("S2", ["alpha", "bravo", "honors"]),
      makeResponse("S3", ["bravo", "alpha", "honors"]),
      makeResponse("S4", ["bravo", "alpha", "honors"]),
      makeResponse("S5", ["honors", "alpha", "bravo"]),
    ];

    const result = buildTeams({ projects, responses, students, seed: "honors-lock" });
    const lockedAssignment = result.assigned[lockedEmail];
    const lockedRosterEntry = result.teams.honors.find((student) => student.email === lockedEmail);

    expect(lockedAssignment).toEqual({ project: "honors", prefRank: 2, locked: true });
    expect(lockedRosterEntry).toMatchObject({
      email: lockedEmail,
      prefRank: 2,
      locked: true,
      honorsProject: expect.objectContaining({ projectId: "honors" }),
    });
    expect(activeSizes(result).every((size) => size >= TEAM_MIN && size <= TEAM_MAX)).toBe(true);
  });

  it("top one mode prioritizes first-choice active projects and assignments", () => {
    const projects = makeProjects(["alpha", "bravo", "charlie", "delta"]);
    const responses = [
      makeResponse("S1", ["alpha", "delta", "bravo", "charlie"]),
      makeResponse("S2", ["alpha", "delta", "bravo", "charlie"]),
      makeResponse("S3", ["bravo", "delta", "alpha", "charlie"]),
      makeResponse("S4", ["bravo", "delta", "alpha", "charlie"]),
      makeResponse("S5", ["charlie", "delta", "alpha", "bravo"]),
      makeResponse("S6", ["charlie", "delta", "alpha", "bravo"]),
    ];

    const topOne = buildTeams({ projects, responses, mode: "top1", seed: "mode-comparison" });
    const topThree = buildTeams({ projects, responses, mode: "top3", seed: "mode-comparison" });

    expect(topOne.matchingMode).toBe("top1");
    expect(topOne.activeProjectIds).toEqual(["alpha", "bravo", "charlie"]);
    expect(topOne.inactiveProjectIds).toEqual(["delta"]);
    expect(firstChoiceCount(topOne)).toBeGreaterThanOrEqual(firstChoiceCount(topThree));
    expect(firstChoiceCount(topOne)).toBe(responses.length);
  });

  it("top three balance mode keeps the largest viable team set active while preserving top-three satisfaction", () => {
    const projects = makeProjects(["alpha", "bravo", "charlie"]);
    const responses = [
      makeResponse("S1", ["alpha", "charlie", "bravo"]),
      makeResponse("S2", ["alpha", "charlie", "bravo"]),
      makeResponse("S3", ["alpha", "charlie", "bravo"]),
      makeResponse("S4", ["bravo", "charlie", "alpha"]),
      makeResponse("S5", ["bravo", "charlie", "alpha"]),
      makeResponse("S6", ["bravo", "charlie", "alpha"]),
    ];

    const result = buildTeams({ projects, responses, mode: "top3", seed: "top-three" });

    expect(result.matchingMode).toBe("top3");
    expect(result.activeProjectIds).toEqual(["alpha", "bravo", "charlie"]);
    expect(result.inactiveProjectIds).toEqual([]);
    expect(topThreeCount(result)).toBe(responses.length);
    expect(firstChoiceCount(result)).toBe(4);
    expect(result.teams.charlie).toHaveLength(2);
    expect(result.teams.charlie.every((student) => student.prefRank === 1)).toBe(true);
  });

  it("returns deterministic rosters for the same input and seed", () => {
    const projects = makeProjects(["alpha", "bravo", "charlie", "delta"]);
    const responses = [
      makeResponse("S1", ["alpha", "delta", "bravo", "charlie"]),
      makeResponse("S2", ["alpha", "delta", "bravo", "charlie"]),
      makeResponse("S3", ["bravo", "delta", "alpha", "charlie"]),
      makeResponse("S4", ["bravo", "delta", "alpha", "charlie"]),
      makeResponse("S5", ["charlie", "delta", "alpha", "bravo"]),
      makeResponse("S6", ["charlie", "delta", "alpha", "bravo"]),
    ];

    const first = buildTeams({ projects, responses, mode: "top3", seed: "stable-seed" });
    const second = buildTeams({ projects, responses, mode: "top3", seed: "stable-seed" });

    expect(sortedRosterSnapshot(first)).toEqual(sortedRosterSnapshot(second));
    expect(first.assigned).toEqual(second.assigned);
  });

  it("reports an optimizer warning when there are too few students to form a legal team", () => {
    const projects = makeProjects(["alpha", "bravo"]);
    const responses = [makeResponse("S1", ["alpha", "bravo"])];

    const result = buildTeams({ projects, responses, seed: "too-few" });

    expect(assignedCount(result)).toBe(0);
    expect(result.activeProjectIds).toEqual([]);
    expect(result.warnings).toContainEqual({ type: "optimizer-unassigned", size: 1 });
  });

  it("reports an optimizer warning when demand exceeds total project capacity", () => {
    const projectIds = ["alpha", "bravo"];
    const projects = makeProjects(projectIds);
    const responses = Array.from({ length: TEAM_MAX * projects.length + 1 }, (_, index) =>
      makeResponse(
        `S${index + 1}`,
        rankingWithFirst(projectIds, index % 2 === 0 ? "alpha" : "bravo")
      )
    );

    const result = buildTeams({ projects, responses, seed: "too-many" });

    expect(assignedCount(result)).toBe(0);
    expect(result.activeProjectIds).toEqual([]);
    expect(result.warnings).toContainEqual({
      type: "optimizer-unassigned",
      size: responses.length,
    });
  });

  it("keeps students with missing rankings assignable and marks the assignment as unranked", () => {
    const projects = makeProjects(["alpha", "bravo"]);
    const responses = [
      makeResponse("Missing 1", [], "missing1@wm.edu"),
      makeResponse("Missing 2", [], "missing2@wm.edu"),
      makeResponse("Alpha", ["alpha", "bravo"], "alpha@wm.edu"),
      makeResponse("Bravo", ["bravo", "alpha"], "bravo@wm.edu"),
    ];

    const result = buildTeams({ projects, responses, seed: "missing-rankings" });

    expect(assignedCount(result)).toBe(responses.length);
    expect(result.assigned["missing1@wm.edu"].prefRank).toBe(projects.length);
    expect(result.assigned["missing2@wm.edu"].prefRank).toBe(projects.length);
    expect(activeSizes(result).every((size) => size >= TEAM_MIN && size <= TEAM_MAX)).toBe(true);
  });

  it("tolerates duplicate project ids in ranking arrays without creating invalid assignments", () => {
    const projectIds = ["alpha", "bravo"];
    const projects = makeProjects(projectIds);
    const responses = [
      makeResponse("S1", ["alpha", "alpha", "bravo"]),
      makeResponse("S2", ["alpha", "bravo"]),
      makeResponse("S3", ["bravo", "bravo", "alpha"]),
      makeResponse("S4", ["bravo", "alpha"]),
    ];

    const result = buildTeams({ projects, responses, seed: "duplicate-rankings" });
    const validProjectIds = new Set(projectIds);

    expect(assignedCount(result)).toBe(responses.length);
    expect(
      Object.values(result.assigned).every((assignment) => validProjectIds.has(assignment.project))
    ).toBe(true);
    expect(activeSizes(result).every((size) => size >= TEAM_MIN && size <= TEAM_MAX)).toBe(true);
  });
});
