import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const ANNOUNCEMENT_COLUMNS = [
  "id",
  "cohort_year",
  "slug",
  "title",
  "summary",
  "body",
  "resources",
  "audience_label",
  "label",
  "pinned",
  "display_order",
  "event_date",
  "publish_at",
  "status",
  "created_at",
  "updated_at",
].join(",");

const DASHBOARD_NOW_SLUG = "dashboard-now";

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeList = (value) => (Array.isArray(value)
  ? value.map((item) => (typeof item === "string" ? item.trim() : item)).filter(Boolean)
  : []);

const stripSubjectPrefix = (subject, cohortYear) => cleanText(subject)
  .replace(new RegExp(`^\\[EP\\s+${cohortYear.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\]\\s*`, "i"), "")
  .replace(/^\[EP[^\]]*\]\s*/i, "")
  .trim();

const splitBodyParagraphs = (body) => cleanText(body)
  .replace(/\r\n/g, "\n")
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);

const looksLikeGreeting = (paragraph) => (
  /^(hello|hi|dear)\b[^.!?]*[,!]?\s*$/i.test(paragraph)
);

const looksLikeSignature = (paragraph) => (
  /^(best|thanks|thank you|sincerely|warmly|cheers),?\s*(\n\s*ran)?\s*$/i.test(paragraph) ||
  /^ran\s*$/i.test(paragraph)
);

const removeEmailShell = (paragraphs) => {
  const cleaned = [...paragraphs];
  if (cleaned.length && looksLikeGreeting(cleaned[0])) cleaned.shift();
  while (cleaned.length && looksLikeSignature(cleaned[cleaned.length - 1])) cleaned.pop();
  return cleaned;
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const makeNowSlug = (cohortYear) => `${cohortYear}-${DASHBOARD_NOW_SLUG}`;

const announcementFromRow = (row) => ({
  id: row.id || row.slug,
  cohortYear: row.cohort_year,
  slug: row.slug,
  order: Number.isFinite(row.display_order) ? row.display_order : undefined,
  date: (row.event_date || row.publish_at || row.created_at || "").slice(0, 10),
  label: row.label || "",
  title: row.title,
  summary: row.summary,
  body: normalizeList(row.body),
  resources: normalizeList(row.resources),
  audience: row.audience_label || "",
  pinned: Boolean(row.pinned),
  live: true,
});

const draftToAnnouncement = ({ cohortYear, subject, body, audienceLabel }) => {
  const paragraphs = removeEmailShell(splitBodyParagraphs(body));
  const title = stripSubjectPrefix(subject, cohortYear) || "Cohort update.";
  const summary = paragraphs[0] || "New Engineering Physics Capstone update.";
  const rest = paragraphs.slice(1);

  return {
    id: makeNowSlug(cohortYear),
    cohortYear,
    slug: makeNowSlug(cohortYear),
    order: 0,
    date: todayIsoDate(),
    label: "Now",
    title,
    summary,
    body: rest,
    resources: [],
    audience: audienceLabel,
    pinned: true,
    live: true,
  };
};

const rowFromAnnouncement = (announcement, createdByEmail) => ({
  cohort_year: announcement.cohortYear,
  slug: announcement.slug || announcement.id,
  title: announcement.title,
  summary: announcement.summary,
  body: announcement.body || [],
  resources: announcement.resources || [],
  audience_label: announcement.audience || null,
  label: announcement.label || null,
  pinned: Boolean(announcement.pinned),
  display_order: Number.isFinite(announcement.order) ? announcement.order : null,
  event_date: announcement.date || null,
  publish_at: new Date().toISOString(),
  status: "published",
  created_by_email: createdByEmail || null,
});

const staticAnnouncementToRow = (item) => ({
  cohort_year: item.cohortYear,
  slug: item.slug || item.id,
  title: item.title,
  summary: item.summary,
  body: item.body || [],
  resources: item.resources || [],
  audience_label: item.audience || null,
  label: item.label || null,
  pinned: Boolean(item.pinned),
  display_order: Number.isFinite(item.order) ? item.order : null,
  event_date: item.date || null,
  publish_at: new Date().toISOString(),
  status: "published",
});

const loadPublishedAnnouncements = async () => {
  if (!isSupabaseConfigured) return { announcements: null, error: null };
  const { data, error } = await supabase
    .from("cohort_announcements")
    .select(ANNOUNCEMENT_COLUMNS)
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString());

  if (error) return { announcements: null, error };
  return { announcements: (data || []).map(announcementFromRow), error: null };
};

const postDraftAsNowAnnouncement = async ({ cohortYear, subject, body, audienceLabel, createdByEmail }) => {
  if (!isSupabaseConfigured) throw new Error("Live announcement posting is not configured.");
  const announcement = draftToAnnouncement({ cohortYear, subject, body, audienceLabel });
  const row = rowFromAnnouncement(announcement, createdByEmail);

  const { data, error } = await supabase
    .from("cohort_announcements")
    .upsert(row, { onConflict: "cohort_year,slug" })
    .select(ANNOUNCEMENT_COLUMNS)
    .single();

  if (error) throw error;

  const { error: nowClearError } = await supabase
    .from("cohort_announcements")
    .update({ pinned: false, label: null })
    .eq("cohort_year", cohortYear)
    .neq("slug", announcement.slug)
    .or("pinned.eq.true,label.eq.Now");
  if (nowClearError) throw nowClearError;

  return announcementFromRow(data);
};

export {
  announcementFromRow,
  draftToAnnouncement,
  loadPublishedAnnouncements,
  postDraftAsNowAnnouncement,
  staticAnnouncementToRow,
};
