import { asc, eq } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireInstructor } from "../../server/auth";
import { getDb } from "../../server/db";
import {
  applyCors,
  ApiError,
  fail,
  json,
  options,
  readJson,
  requireString,
} from "../../server/http";
import { teamMemberRow } from "../../server/rows";
import { cohortTeamMembers } from "../../server/schema";

type TeamRowInput = {
  cohort_year?: string;
  project_id?: string;
  project_number?: number | null;
  person_name?: string;
  person_email?: string | null;
  member_type?: string;
  source?: string | null;
  locked?: boolean;
  sort_order?: number | null;
};

type TeamsBody = { cohortYear?: string; rows?: TeamRowInput[] };

const valuesFor = (row: TeamRowInput, cohortYear: string, assignedByEmail: string) => {
  const projectId = requireString(row.project_id, "project_id");
  const personName = requireString(row.person_name, "person_name");
  const memberType = requireString(row.member_type, "member_type");
  if (!["student", "mentor"].includes(memberType)) {
    throw new ApiError("member_type must be student or mentor.");
  }
  return {
    cohortYear,
    projectId,
    projectNumber: Number.isFinite(row.project_number) ? Number(row.project_number) : null,
    personName,
    personEmail: row.person_email || null,
    memberType,
    source: row.source || null,
    locked: Boolean(row.locked),
    sortOrder: Number.isFinite(row.sort_order) ? Number(row.sort_order) : null,
    assignedByEmail,
    updatedAt: new Date(),
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });

  try {
    const instructor = await requireInstructor(req);
    const body = await readJson<TeamsBody>(req);
    const cohortYear = requireString(body.cohortYear, "cohortYear");
    if (!Array.isArray(body.rows)) throw new ApiError("rows must be an array.");
    const rows = body.rows.map((row) => valuesFor(row, cohortYear, instructor.email));
    const db = getDb();

    await db.delete(cohortTeamMembers).where(eq(cohortTeamMembers.cohortYear, cohortYear));
    if (rows.length) await db.insert(cohortTeamMembers).values(rows);

    const saved = await db
      .select()
      .from(cohortTeamMembers)
      .where(eq(cohortTeamMembers.cohortYear, cohortYear))
      .orderBy(asc(cohortTeamMembers.projectId), asc(cohortTeamMembers.sortOrder));
    return json(res, 200, { teamMembers: saved.map(teamMemberRow) });
  } catch (error) {
    return fail(res, error, "Teams could not save.");
  }
}
