/* Catalog (project browser) — hero, filters, grid, theme map, project dialog */

import * as React from "react";
import { HeroParticles, Reveal } from "./motion.jsx";
import { LinkedText, PersonLink, YangLink, isYangName } from "./links.jsx";

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

const ProjectCard = ({ project, displayIdx, onOpen }) => {
  const railColor = AREA_COLORS[project.areas[0]] || "var(--pink)";
  const openFromKeyboard = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen(project);
  };

  return (
    <article
      className="project-card"
      data-spark="card"
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
        if (sort === "advisor") return a.advisor.localeCompare(b.advisor);
        return a.title.localeCompare(b.title);
      });
  }, [data.projects, search, areaFilter, affiliationFilter, sort]);


  return (
    <div className="page">
      <section className="hero" style={{ position: "relative" }}>
        <HeroParticles count={18} intensity={window.__epTweakSparks ?? 1} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p className="kicker"><span className="dot">●</span> &nbsp; 2026 — 2027 cohort &nbsp; <span style={{color: "var(--pink-ink)"}}>·</span> &nbsp; William &amp; Mary</p>
          <h1>
            Engineering<br/>
            <span className="ital">Physics</span><span style={{color:"var(--muted)"}}>,</span> <span className="olv">in&nbsp;practice.</span>
          </h1>
          <p className="hero-sub">
            A capstone home for nine projects, the students who pick them, and the faculty who advise.
            Browse the slate, rank your favorites, and watch the cohort take shape.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <button className="btn btn-primary" data-spark onClick={() => onNavigate("ranking")}>Take the ranking poll</button>
            <button className="btn btn-ghost" onClick={() => document.getElementById("themes")?.scrollIntoView({ behavior: "smooth" })}>See the idea map</button>
          </div>

          <ul className="hero-marquee" aria-label="At a glance">
            <li><span className="hm-num">09</span><span className="hm-lab">projects</span></li>
            <li><span className="hm-num">14</span><span className="hm-lab">advisors</span></li>
            <li><span className="hm-num">2 – 3</span><span className="hm-lab">per team</span></li>
            <li><span className="hm-num">1</span><span className="hm-lab">academic year</span></li>
          </ul>
        </div>

        <aside className="hero-aside" style={{ position: "relative", zIndex: 1 }}>
          <div className="hero-card">
            <p className="kicker" style={{ marginBottom: 14 }}><span className="dot">●</span> &nbsp; This week</p>
            <ol className="hero-timeline">
              <li className="is-current">
                <span className="when mono">Now</span>
                <span className="what"><strong>Open ranking poll.</strong> Browse the slate and submit your top picks.</span>
              </li>
              <li>
                <span className="when mono">Mon · May 11</span>
                <span className="what">Ranking closes. Auto team-making preview shared with cohort.</span>
              </li>
              <li>
                <span className="when mono">Fri · May 15</span>
                <span className="what">Final teams confirmed. Kickoffs scheduled with advisors.</span>
              </li>
              <li>
                <span className="when mono">Coming soon</span>
                <span className="what">Mid-project reviews, lab visits, and the public showcase in April 2027.</span>
              </li>
            </ol>
            <div className="hero-faculty">
              <div className="hf-avatar" aria-hidden="true">RY</div>
              <div>
                <div className="hf-name"><YangLink>Prof. Ran Yang</YangLink></div>
                <div className="hf-role">Capstone director · Engineering Physics</div>
                <a href="https://yangran.org" className="hf-link">yangran.org ↗</a>
              </div>
            </div>
          </div>

          <blockquote className="hero-pull">
            <span className="hp-mark">"</span>
            <p>You might already know why it works. This year, you find out whether you can build it and make it matter.</p>
            <footer>— <YangLink>Prof. Ran Yang</YangLink></footer>
          </blockquote>
        </aside>
      </section>

      <Reveal as="section" id="projects">
        <div className="section-heading">
          <div>
            <p className="kicker">Capstone slate · 2026·27</p>
            <h2>Nine real problems. <span className="ital" style={{color: "var(--pink-ink)"}}>One year</span> to build the answer.</h2>
            <p style={{ maxWidth: 560, color: "var(--ink-soft)", marginTop: 12, fontSize: 15 }}>
              Each project is sponsored by a faculty advisor and runs the full academic year — from problem framing
              in the fall to a public showcase in May. Read the briefs, find the one that pulls at you, and rank.
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
          ) : filtered.map((p, i) => (
            <ProjectCard key={p.id} project={p} displayIdx={p.num - 1} onOpen={setOpenProject} />
          ))}
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
