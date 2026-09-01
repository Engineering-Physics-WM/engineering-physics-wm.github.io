import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getDb } from "../../server/db";
import { applyCors, fail, json, options } from "../../server/http";
import { announcementRow } from "../../server/rows";
import { cohortAnnouncements } from "../../server/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "GET") return json(res, 405, { error: "GET required." });

  try {
    const rows = await getDb()
      .select()
      .from(cohortAnnouncements)
      .where(
        and(
          eq(cohortAnnouncements.status, "published"),
          lte(cohortAnnouncements.publishAt, new Date())
        )
      )
      .orderBy(
        sql`${cohortAnnouncements.displayOrder} asc nulls last`,
        asc(cohortAnnouncements.publishAt)
      );
    return json(res, 200, { announcements: rows.map(announcementRow) });
  } catch (error) {
    return fail(res, error, "Announcements could not load.");
  }
}
