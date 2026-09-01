import { eq } from "drizzle-orm";

import { getDb } from "./db";
import { ApiError, requireString } from "./http";
import { announcementRow } from "./rows";
import { cohortAnnouncements } from "./schema";

export type AnnouncementInput = {
  id?: string;
  cohort_year?: string;
  slug?: string;
  title?: string;
  summary?: string;
  body?: unknown;
  resources?: unknown;
  audience_label?: string | null;
  label?: string | null;
  pinned?: boolean;
  display_order?: number | null;
  event_date?: string | null;
  publish_at?: string | null;
  status?: string;
};

const listValue = (value: unknown) => (Array.isArray(value) ? value : []);

export const announcementValues = (input: AnnouncementInput, createdByEmail: string) => {
  const cohortYear = requireString(input.cohort_year, "cohort_year");
  const title = requireString(input.title, "title");
  const summary = requireString(input.summary, "summary");
  const slug =
    typeof input.slug === "string" && input.slug.trim()
      ? input.slug.trim()
      : title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `update-${Date.now()}`;
  const status = input.status || "published";
  if (!["draft", "published", "archived"].includes(status)) {
    throw new ApiError("status must be draft, published, or archived.");
  }

  return {
    cohortYear,
    slug,
    title,
    summary,
    body: listValue(input.body) as string[],
    resources: listValue(input.resources),
    audienceLabel: input.audience_label || null,
    label: input.label || null,
    pinned: Boolean(input.pinned),
    displayOrder: Number.isFinite(input.display_order) ? Number(input.display_order) : null,
    eventDate: input.event_date || null,
    publishAt: input.publish_at ? new Date(input.publish_at) : new Date(),
    status,
    createdByEmail,
    updatedAt: new Date(),
  };
};

export const upsertAnnouncement = async (input: AnnouncementInput, createdByEmail: string) => {
  const db = getDb();
  const values = announcementValues(input, createdByEmail);
  const [row] = await db
    .insert(cohortAnnouncements)
    .values(values)
    .onConflictDoUpdate({
      target: [cohortAnnouncements.cohortYear, cohortAnnouncements.slug],
      set: values,
    })
    .returning();
  return announcementRow(row);
};

export const updateAnnouncement = async (
  id: string,
  input: AnnouncementInput,
  createdByEmail: string
) => {
  const db = getDb();
  const values = announcementValues(input, createdByEmail);
  const [row] = await db
    .update(cohortAnnouncements)
    .set(values)
    .where(eq(cohortAnnouncements.id, id))
    .returning();
  if (!row) throw new ApiError("Announcement was not found.", 404);
  return announcementRow(row);
};
