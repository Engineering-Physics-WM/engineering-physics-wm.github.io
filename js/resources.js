const SITE_PAGE_LABELS = {
  catalog: "Project catalog",
  news: "Course updates",
  ranking: "Ranking poll",
  dashboard: "Dashboard",
  archive: "Archive",
};

const SITE_PAGE_ALIASES = {
  home: "catalog",
  catalog: "catalog",
  projects: "catalog",
  "project catalog": "catalog",
  updates: "news",
  update: "news",
  news: "news",
  "cohort updates": "news",
  "course updates": "news",
  ranking: "ranking",
  rankings: "ranking",
  poll: "ranking",
  "ranking poll": "ranking",
  dashboard: "dashboard",
  archive: "archive",
};

const KNOWN_SITE_HOSTS = new Set(["ep.yangran.org", "engineering-physics-wm.github.io"]);

const cleanResourceText = (value) => (typeof value === "string" ? value.trim() : "");

const trimTargetPunctuation = (value) => cleanResourceText(value).replace(/[),.;:!?]+$/, "");

const pageAlias = (value) => {
  const normalized = cleanResourceText(value)
    .replace(/^#\/?/, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[-_]+/g, " ")
    .toLowerCase();
  return SITE_PAGE_ALIASES[normalized] || "";
};

const currentHost = () => {
  if (typeof globalThis === "undefined") return "";
  return globalThis.location?.hostname?.toLowerCase() || "";
};

const resourcePageFromTarget = (target = "") => {
  const raw = trimTargetPunctuation(target)
    .replace(/^(page|site):/i, "")
    .trim();
  if (!raw) return "";

  const direct = pageAlias(raw);
  if (direct) return direct;

  if (!/^(https?:)?\/\//i.test(raw) && /^[^/\s]+\.[^/\s]+/i.test(raw)) {
    return "";
  }

  let url;
  try {
    url = new URL(raw.startsWith("//") ? `https:${raw}` : raw, "https://ep.yangran.org");
  } catch {
    return "";
  }

  if (/^(https?:)?\/\//i.test(raw)) {
    const allowedHosts = new Set([...KNOWN_SITE_HOSTS, currentHost()].filter(Boolean));
    if (!allowedHosts.has(url.hostname.toLowerCase())) return "";
  }

  const candidates = [
    url.searchParams.get("page") || "",
    url.hash,
    url.pathname,
    url.pathname.split("/").filter(Boolean).at(-1) || "",
  ];

  for (const candidate of candidates) {
    const page = pageAlias(candidate);
    if (page) return page;
  }
  return "";
};

const resourcePage = (resource = {}) =>
  pageAlias(resource.page) || resourcePageFromTarget(resource.href || resource.url || "");

const resourceHref = (resource) => {
  if (resourcePage(resource)) return "";
  return cleanResourceText(resource?.url || resource?.href || "");
};

const resourceLabel = (resource = {}) => {
  const page = resourcePage(resource);
  const href = resourceHref(resource);
  return cleanResourceText(resource.label) || (page ? SITE_PAGE_LABELS[page] : href);
};

const resourceKind = (resource = {}) => {
  const page = resourcePage(resource);
  return cleanResourceText(resource.kind) || (page ? "Site" : "Link");
};

const normalizeAnnouncementResources = (resources = []) => {
  const seen = new Set();
  return (Array.isArray(resources) ? resources : [])
    .map((resource) => {
      if (!resource || typeof resource !== "object") return null;
      const page = resourcePage(resource);
      const href = resourceHref(resource);
      const label = resourceLabel(resource);
      const kind = resourceKind(resource);
      if (page) return { label: label || SITE_PAGE_LABELS[page], kind: "Site", page };
      if (!href && !label) return null;
      return { label, kind, href };
    })
    .filter(Boolean)
    .filter((resource) => {
      const key = resource.page ? `page:${resource.page}` : `href:${resource.href.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export {
  SITE_PAGE_LABELS,
  normalizeAnnouncementResources,
  resourceHref,
  resourceKind,
  resourceLabel,
  resourcePage,
  resourcePageFromTarget,
};
