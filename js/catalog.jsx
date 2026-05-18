/* Catalog (project browser) — hero, filters, grid, theme map, project dialog */

import * as React from "react";
import { HeroParticles, Reveal } from "./motion.jsx";
import { LinkedText, PersonLink, YangLink, isYangName } from "./links.jsx";
import { currentCourseAnnouncement, sortAnnouncements } from "./news.jsx";

const AREA_COLORS = {
  "Instrumentation / sensors": "oklch(72% 0.060 18)",
  "Robotics / autonomy / controls": "oklch(54% 0.055 220)",
  "Bioengineering / medical devices": "oklch(58% 0.080 30)",
  "Computational imaging / simulation": "oklch(48% 0.060 180)",
  "AI-driven measurement or analysis": "oklch(42% 0.060 270)",
  "Public-facing / installation / outreach": "oklch(60% 0.075 60)",
  "Quantum science and technology": "oklch(46% 0.080 290)",
  "Materials": "oklch(50% 0.050 100)",
  "Plasma / high-energy adjacent": "oklch(56% 0.075 340)",
};
const ALL_AREAS = Object.keys(AREA_COLORS);

const ProjectCard = ({ project, displayIdx, onOpen, status = "", statusLabel = "" }) => {
  const railColor = AREA_COLORS[project.areas[0]] || "var(--pink)";
  const cardClass = "project-card" + (status ? ` is-${status}` : "");
  const openFromKeyboard = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen(project);
  };

  return (
    <article
      className={cardClass}
      data-spark="card"
      data-status={status || undefined}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project)}
      onKeyDown={openFromKeyboard}
      style={{ "--rail-color": railColor }}
    >
      <span className="project-card-thrust-rail" />
      <div className="project-card-top">
        <span className="project-card-num mono">No. {String(displayIdx + 1).padStart(2, "0")}</span>
        <span className="project-card-areas">
          {project.areas.slice(0, 2).map((a, i) => (
            <span key={i}>{a.split(" / ")[0]}{i < Math.min(project.areas.length, 2) - 1 ? " · " : ""}</span>
          ))}
        </span>
      </div>
      <h3 className="project-card-title">{project.title}</h3>
      <p className="project-card-advisor">
        <PersonLink name={project.advisor} onClick={(event) => event.stopPropagation()}>{project.advisor}</PersonLink>{" "}
        <span className="aff">/ {project.affiliation}</span>
      </p>
      <p className="project-card-pitch">{project.pitch}</p>
      <div className="project-card-foot">
        <span className="read">Read brief</span>
        {statusLabel && <span className="project-status-badge">{statusLabel}</span>}
      </div>
    </article>
  );
};

