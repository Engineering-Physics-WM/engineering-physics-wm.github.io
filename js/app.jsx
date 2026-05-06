/* Main app shell — header, year switcher, page routing */

import * as React from "react";
import { createRoot } from "react-dom/client";
import { EP_DATA } from "./data.js";
import { Monogram } from "./monogram.jsx";
import { SparkLayer } from "./motion.jsx";
import { CatalogPage } from "./catalog.jsx";
import { RankingPage } from "./ranking.jsx";
import { ArchivePage, DashboardPage } from "./dashboard.jsx";
import { AuthGate } from "./auth.jsx";
import { YangLink } from "./links.jsx";
import { NewsPage } from "./news.jsx";
import { TweakPanelInline } from "./tweaks.jsx";

const Header = ({ page, onNavigate, year, setYear, years }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [compactHeader, setCompactHeader] = React.useState(false);

  React.useEffect(() => {
    if (!globalThis.matchMedia) return undefined;
    const media = globalThis.matchMedia("(max-width: 860px)");
    const syncHeaderMode = () => setCompactHeader(media.matches);
    syncHeaderMode();
    media.addEventListener("change", syncHeaderMode);
    return () => media.removeEventListener("change", syncHeaderMode);
  }, []);

  React.useEffect(() => {
    if (!compactHeader) setMobileOpen(false);
  }, [compactHeader]);

  const handleBrandClick = () => {
    if (compactHeader) {
      setMobileOpen(open => !open);
      return;
    }
    onNavigate("catalog");
  };

  return (
    <header className={"site-header" + (mobileOpen ? " is-open" : "")}>
      <button
        className="brand"
        onClick={handleBrandClick}
        aria-label={compactHeader ? (mobileOpen ? "Close site menu" : "Open site menu") : "Engineering Physics home"}
        aria-expanded={compactHeader ? mobileOpen : undefined}
        aria-controls={compactHeader ? "site-menu" : undefined}
      >
        <Monogram size={36} />
        <div className="brand-stack">
          <span className="brand-mono">Engineering Physics<em>Capstone</em></span>
          <span className="brand-links">
            <a href="https://www.wm.edu/as/physics/undergrad/major/typical-course-of-study-epad/" target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>Engineering Physics</a>
            <span className="brand-sep">·</span>
            <a href="https://www.wm.edu/as/physics/" target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>Physics</a>
            <span className="brand-sep">·</span>
            <a href="https://cdsp.wm.edu/about/" target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>CDSP</a>
            <span className="brand-sep">·</span>
            <a href="https://www.wm.edu/" target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>William &amp; Mary</a>
          </span>
        </div>
      </button>

      <div id="site-menu" className="header-menu">
        <div className="year-switcher" role="tablist" aria-label="Year">
          {years.map(y => (
            <button
              key={y.id}
              className="year-pill"
              aria-current={y.id === year}
              disabled={y.status === "future" || (y.status !== "current" && y.id !== year)}
              onClick={() => { setYear(y.id); setMobileOpen(false); }}
              title={y.status === "future" ? "Reserved" : y.id === "2026-2027" ? "Current cohort" : "Archive"}
            >
              {y.status === "future" && <span className="future-dot" />}
              {y.label}
            </button>
          ))}
        </div>

        <nav className="site-nav" aria-label="Sections">
          <button aria-current={page === "catalog"} onClick={() => { onNavigate("catalog"); setMobileOpen(false); }}>Projects</button>
          <button aria-current={page === "news"} onClick={() => { onNavigate("news"); setMobileOpen(false); }}>Updates</button>
          <button aria-current={page === "dashboard"} onClick={() => { onNavigate("dashboard"); setMobileOpen(false); }}>Dashboard</button>
          <button aria-current={page === "archive"} onClick={() => { onNavigate("archive"); setMobileOpen(false); }}>Archive</button>
          <button className="nav-cta" onClick={() => { onNavigate("ranking"); setMobileOpen(false); }} data-spark>
            Rank projects
          </button>
        </nav>
      </div>
    </header>
  );
};

const Footer = ({ onNavigate }) => (
  <footer className="site-footer">
    <div className="footer-top">
      <div className="footer-brand">
        <Monogram size={44} />
        <div>
          <p className="kicker" style={{ marginBottom: 6 }}><span className="dot">●</span> &nbsp; William &amp; Mary</p>
          <p className="footer-display">Engineering Physics, <span className="ital">in practice.</span></p>
          <p className="footer-tag">A capstone home for students, families, campus partners, and supporters following the work of EP students at William &amp; Mary.</p>
        </div>
      </div>

      <div className="footer-cols">
        <div className="footer-col">
          <h4>Cohort</h4>
          <ul>
            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate("catalog"); }}>Project catalog</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate("news"); }}>Cohort updates</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate("ranking"); }}>Ranking poll</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate("dashboard"); }}>Instructor dashboard</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate("archive"); }}>Archive</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Faculty</h4>
          <ul>
            <li><a href="https://yangran.org" target="_blank" rel="noopener">Ran Yang ↗</a></li>
            <li><a href="https://www.wm.edu/as/physics/" target="_blank" rel="noopener">Physics dept ↗</a></li>
            <li><a href="https://cdsp.wm.edu/about/" target="_blank" rel="noopener">CDSP ↗</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Connect</h4>
          <ul>
            <li><a href="https://www.instagram.com/physics_wm/" target="_blank" rel="noopener">@physics_wm ↗</a></li>
            <li><a href="https://www.wm.edu/" target="_blank" rel="noopener">wm.edu ↗</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({top:0, behavior:"smooth"}); }}>Back to top</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div className="footer-meta">
      <span className="mono">EP™ · Engineering Physics Capstone</span>
      <span className="mono">2026 — 2027</span>
      <YangLink className="mono">© Ran Yang</YangLink>
    </div>
  </footer>
);

const App = () => {
  const data = EP_DATA;
  const [page, setPage] = React.useState("catalog");
  const [year, setYear] = React.useState(data.currentYear);
  const [sparks, setSparks] = React.useState(1);

  React.useEffect(() => {
    const h = (e) => setSparks(e.detail);
    window.addEventListener("ep:sparks", h);
    return () => window.removeEventListener("ep:sparks", h);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, year]);

  const onNavigate = (p) => setPage(p);

  return (
    <div className="app">
      <span className="paper-bg" />
      <span className="grain" />
      <SparkLayer intensity={sparks} />
      <Header page={page} onNavigate={onNavigate} year={year} setYear={setYear} years={data.years} />
      <main key={page + year}>
        {page === "catalog" && <CatalogPage data={data} onNavigate={onNavigate} />}
        {page === "news" && <NewsPage data={data} currentYear={year} onNavigate={onNavigate} />}
        {page === "ranking" && <RankingPage data={data} onNavigate={onNavigate} />}
        {page === "dashboard" && (
          <AuthGate>
            <DashboardPage data={data} onNavigate={onNavigate} />
          </AuthGate>
        )}
        {page === "archive" && <ArchivePage data={data} onNavigate={onNavigate} currentYear={year} setYear={setYear} />}
      </main>
      <Footer onNavigate={onNavigate} />
      <TweakPanelInline />
    </div>
  );
};

createRoot(document.getElementById("root")).render(<App />);
