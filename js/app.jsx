/* eslint-disable react-refresh/only-export-components */
/* Main app shell — header, year switcher, page routing */

import * as React from "react";
import { createRoot } from "react-dom/client";
import { EP_DATA, formatAcademicYear, getSeedAnnouncements, resolveCohortData } from "./data.js";
import { Monogram } from "./monogram.jsx";
import { SparkLayer } from "./motion.jsx";
import { CatalogPage } from "./catalog.jsx";
import { AuthGate } from "./auth.jsx";
import { YangLink } from "./links.jsx";
import { NewsPage, currentCourseAnnouncement } from "./news.jsx";
import { SyllabusPage } from "./syllabus";
import { TweakPanelInline } from "./tweaks.jsx";
import { loadPublishedAnnouncements } from "./announcements.js";
import { hashForPage, parseHashToPage, parseHashToYear } from "./routes.js";

// Heavy pages are loaded on demand so they don't bloat the initial bundle.
const RankingPage = React.lazy(() =>
  import("./ranking.jsx").then((m) => ({ default: m.RankingPage }))
);
const DashboardPage = React.lazy(() =>
  import("./dashboard.jsx").then((m) => ({ default: m.DashboardPage }))
);
const ArchivePage = React.lazy(() =>
  import("./dashboard.jsx").then((m) => ({ default: m.ArchivePage }))
);

// ── Lazy-load fallback ────────────────────────────────────────────────────────

const PageFallback = () => (
  <div
    style={{
      minHeight: "50vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <p
      style={{
        color: "var(--muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "0.8rem",
        letterSpacing: "0.08em",
      }}
    >
      Loading…
    </p>
  </div>
);

// ── Header ────────────────────────────────────────────────────────────────────

const Header = ({ page, onNavigate, year, setYear, years, currentYear }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [compactHeader, setCompactHeader] = React.useState(false);
  const selectedYearLabel = formatAcademicYear(year, "-");

  React.useEffect(() => {
    if (!globalThis.matchMedia) return undefined;
    const media = globalThis.matchMedia("(max-width: 1100px)");
    const syncHeaderMode = () => setCompactHeader(media.matches);
    syncHeaderMode();
    media.addEventListener("change", syncHeaderMode);
    return () => media.removeEventListener("change", syncHeaderMode);
  }, []);

  React.useEffect(() => {
    if (!compactHeader) setMobileOpen(false);
  }, [compactHeader]);

  const closeMobileMenu = () => setMobileOpen(false);

  const brandEl = compactHeader ? (
    <button
      className="brand"
      onClick={() => setMobileOpen((open) => !open)}
      aria-label={mobileOpen ? "Close site menu" : "Open site menu"}
      aria-expanded={mobileOpen}
      aria-controls="site-menu"
    >
      <Monogram size={36} />
    </button>
  ) : (
    <div className="brand-wrap">
      <a
        className="brand"
        href={hashForPage("catalog", year, currentYear)}
        onClick={(e) => {
          e.preventDefault();
          onNavigate("catalog");
        }}
        aria-label="Engineering Physics Capstone — home"
      >
        <Monogram size={36} />
        <span className="brand-mono">
          Engineering Physics<em>Capstone HQ</em>
        </span>
      </a>
      <span className="brand-links">
        <span>
          {selectedYearLabel} {year === currentYear ? "course home" : "cohort"}
        </span>
        <span className="brand-sep">·</span>
        <a href="https://www.wm.edu/as/physics/" target="_blank" rel="noopener">
          Physics
        </a>
        <span className="brand-sep">·</span>
        <a href="https://cdsp.wm.edu/about/" target="_blank" rel="noopener">
          CDSP
        </a>
        <span className="brand-sep">·</span>
        <a href="https://www.wm.edu/" target="_blank" rel="noopener">
          William &amp; Mary
        </a>
      </span>
    </div>
  );

  return (
    <header className={"site-header" + (mobileOpen ? " is-open" : "")}>
      {brandEl}

      <div id="site-menu" className="header-menu">
        <div className="year-switcher" role="tablist" aria-label="Year">
          {years.map((y) => (
            <button
              key={y.id}
              className="year-pill"
              aria-current={y.id === year}
              disabled={false}
              onClick={() => {
                setYear(y.id);
                closeMobileMenu();
              }}
              title={
                y.status === "future"
                  ? "Reserved cohort"
                  : y.id === currentYear
                    ? "Current cohort"
                    : "Archive"
              }
            >
              {y.status === "future" && <span className="future-dot" />}
              {y.label}
            </button>
          ))}
        </div>

        <nav className="site-nav" aria-label="Sections">
          <button
            aria-current={page === "catalog"}
            onClick={() => {
              onNavigate("catalog");
              closeMobileMenu();
            }}
          >
            Home
          </button>
          <button
            aria-current={page === "news"}
            onClick={() => {
              onNavigate("news");
              closeMobileMenu();
            }}
          >
            Updates
          </button>
          <button
            aria-current={page === "syllabus"}
            onClick={() => {
              onNavigate("syllabus");
              closeMobileMenu();
            }}
          >
            Syllabus
          </button>
          <button
            aria-current={page === "dashboard"}
            onClick={() => {
              onNavigate("dashboard");
              closeMobileMenu();
            }}
          >
            Dashboard
          </button>
          <button
            aria-current={page === "archive"}
            onClick={() => {
              onNavigate("archive");
              closeMobileMenu();
            }}
          >
            Archive
          </button>
        </nav>
      </div>
    </header>
  );
};

// ── Footer ────────────────────────────────────────────────────────────────────

const Footer = ({ onNavigate, yearLabel }) => (
  <footer className="site-footer">
    <div className="footer-top">
      <div className="footer-brand">
        <Monogram size={44} />
        <div>
          <p className="kicker" style={{ marginBottom: 6 }}>
            <span className="dot">●</span> &nbsp; William &amp; Mary
          </p>
          <p className="footer-display">
            Engineering Physics, <span className="ital">in practice.</span>
          </p>
          <p className="footer-tag">
            A capstone home for students, families, campus partners, and supporters following the
            work of EP students at William &amp; Mary.
          </p>
        </div>
      </div>

      <div className="footer-cols">
        <div className="footer-col">
          <h4>Cohort</h4>
          <ul>
            <li>
              <a
                href={hashForPage("catalog")}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("catalog");
                }}
              >
                Project catalog
              </a>
            </li>
            <li>
              <a
                href={hashForPage("news")}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("news");
                }}
              >
                Cohort updates
              </a>
            </li>
            <li>
              <a
                href={hashForPage("syllabus")}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("syllabus");
                }}
              >
                Syllabus &amp; schedule
              </a>
            </li>
            <li>
              <a
                href={hashForPage("ranking")}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("ranking");
                }}
              >
                Ranking poll
              </a>
            </li>
            <li>
              <a
                href={hashForPage("dashboard")}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("dashboard");
                }}
              >
                Instructor dashboard
              </a>
            </li>
            <li>
              <a
                href={hashForPage("archive")}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("archive");
                }}
              >
                Archive
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Faculty</h4>
          <ul>
            <li>
              <a href="https://yangran.org" target="_blank" rel="noopener">
                Ran Yang ↗
              </a>
            </li>
            <li>
              <a href="https://www.wm.edu/as/physics/" target="_blank" rel="noopener">
                Physics dept ↗
              </a>
            </li>
            <li>
              <a href="https://cdsp.wm.edu/about/" target="_blank" rel="noopener">
                CDSP ↗
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Connect</h4>
          <ul>
            <li>
              <a href="https://www.instagram.com/physics_wm/" target="_blank" rel="noopener">
                @physics_wm ↗
              </a>
            </li>
            <li>
              <a href="https://www.wm.edu/" target="_blank" rel="noopener">
                wm.edu ↗
              </a>
            </li>
            <li>
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Back to top
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div className="footer-meta">
      <span className="mono">Engineering Physics Capstone</span>
      <span className="mono">{yearLabel}</span>
      <YangLink className="mono">© Ran Yang</YangLink>
    </div>
  </footer>
);