const ProjectDialog = ({ project, displayIdx, onClose }) => {
  const dialogRef = React.useRef(null);
  React.useEffect(() => {
    if (project) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [project]);

  const handleClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  if (!project) return <dialog ref={dialogRef} className="project-dialog" onClick={handleClick} />;

  return (
    <dialog ref={dialogRef} className="project-dialog" onClick={handleClick} onClose={onClose}>
      <div className="dialog-inner">
        <div className="dialog-head">
          <div>
            <span className="num">PROJECT NO. {String(displayIdx + 1).padStart(2, "0")} · 2026·27</span>
            <h2>{project.title}</h2>
            <p className="advisor"><PersonLink name={project.advisor}>{project.advisor}</PersonLink> · {project.affiliation}</p>
          </div>
          <button className="dialog-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="dialog-body">
          <div className="tag-row">
            {project.areas.map((a, i) => (
              <span key={i} className={"tag" + (i === 0 ? " tag-accent" : "")}>{a}</span>
            ))}
          </div>
          <dl className="detail-grid">
            <dt>Advisor</dt>
            <dd>
              {isYangName(project.advisor)
                ? <PersonLink name={project.advisor}>{project.advisor}</PersonLink>
                : project.advisorEmail
                ? <a href={"mailto:" + project.advisorEmail}>{project.advisor}</a>
                : project.advisor}
            </dd>
            <dt>Affiliation</dt><dd>{project.affiliation}</dd>
            {project.partners && (
              <><dt>Partners</dt><dd>{project.partners.map((p, i) => (
                <span key={i} style={{ display: "block" }}>
                  <a href={p.url} target="_blank" rel="noopener">{p.name} ↗</a>
                </span>
              ))}</dd></>
            )}
            {project.coadvisors && (
              <>
                <dt>Co-advisors</dt>
                <dd>
                  {project.coadvisors.map((c, i) => (
                    <span key={i} style={{ display: "block" }}>
                      {isYangName(c.name)
                        ? <PersonLink name={c.name}>{c.name}</PersonLink>
                        : c.email
                        ? <a href={"mailto:" + c.email}>{c.name}</a>
                        : c.name}
                      {" "}({c.affiliation})
                    </span>
                  ))}
                </dd>
              </>
            )}
            <dt>Year</dt><dd className="mono">2026 — 2027</dd>
            <dt>Team size</dt><dd>2 – 3 students</dd>
          </dl>
          <section className="dialog-section">
            <h3>Student pitch</h3>
            {project.pitch.split("\n").map((para, i) => para.trim() && <p key={i}><LinkedText text={para} /></p>)}
          </section>
          <section className="dialog-section">
            <h3>Background, objectives &amp; deliverables</h3>
            {project.background.split("\n").map((para, i) => para.trim() && <p key={i}><LinkedText text={para} /></p>)}
          </section>
          <section className="dialog-section">
            <h3>Workspace &amp; access</h3>
            <p><LinkedText text={project.workspace} /></p>
          </section>
          {project.notes && (
            <section className="dialog-section">
              <h3>Advisor notes</h3>
              <p><LinkedText text={project.notes} /></p>
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
};

const ThemeMap = ({ projects, activeArea, onPick }) => {
  const counts = React.useMemo(() => {
    const m = {};
    projects.forEach(p => p.areas.forEach(a => { m[a] = (m[a] || 0) + 1; }));
    return m;
  }, [projects]);
  const themes = ALL_AREAS.filter(a => counts[a]);

  return (
    <div className="theme-row">
      {themes.map((a) => {
        const [name, sub] = a.includes(" / ") ? [a.split(" / ")[0], a.split(" / ").slice(1).join(" / ")] : [a, ""];
        return (
          <button
            key={a}
            className={"theme-tag" + (activeArea === a ? " is-active" : "")}
            onClick={() => onPick(a === activeArea ? "" : a)}
            data-spark="theme"
          >
            <span className="theme-tag-name">{name}</span>
            {sub && <span className="theme-tag-sub">{sub}</span>}
            <span className="theme-tag-count" aria-label={counts[a] + " projects"}>×{counts[a]}</span>
          </button>
        );
      })}
    </div>
  );
};

const DirectorQuote = ({ className = "" }) => (
  <blockquote className={"hero-pull" + (className ? ` ${className}` : "")}>
    <span className="hp-mark">"</span>
    <p>You might already know why it works. This year, you find out whether you can build it and make it matter.</p>
    <footer className="hero-faculty">
      <div className="hf-avatar" aria-hidden="true">RY</div>
      <div>
        <div className="hf-name"><YangLink>Prof. Ran Yang</YangLink></div>
        <div className="hf-role">Capstone Instructor · Engineering Physics</div>
        <a href="https://yangran.org" className="hf-link">yangran.org ↗</a>
      </div>
    </footer>
  </blockquote>
);

const CourseResource = ({ resource, onNavigate }) => {
  if (resource.page) {
    return (
      <button type="button" className="course-now-resource" onClick={() => onNavigate(resource.page)}>
        <span>{resource.kind}</span>{resource.label}
      </button>
    );
  }
  return (
    <a className="course-now-resource" href={resource.url} target="_blank" rel="noopener">
      <span>{resource.kind}</span>{resource.label}
    </a>
  );
};

const CourseNow = ({ announcement, referenceItems = [], onNavigate }) => {
  if (!announcement) return null;

  return (
    <Reveal as="section" className="course-now" aria-label="Latest course update">
      <div className="course-now-main">
        <p className="kicker"><span className="dot">●</span> &nbsp; Latest course update</p>
        <h2>{announcement.title}</h2>
        <p>{announcement.summary}</p>
        {referenceItems.length > 0 && (
          <div className="course-reference">
            <span className="course-reference-label">Earlier updates</span>
            <ul>
              {referenceItems.map((item) => (
                <li key={item.id}>
                  <span>{item.label || item.date}</span>
                  <strong>{item.title}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="course-now-side">
        <div className="course-now-meta">
          <span className="mono">{announcement.label || announcement.date}</span>
          {announcement.audience && <span>{announcement.audience}</span>}
        </div>
        {announcement.resources?.length > 0 && (
          <div className="course-now-resources" aria-label="Update resources">
            {announcement.resources.map((resource) => (
              <CourseResource key={resource.label} resource={resource} onNavigate={onNavigate} />
            ))}
          </div>
        )}
        <button className="btn btn-primary" data-spark onClick={() => onNavigate("news")}>
          View updates
        </button>
      </div>
    </Reveal>
  );
};

const HeroLatest = ({ announcement, onNavigate }) => {
  if (!announcement) return null;

  return (
    <button type="button" className="hero-latest" onClick={() => onNavigate("news")} data-spark>
      <span className="hero-latest-label">Latest update</span>
      <strong>{announcement.title}</strong>
      <span className="hero-latest-meta">{announcement.label || announcement.date}</span>
    </button>
  );
};

const CatalogPage = ({ data, onNavigate }) => {
  const [search, setSearch] = React.useState("");
  const [areaFilter, setAreaFilter] = React.useState("");
  const [affiliationFilter, setAffiliationFilter] = React.useState("");
  const [sort, setSort] = React.useState("title");
  const [openProject, setOpenProject] = React.useState(null);

  const affiliations = React.useMemo(
    () => [...new Set(data.projects.map(p => p.affiliation))].sort(),
    [data.projects]
  );
  const activeProjectIds = data.cohortStatus?.activeProjectIds || [];
  const hasProjectStatus = activeProjectIds.length > 0;
  const activeProjectSet = React.useMemo(() => new Set(activeProjectIds), [activeProjectIds]);
  const activeProjectCount = hasProjectStatus ? activeProjectSet.size : data.projects.length;
  const inactiveProjectCount = hasProjectStatus ? Math.max(0, data.projects.length - activeProjectSet.size) : 0;
  const currentAnnouncements = React.useMemo(() => (
    sortAnnouncements((data.announcements || []).filter(item => item.cohortYear === data.currentYear))
  ), [data.announcements, data.currentYear]);
  const currentUpdate = currentCourseAnnouncement(currentAnnouncements);
  const referenceUpdates = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...currentAnnouncements]
      .filter((item) => item.id !== currentUpdate?.id && item.date && item.date <= today)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 4);
  }, [currentAnnouncements, currentUpdate]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.projects
      .filter(p => {
        const hay = (p.title + " " + p.advisor + " " + p.affiliation + " " + p.areas.join(" ") + " " + p.pitch).toLowerCase();
        return (!q || hay.includes(q)) &&
               (!areaFilter || p.areas.includes(areaFilter)) &&
               (!affiliationFilter || p.affiliation === affiliationFilter);
      })
      .sort((a, b) => {
        if (hasProjectStatus) {
          const activeDelta = Number(!activeProjectSet.has(a.id)) - Number(!activeProjectSet.has(b.id));
          if (activeDelta) return activeDelta;
        }
        if (sort === "advisor") return a.advisor.localeCompare(b.advisor);
        return a.title.localeCompare(b.title);
      });
  }, [activeProjectSet, data.projects, hasProjectStatus, search, areaFilter, affiliationFilter, sort]);


  return (
    <div className="page catalog-page">
      <section className="hero" style={{ position: "relative" }}>
        <HeroParticles count={18} intensity={window.__epTweakSparks ?? 1} />
        <div className="hero-main" style={{ position: "relative", zIndex: 1 }}>
          <p className="kicker"><span className="dot">●</span> &nbsp; 2026 — 2027 cohort &nbsp; <span style={{color: "var(--pink-ink)"}}>·</span> &nbsp; {data.cohortStatus?.label || "William & Mary"}</p>
          <h1>Engineering Physics Capstone</h1>
          <div className="hero-split">
            <DirectorQuote className="hero-pull-banner" />
          </div>
          <div className="hero-actions">
            <button className="btn btn-primary" data-spark onClick={() => onNavigate("news")}>Open course updates</button>
            <button className="btn btn-ghost" onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })}>View team slate</button>
            <button className="btn btn-ghost" onClick={() => document.getElementById("themes")?.scrollIntoView({ behavior: "smooth" })}>See the idea map</button>
          </div>
        </div>
      </section>

      <CourseNow announcement={currentUpdate} referenceItems={referenceUpdates} onNavigate={onNavigate} />

      <Reveal as="section" id="projects">
        <div className="section-heading">
          <div>
            <p className="kicker">Team slate · 2026·27</p>
            <h2>{activeProjectCount} capstone teams are underway.</h2>
            <p style={{ maxWidth: 560, color: "var(--ink-soft)", marginTop: 12, fontSize: 15 }}>
              Browse the active team briefs and the full proposal slate for this cohort.
            </p>
          </div>
          <p className="meta mono">{String(filtered.length).padStart(2, "0")} / {String(data.projects.length).padStart(2, "0")} shown</p>
        </div>

        <div className="filters">
          <label className="field">
            <span className="field-label">Search</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Project, advisor, topic" />
          </label>
          <label className="field">
            <span className="field-label">Theme</span>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
              <option value="">All themes</option>
              {ALL_AREAS.filter(a => data.projects.some(p => p.areas.includes(a))).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Affiliation</span>
            <select value={affiliationFilter} onChange={(e) => setAffiliationFilter(e.target.value)}>
              <option value="">All</option>
              {affiliations.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="title">Title</option>
              <option value="advisor">Advisor</option>
            </select>
          </label>
        </div>

        <div className="project-grid">
          {filtered.length === 0 ? (
            <div className="empty">No projects match those filters yet.</div>
          ) : filtered.map((p) => {
            const status = hasProjectStatus ? (activeProjectSet.has(p.id) ? "active" : "inactive") : "";
            const statusLabel = status === "active"
              ? data.cohortStatus?.activeLabel || "Active team"
              : status === "inactive"
              ? data.cohortStatus?.inactiveLabel || "Inactive this year"
              : "";
            return (
              <ProjectCard
                key={p.id}
                project={p}
                displayIdx={p.num - 1}
                onOpen={setOpenProject}
                status={status}
                statusLabel={statusLabel}
              />
            );
          })}
        </div>
      </Reveal>

      <Reveal as="section" id="themes" className="is-emph-soft">
        <div className="section-heading">
          <div>
            <p className="kicker">Idea network</p>
            <h2>The threads connecting the cohort.</h2>
          </div>
          <button className="btn btn-ghost" onClick={() => setAreaFilter("")} disabled={!areaFilter}>Clear</button>
        </div>
        <ThemeMap projects={data.projects} activeArea={areaFilter} onPick={(a) => {
          setAreaFilter(a);
          setTimeout(() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }), 100);
        }} />
      </Reveal>

      <ProjectDialog project={openProject} displayIdx={openProject ? openProject.num - 1 : -1} onClose={() => setOpenProject(null)} />
    </div>
  );
};

export { AREA_COLORS, CatalogPage };
