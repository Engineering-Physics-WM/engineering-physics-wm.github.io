import { eq, sql } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getDb } from "../../server/db.js";
import {
  applyCors,
  ApiError,
  cleanEmail,
  fail,
  json,
  options,
  readJson,
  requireString,
  WM_EMAIL_RE,
} from "../../server/http.js";
import { rankingAllowedStudents, rankingPollSettings } from "../../server/schema.js";

type SubmitBody = {
  cohortYear?: string;
  studentName?: string;
  studentEmail?: string;
  ranking?: unknown;
  receiptCode?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });

  try {
    const body = await readJson<SubmitBody>(req);
    const cohortYear = requireString(body.cohortYear, "cohortYear");
    const studentName = requireString(body.studentName, "studentName");
    const studentEmail = cleanEmail(body.studentEmail);
    const receiptCode = requireString(body.receiptCode, "receiptCode");
    if (!WM_EMAIL_RE.test(studentEmail)) {
      throw new ApiError("Use your William & Mary email address.", 400, "invalid_email");
    }
    if (!Array.isArray(body.ranking) || body.ranking.length < 1) {
      throw new ApiError("Ranking must include at least one project.", 400, "invalid_ranking");
    }
    if (!body.ranking.every((item) => typeof item === "string" && item.trim())) {
      throw new ApiError("Ranking contains an invalid project.", 400, "invalid_ranking");
    }

    const db = getDb();
    const [settings] = await db
      .select()
      .from(rankingPollSettings)
      .where(eq(rankingPollSettings.cohortYear, cohortYear))
      .limit(1);
    const pollOpen =
      !settings || (settings.isOpen && (!settings.closesAt || settings.closesAt > new Date()));
    if (!pollOpen) {
      throw new ApiError(
        settings?.closedMessage || "The ranking poll is not open for this cohort.",
        403,
        "poll_closed"
      );
    }

    const [allowed] = await db
      .select({ id: rankingAllowedStudents.id })
      .from(rankingAllowedStudents)
      .where(
        sql`${rankingAllowedStudents.cohortYear} = ${cohortYear} and ${rankingAllowedStudents.studentEmailNormalized} = ${studentEmail}`
      )
      .limit(1);
    if (!allowed) {
      throw new ApiError(
        "This email is not on the allowed student list for this cohort.",
        403,
        "not_allowed"
      );
    }

    const result = await db.execute(sql`
      insert into public.ranking_submissions
        (cohort_year, student_name, student_email, notes, ranking, receipt_code, updated_at)
      values
        (${cohortYear}, ${studentName}, ${studentEmail}, null, ${JSON.stringify(body.ranking)}::jsonb, ${receiptCode}, now())
      on conflict (cohort_year, lower(student_email))
      do update set
        student_name = excluded.student_name,
        student_email = excluded.student_email,
        notes = null,
        ranking = excluded.ranking,
        receipt_code = excluded.receipt_code,
        updated_at = now()
      returning case when xmax = 0 then 'created' else 'updated' end as submission_mode
    `);
    const mode = String(
      (result.rows[0] as { submission_mode?: string })?.submission_mode || "created"
    );
    return json(res, 200, { mode: mode === "updated" ? "updated" : "created" });
  } catch (error) {
    return fail(res, error, "Ranking submission failed.");
  }
}
