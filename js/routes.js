/* Hash-based routing helpers — exported so tests can cover them */

export const PAGE_TO_HASH = {
  catalog: "/",
  news: "/updates",
  syllabus: "/syllabus",
  pitchPerfectAssignment: "/syllabus/pitch-perfect-i/assignment",
  ranking: "/ranking",
  dashboard: "/dashboard",
  archive: "/archive",
};

const HASH_TO_PAGE = Object.fromEntries(Object.entries(PAGE_TO_HASH).map(([page, h]) => [h, page]));

/** Map a page name to its hash fragment, optionally including the cohort year.
 *  Year is omitted when it matches currentYear (keeps default-view URLs clean). */
export const hashForPage = (page, year, currentYear) => {
  const path = PAGE_TO_HASH[page] ?? "/";
  const yearParam =
    year && currentYear && year !== currentYear ? `?year=${encodeURIComponent(year)}` : "";
  return `#${path}${yearParam}`;
};

/** Extract the page name from a hash fragment, ignoring any ?query suffix. */
export const parseHashToPage = (hash) => {
  const path = (hash || "").replace(/^#/, "").split("?")[0] || "/";
  return HASH_TO_PAGE[path] ?? "catalog";
};

/** Extract the cohort year from a hash fragment's ?year= param.
 *  Only accepts YYYY-YYYY format; falls back to defaultYear for anything else. */
export const parseHashToYear = (hash, defaultYear) => {
  const querySuffix = (hash || "").split("?")[1] ?? "";
  if (!querySuffix) return defaultYear;
  try {
    const y = new URLSearchParams(querySuffix).get("year");
    return y && /^\d{4}-\d{4}$/.test(y) ? y : defaultYear;
  } catch {
    return defaultYear;
  }
};
