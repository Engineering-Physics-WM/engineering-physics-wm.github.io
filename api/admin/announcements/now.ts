import { and, eq, ne } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireInstructor } from "../../../server/auth";
import { upsertAnnouncement, type AnnouncementInput } from "../../../server/announcements";
import { getDb } from "../../../server/db";
import { applyCors, fail, json, options, readJson } from "../../../server/http";
import { cohortAnnouncements } from "../../../server/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });

  try {
    const instructor = await requireInstructor(req);
    const body = await readJson<AnnouncementInput>(req);
    const announcement = await upsertAnnouncement(body, instructor.email);
    const db = getDb();
    await db
      .update(cohortAnnouncements)
      .set({ pinned: false, label: null, updatedAt: new Date() })
      .where(
        and(
          eq(cohortAnnouncements.cohortYear, String(body.cohort_year || "")),
          eq(cohortAnnouncements.pinned, true),
          eq(cohortAnnouncements.label, "Now"),
          ne(cohortAnnouncements.id, announcement.id)
        )
      );
    return json(res, 200, { announcement });
  } catch (error) {
    return fail(res, error, "Now update could not post.");
  }
}
