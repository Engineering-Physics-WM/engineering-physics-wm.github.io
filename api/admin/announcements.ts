import { asc, eq } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireInstructor } from "../../server/auth.js";
import {
  upsertAnnouncement,
  updateAnnouncement,
  type AnnouncementInput,
} from "../../server/announcements.js";
import { getDb } from "../../server/db.js";
import { applyCors, ApiError, fail, json, options, queryString, readJson } from "../../server/http.js";
import { announcementRow } from "../../server/rows.js";
import { cohortAnnouncements } from "../../server/schema.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);

  try {
    const instructor = await requireInstructor(req);
    if (req.method === "GET") {
      const cohortYear = queryString(req.query.cohortYear);
      if (!cohortYear) return json(res, 400, { error: "cohortYear is required." });
      const rows = await getDb()
        .select()
        .from(cohortAnnouncements)
        .where(eq(cohortAnnouncements.cohortYear, cohortYear))
        .orderBy(asc(cohortAnnouncements.displayOrder), asc(cohortAnnouncements.createdAt));
      return json(res, 200, { announcements: rows.map(announcementRow) });
    }

    if (req.method === "POST") {
      const body = await readJson<AnnouncementInput>(req);
      return json(res, 200, {
        announcement: await upsertAnnouncement(body, instructor.email),
      });
    }

    if (req.method === "PATCH") {
      const body = await readJson<AnnouncementInput & { id?: string }>(req);
      if (!body.id) throw new ApiError("Announcement id is required.");
      return json(res, 200, {
        announcement: await updateAnnouncement(body.id, body, instructor.email),
      });
    }

    if (req.method === "DELETE") {
      const id = queryString(req.query.id);
      if (!id) throw new ApiError("Announcement id is required.");
      const [row] = await getDb()
        .delete(cohortAnnouncements)
        .where(eq(cohortAnnouncements.id, id))
        .returning({ id: cohortAnnouncements.id });
      if (!row) throw new ApiError("Announcement was not found.", 404);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "GET, POST, PATCH, or DELETE required." });
  } catch (error) {
    return fail(res, error, "Announcement request failed.");
  }
}
