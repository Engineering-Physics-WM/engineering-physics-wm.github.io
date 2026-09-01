import { and, eq } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getDb } from "../../server/db";
import {
  applyCors,
  cleanEmail,
  fail,
  json,
  options,
  readJson,
  requireString,
  WM_EMAIL_RE,
} from "../../server/http";
import { rankingAllowedStudents, rankingPollSettings } from "../../server/schema";

type CheckBody = { cohortYear?: string; email?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });

  try {
    const body = await readJson<CheckBody>(req);
    const cohortYear = requireString(body.cohortYear, "cohortYear");
    const email = cleanEmail(body.email);
    if (!WM_EMAIL_RE.test(email)) return json(res, 200, { allowed: false, pollOpen: true });

    const db = getDb();
    const [settings] = await db
      .select()
      .from(rankingPollSettings)
      .where(eq(rankingPollSettings.cohortYear, cohortYear))
      .limit(1);
    const pollOpen =
      !settings || (settings.isOpen && (!settings.closesAt || settings.closesAt > new Date()));
    const [allowed] = await db
      .select({ id: rankingAllowedStudents.id })
      .from(rankingAllowedStudents)
      .where(
        and(
          eq(rankingAllowedStudents.cohortYear, cohortYear),
          eq(rankingAllowedStudents.studentEmailNormalized, email)
        )
      )
      .limit(1);
    return json(res, 200, {
      allowed: Boolean(allowed),
      pollOpen,
      closedMessage: settings?.closedMessage || "The ranking poll is not open for this cohort.",
    });
  } catch (error) {
    return fail(res, error, "Could not check the ranking list.");
  }
}
