import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import {
  SITE_PAGE_LABELS,
  normalizeAnnouncementResources,
  resourcePageFromTarget,
} from "./resources.js";

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

const normalizeList = (value) =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : item)).filter(Boolean)
    : [];

const stripSubjectPrefix = (subject, cohortYear) =>
  cleanText(subject)
    .replace(
      new RegExp(`^\\[EP\\s+${cohortYear.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\]\\s*`, "i"),
      ""
    )
    .replace(/^\[EP[^\]]*\]\s*/i, "")
    .trim();

const splitBodyParagraphs = (body) =>
  cleanText(body)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const looksLikeGreeting = (paragraph) => /^(hello|hi|dear)\b[^.!?]*[,!]?\s*$/i.test(paragraph);

const looksLikeSignature = (paragraph) =>
  /^(best|thanks|thank you|sincerely|warmly|cheers),?\s*(\n\s*ran)?\s*$/i.test(paragraph) ||
  /^ran\s*$/i.test(paragraph);

const removeEmailShell = (paragraphs) => {
  const cleaned = [...paragraphs];
  if (cleaned.length && looksLikeGreeting(cleaned[0])) cleaned.shift();
  while (cleaned.length && looksLikeSignature(cleaned[cleaned.length - 1])) cleaned.pop();
  return cleaned;
};

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
const SITE_PAGE_INSTRUCTION_RE =
  /open the EP site and choose\s+([a-z][a-z0-9_-]*(?:\s+[a-z][a-z0-9_-]*)?)/i;

const trimLinkTarget = (value) => cleanText(value).replace(/[),.;:!?]+$/, "");

const labelFromUrl = (href) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
};

const kindAndLabelFromPrefix = (prefix, fallbackLabel = "Link") => {
  const cleaned = cleanText(prefix)
    .replace(/^\s*[-•]\s*/, "")
    .replace(/\s*[-:]\s*$/, "")
    .trim();
  const typed = cleaned.match(/^([A-Za-z][A-Za-z ]{1,18}):\s*(.+)$/);
  if (typed) return { kind: typed[1].trim(), label: typed[2].trim() };
  return { kind: "Link", label: cleaned || fallbackLabel };
};

const resourceFromDraftLine = (line) => {
  const text = cleanText(line).replace(/^\s*[-•]\s*/, "");
  if (!text) return null;

  const urlMatch = text.match(URL_RE)?.[0] || "";
  const pageMatch = text.match(SITE_PAGE_INSTRUCTION_RE);
  const target = trimLinkTarget(urlMatch || pageMatch?.[1] || "");
  if (!target) return null;

  const prefixEnd = urlMatch ? text.indexOf(urlMatch) : pageMatch.index;
  const page = resourcePageFromTarget(target);
  const fallbackLabel = page ? SITE_PAGE_LABELS[page] : labelFromUrl(target);
  const { kind, label } = kindAndLabelFromPrefix(text.slice(0, prefixEnd), fallbackLabel);

  return page
    ? { label: label || fallbackLabel, kind: "Site", page }
    : { label: label || fallbackLabel, kind, href: target };
};

const resourcesFromDraftText = (text) =>
  cleanText(text).split(/\n+/).map(resourceFromDraftLine).filter(Boolean);

const splitDraftContentAndResources = (paragraphs) => {
  const content = [];
  const resources = [];

  paragraphs.forEach((paragraph) => {
    if (/^resources?:\s*/i.test(paragraph)) {
      resources.push(...resourcesFromDraftText(paragraph.replace(/^resources?:\s*/i, "")));
      return;
    }

    resources.push(
      ...[...paragraph.matchAll(URL_RE)]
        .map((match) => resourceFromDraftLine(match[0]))
        .filter(Boolean)
    );
    content.push(paragraph);
  });

  return { content, resources };
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
  resources: normalizeAnnouncementResources(normalizeList(row.resources)),
  audience: row.audience_label || "",
  pinned: Boolean(row.pinned),
  live: true,
});

const draftToAnnouncement = ({ cohortYear, subject, body, audienceLabel, resources = [] }) => {
  const paragraphs = removeEmailShell(splitBodyParagraphs(body));
  const draftParts = splitDraftContentAndResources(paragraphs);
  const title = stripSubjectPrefix(subject, cohortYear) || "Cohort update.";
  const summary = draftParts.content[0] || "New Engineering Physics Capstone update.";
  const rest = draftParts.content.slice(1);

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
    resources: normalizeAnnouncementResources([...resources, ...draftParts.resources]),
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
  resources: normalizeAnnouncementResources(announcement.resources || []),
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
  resources: normalizeAnnouncementResources(item.resources || []),
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

const postDraftAsNowAnnouncement = async ({
  cohortYear,
  subject,
  body,
  audienceLabel,
  resources,
  createdByEmail,
}) => {
  if (!isSupabaseConfigured) throw new Error("Live announcement posting is not configured.");
  const announcement = draftToAnnouncement({ cohortYear, subject, body, audienceLabel, resources });
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
    .or("pinned.eq.true,label.ilike.Now");
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
