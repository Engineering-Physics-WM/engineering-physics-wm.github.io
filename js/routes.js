/* Hash-based routing helpers — exported so tests can cover them */

export const PAGE_TO_HASH = {
  catalog: "/",
  news: "/updates",
  ranking: "/ranking",
  dashboard: "/dashboard",
  archive: "/archive",
};

const HASH_TO_PAGE = Object.fromEntries(Object.entries(PAGE_TO_HASH).map(([page, h]) => [h, page]));

export const hashForPage = (page) => `#${PAGE_TO_HASH[page] ?? "/"}`;

export const parseHashToPage = (hash) => {
  const path = (hash || "").replace(/^#/, "") || "/";
  return HASH_TO_PAGE[path] ?? "catalog";
};