// ── Announcement merge helpers ────────────────────────────────────────────────

const isNowAnnouncement = (item) =>
  Boolean(item?.pinned) || (item?.label || "").trim().toLowerCase() === "now";

const announcementKey = (item) => item.slug || item.id;

const announcementTime = (item) => {
  const time = Date.parse(`${item?.date || ""}T12:00:00`);
  return Number.isFinite(time) ? time : 0;
};

const demoteNowAnnouncement = (item) => ({
  ...item,
  pinned: false,
  label: (item.label || "").trim().toLowerCase() === "now" ? "" : item.label,
});

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
  const [liveAnnouncements, setLiveAnnouncements] = React.useState(null);
  const [announcementRefreshKey, setAnnouncementRefreshKey] = React.useState(0);
  const [page, setPage] = React.useState(() => parseHashToPage(window.location.hash));
  const [year, setYear] = React.useState(() =>
    parseHashToYear(window.location.hash, EP_DATA.currentYear)
  );
  const [sparks, setSparks] = React.useState(1);
  const [newsAnchor, setNewsAnchor] = React.useState(null);

  // Sync browser back/forward to page + year state.
  React.useEffect(() => {
    const onPopState = () => {
      setPage(parseHashToPage(window.location.hash));
      setYear(parseHashToYear(window.location.hash, EP_DATA.currentYear));
      setNewsAnchor(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Keep the URL hash in sync whenever page or year changes.
  // Page navigations use pushState (onNavigate); year-only changes use replaceState.
  React.useEffect(() => {
    const nextHash = hashForPage(page, year, EP_DATA.currentYear);
    if (window.location.hash !== nextHash) {
      history.replaceState(null, "", nextHash);
    }
  }, [year, page]);

  // Navigate to a new page: adds a history entry so back/forward work.
  const onNavigate = React.useCallback(
    (p, anchor = null) => {
      setPage(p);
      setNewsAnchor(anchor);
      const nextHash = hashForPage(p, year, EP_DATA.currentYear);
      if (window.location.hash !== nextHash) {
        history.pushState(null, "", nextHash);
      }
    },
    [year]
  );

  React.useEffect(() => {
    let active = true;
    loadPublishedAnnouncements().then(({ announcements }) => {
      if (active && announcements?.length) setLiveAnnouncements(announcements);
    });
    return () => {
      active = false;
    };
  }, [announcementRefreshKey]);

  const allData = React.useMemo(() => {
    const seedAnnouncements = getSeedAnnouncements(EP_DATA);
    if (!liveAnnouncements?.length) {
      return {
        ...EP_DATA,
        staticAnnouncements: seedAnnouncements,
        announcements: seedAnnouncements,
      };
    }

    const seededBySlug = new Map(seedAnnouncements.map((item) => [announcementKey(item), item]));
    const liveSlugs = new Set();
    const liveNowByCohort = new Map();
    liveAnnouncements.filter(isNowAnnouncement).forEach((item) => {
      const current = liveNowByCohort.get(item.cohortYear);
      if (!current || announcementTime(item) >= announcementTime(current)) {
        liveNowByCohort.set(item.cohortYear, item);
      }
    });
    const liveNowCohorts = new Set(liveNowByCohort.keys());
    const mergedLive = liveAnnouncements.map((item) => {
      const slug = announcementKey(item);
      liveSlugs.add(slug);
      const seeded = seededBySlug.get(slug);
      const activeNow = liveNowByCohort.get(item.cohortYear);
      const normalizedItem =
        activeNow && isNowAnnouncement(item) && announcementKey(activeNow) !== slug
          ? demoteNowAnnouncement(item)
          : item;
      return seeded ? { ...seeded, ...normalizedItem, live: true } : normalizedItem;
    });
    const seededOnly = seedAnnouncements
      .filter((item) => !liveSlugs.has(announcementKey(item)))
      .map((item) =>
        liveNowCohorts.has(item.cohortYear) && isNowAnnouncement(item)
          ? demoteNowAnnouncement(item)
          : item
      );

    return {
      ...EP_DATA,
      staticAnnouncements: seedAnnouncements,
      announcements: [...mergedLive, ...seededOnly],
    };
  }, [liveAnnouncements]);

  const data = React.useMemo(() => resolveCohortData(allData, year), [allData, year]);

  const latestAnnouncement = React.useMemo(
    () =>
      currentCourseAnnouncement(
        (data.announcements || []).filter((item) => item.cohortYear === data.currentYear)
      ),
    [data.announcements, data.currentYear]
  );

  React.useEffect(() => {
    const h = (e) => setSparks(e.detail);
    window.addEventListener("ep:sparks", h);
    return () => window.removeEventListener("ep:sparks", h);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, year]);

  const refreshAnnouncements = React.useCallback(() => {
    setAnnouncementRefreshKey((key) => key + 1);
  }, []);

  // latestAnnouncement is computed for potential future header use; suppress lint.
  void latestAnnouncement;

  return (
    <div className="app">
      <span className="paper-bg" />
      <span className="grain" />
      <SparkLayer intensity={sparks} />
      <Header
        page={page}
        onNavigate={onNavigate}
        year={year}
        setYear={setYear}
        years={allData.years}
        currentYear={allData.currentYear}
      />
      <main key={page + year}>
        <React.Suspense fallback={<PageFallback />}>
          {page === "catalog" && <CatalogPage data={data} onNavigate={onNavigate} />}
          {page === "news" && (
            <NewsPage data={data} currentYear={year} onNavigate={onNavigate} anchor={newsAnchor} />
          )}
          {page === "syllabus" && <SyllabusPage onNavigate={onNavigate} />}
          {page === "ranking" && <RankingPage data={data} onNavigate={onNavigate} />}
          {page === "dashboard" && (
            <AuthGate>
              <DashboardPage
                data={data}
                seedAnnouncements={data.seedAnnouncements}
                onNavigate={onNavigate}
                onAnnouncementsChange={refreshAnnouncements}
              />
            </AuthGate>
          )}
          {page === "archive" && (
            <ArchivePage data={data} onNavigate={onNavigate} currentYear={year} setYear={setYear} />
          )}
        </React.Suspense>
      </main>
      <Footer onNavigate={onNavigate} yearLabel={data.yearLabel} />
      <TweakPanelInline />
    </div>
  );
};

createRoot(document.getElementById("root")).render(<App />);
