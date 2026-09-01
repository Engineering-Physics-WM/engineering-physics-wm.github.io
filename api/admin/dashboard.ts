import { asc, eq } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireInstructor } from "../../server/auth";
import { getDb } from "../../server/db";
import { applyCors, fail, json, options, queryString } from "../../server/http";
import { allowedStudentRow, rankingSubmissionRow, teamMemberRow } from "../../server/rows";
import { cohortTeamMembers, rankingAllowedStudents, rankingSubmissions } from "../../server/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "GET") return json(res, 405, { error: "GET required." });

  try {
    await requireInstructor(req);
    const cohortYear = queryString(req.query.cohortYear);
    if (!cohortYear) return json(res, 400, { error: "cohortYear is required." });
    const db = getDb();
    const [submissions, students, teams] = await Promise.all([
      db
        .select()
        .from(rankingSubmissions)
        .where(eq(rankingSubmissions.cohortYear, cohortYear))
        .orderBy(asc(rankingSubmissions.createdAt)),
      db
        .select()
        .from(rankingAllowedStudents)
        .where(eq(rankingAllowedStudents.cohortYear, cohortYear))
        .orderBy(asc(rankingAllowedStudents.studentName)),
      db
        .select()
        .from(cohortTeamMembers)
        .where(eq(cohortTeamMembers.cohortYear, cohortYear))
        .orderBy(asc(cohortTeamMembers.projectId), asc(cohortTeamMembers.sortOrder)),
    ]);
    return json(res, 200, {
      rankingSubmissions: submissions.map(rankingSubmissionRow),
      allowedStudents: students.map(allowedStudentRow),
      teamMembers: teams.map(teamMemberRow),
    });
  } catch (error) {
    return fail(res, error, "Dashboard data could not load.");
  }
}
