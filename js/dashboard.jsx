/* Instructor dashboard — distribution, students, heatmap, teams (auto + manual) */

import * as React from "react";
import { Reveal } from "./motion.jsx";

const useDistribution = (projects, responses) => React.useMemo(() => {
  const idx = Object.fromEntries(projects.map((p, i) => [p.id, i]));
  const dist = projects.map(p => ({ id: p.id, title: p.title, advisor: p.advisor, ranks: Array(projects.length).fill(0), total: 0 }));
  responses.forEach(r => {
    r.ranking.forEach((pid, rank) => {
      const i = idx[pid];
      if (i !== undefined) {
        dist[i].ranks[rank]++;
        if (rank < 3) dist[i].total++;
      }
    });
  });
  return dist;
}, [projects, responses]);

const DistributionView = ({ projects, responses }) => {
  const dist = useDistribution(projects, responses);
  return (
    <div>
      <div className="dist-legend">
        <span className="lg"><span className="sw" style={{background: "oklch(46% 0.075 18)"}}/> 1st choice</span>
        <span className="lg"><span className="sw" style={{background: "oklch(56% 0.065 25)"}}/> 2nd</span>
        <span className="lg"><span className="sw" style={{background: "oklch(64% 0.05 40)"}}/> 3rd</span>
        <span className="lg"><span className="sw" style={{background: "oklch(72% 0.04 60)"}}/> 4th</span>
        <span className="lg"><span className="sw" style={{background: "oklch(78% 0.03 80)"}}/> 5th</span>
        <span className="lg"><span className="sw" style={{background: "oklch(82% 0.02 100)"}}/> 6th+</span>
      </div>
      <div className="dist-grid">
        {dist.map((row, i) => {
          const top3 = row.ranks.slice(0, 3).reduce((a, b) => a + b, 0);
          const cap = 6;
          let flag = "balanced", flagText = "BALANCED";
          if (top3 > cap) { flag = "over"; flagText = "OVER"; }
          else if (top3 < 2) { flag = "under"; flagText = "UNDER"; }
          return (
            <Reveal as="div" key={row.id} className="dist-row" delay={i * 30}>
              <span className="dist-num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="dist-title" title={row.title}>{row.title}</div>
                <div className="dist-advisor">{row.advisor}</div>
              </div>
              <div className="dist-bar" title={`Top-3 picks: ${top3}`}>
                {row.ranks.map((c, r) => {
                  if (c === 0) return null;
                  const cls = r < 5 ? `r${r+1}` : "rN";
                  const w = (c / responses.length) * 100;
                  return <span key={r} className={"dist-seg " + cls} style={{ flex: c }}>{c > 1 ? c : ""}</span>;
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span className="dist-total mono">{top3} top-3</span>
                <span className={"dist-flag " + flag}>{flagText}</span>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

const StudentsView = ({ projects, responses }) => {
  const map = Object.fromEntries(projects.map(p => [p.id, p]));
  return (
    <div className="students-grid">
      <div className="student-row head">
        <div>Student</div>
        <div>Top picks</div>
        <div>Notes</div>
      </div>
      {responses.map((r, i) => (
        <Reveal as="div" key={r.email} className="student-row" delay={i * 20}>
          <div>
            <div className="name">{r.name}</div>
            <div className="email">{r.email}</div>
          </div>
          <div className="pref-list">
            {r.ranking.slice(0, 4).map((pid, idx) => {
              const p = map[pid];
              return p ? (
                <span key={pid} className="pref-chip"><span className="n">#{idx+1}</span> {p.title.split(":")[0].split("(")[0].slice(0, 28)}{p.title.length > 28 ? "…" : ""}</span>
              ) : null;
            })}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 220, textAlign: "right" }}>{r.notes || "—"}</div>
        </Reveal>
      ))}
    </div>
  );
};

const HeatmapView = ({ projects, responses }) => {
  const idx = Object.fromEntries(projects.map((p, i) => [p.id, i]));
  // matrix[project][rank] = count
  const matrix = projects.map(() => Array(projects.length).fill(0));
  responses.forEach(r => r.ranking.forEach((pid, rank) => {
    const i = idx[pid];
    if (i !== undefined) matrix[i][rank]++;
  }));
  const max = Math.max(1, ...matrix.flat());

  return (
    <div className="heatmap-wrap">
      <div className="heatmap" style={{ "--cols": projects.length }}>
        <div className="h-corner">PROJECT \ RANK</div>
        {projects.map((_, c) => <div key={c} className="h-label" style={{ textAlign: "center" }}>#{c+1}</div>)}
        {projects.map((p, r) => (
          <React.Fragment key={p.id}>
            <div className="h-row-label" title={p.title}>{p.title.split(":")[0].split("(")[0].slice(0, 32)}</div>
            {projects.map((_, c) => {
              const v = matrix[r][c];
              const t = v / max;
              const bg = `color-mix(in oklch, var(--pink) ${Math.round(t * 70)}%, var(--paper-3))`;
              return <div key={c} className="h-cell" data-v={v} style={{ background: bg, color: t > 0.5 ? "white" : "var(--ink-soft)" }} title={`${p.title} → rank #${c+1}: ${v}`}>{v || ""}</div>;
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ----- Auto team-making (simple weighted greedy) -----
const buildTeams = ({ projects, responses, teamSize = 3, weightTop = 3 }) => {
  // Assign each student to one project, balancing. Simple greedy:
  // Round 1: try to give each student their #1 pick if seats remain.
  // Round 2..N: descend their preference list.
  const seats = Object.fromEntries(projects.map(p => [p.id, teamSize]));
  const teams = Object.fromEntries(projects.map(p => [p.id, []]));
  const assigned = {};
  let unhappy = 0;

  // Sort responses for fairness — those with top-1 oversubscribed get processed first to spread
  const order = [...responses].sort(() => Math.random() - 0.5);
  for (let pass = 0; pass < projects.length; pass++) {
    for (const r of order) {
      if (assigned[r.email]) continue;
      const choice = r.ranking[pass];
      if (choice && seats[choice] > 0) {
        seats[choice]--;
        teams[choice].push({ email: r.email, name: r.name, prefRank: pass });
        assigned[r.email] = { project: choice, prefRank: pass };
        if (pass > 2) unhappy++;
      }
    }
  }
  // Remaining (couldn't fit anywhere in their list — rare)
  for (const r of responses) {
    if (assigned[r.email]) continue;
    const open = projects.find(p => seats[p.id] > 0);
    if (open) { seats[open.id]--; teams[open.id].push({ email: r.email, name: r.name, prefRank: projects.length }); assigned[r.email] = { project: open.id, prefRank: projects.length }; }
  }
  // Compute satisfaction: avg of (1 - prefRank / projects.length), top-3 weighted
  const sat = responses.map(r => {
    const a = assigned[r.email];
    if (!a) return 0;
    return Math.max(0, 1 - a.prefRank / Math.max(1, weightTop));
  });
  const avg = sat.length ? sat.reduce((a, b) => a + b, 0) / sat.length : 0;
  return { teams, assigned, satisfaction: Math.round(avg * 100), unhappyCount: unhappy };
};

const TeamsView = ({ projects, responses }) => {
  const [teamSize, setTeamSize] = React.useState(3);
  const [weightTop, setWeightTop] = React.useState(3);
  const [seed, setSeed] = React.useState(0);
  const [teams, setTeams] = React.useState(null);
  const [draggedStudent, setDraggedStudent] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);

  React.useEffect(() => {
    const result = buildTeams({ projects, responses, teamSize, weightTop });
    setTeams(result);
  }, [projects, responses, teamSize, weightTop, seed]);

  if (!teams) return null;

  const moveStudent = (email, fromProjectId, toProjectId) => {
    if (fromProjectId === toProjectId) return;
    const next = JSON.parse(JSON.stringify(teams.teams));
    const fromList = next[fromProjectId];
    const i = fromList.findIndex(s => s.email === email);
    if (i < 0) return;
    const [stu] = fromList.splice(i, 1);
    // Recompute prefRank for new project
    const r = responses.find(x => x.email === email);
    if (r) stu.prefRank = r.ranking.indexOf(toProjectId);
    next[toProjectId].push(stu);
    setTeams({ ...teams, teams: next });
  };

  return (
    <div>
      <div className="teams-controls">
        <label className="field">
          <span className="field-label">Team size</span>
          <select value={teamSize} onChange={(e) => setTeamSize(+e.target.value)}>
            <option value={2}>2 students</option>
            <option value={3}>3 students</option>
            <option value={4}>4 students</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Top-N weighted</span>
          <select value={weightTop} onChange={(e) => setWeightTop(+e.target.value)}>
            <option value={2}>Top 2</option>
            <option value={3}>Top 3</option>
            <option value={5}>Top 5</option>
          </select>
        </label>
        <button className="btn btn-ghost" onClick={() => setSeed(s => s + 1)} data-spark>Re-roll</button>
        <div className="satisfaction">
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Cohort satisfaction</div>
            <div className="big">{teams.satisfaction}%</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Below top-3</div>
            <div className="big" style={{ color: teams.unhappyCount > 4 ? "var(--pink-ink)" : "var(--olive-ink)" }}>{teams.unhappyCount}</div>
          </div>
        </div>
      </div>

      <div className="teams-grid">
        {projects.map((p, i) => {
          const roster = teams.teams[p.id] || [];
          return (
            <Reveal as="div" key={p.id} className="team-card" delay={i * 30}>
              <div className="team-num mono">TEAM {String(i+1).padStart(2, "0")}</div>
              <h4 className="team-title">{p.title}</h4>
              <div className="team-advisor">{p.advisor} · {p.affiliation}</div>
              <ul
                className={"team-roster" + (dropTarget === p.id ? " is-drop-target" : "")}
                onDragOver={(e) => { e.preventDefault(); setDropTarget(p.id); }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedStudent) {
                    moveStudent(draggedStudent.email, draggedStudent.fromProject, p.id);
                  }
                  setDropTarget(null);
                  setDraggedStudent(null);
                }}
              >
                {roster.length === 0 && <li className="team-empty">Open · drop a student here</li>}
                {roster.map(s => (
                  <li
                    key={s.email}
                    draggable
                    className={draggedStudent?.email === s.email ? "dragging" : ""}
                    onDragStart={() => setDraggedStudent({ email: s.email, fromProject: p.id })}
                    onDragEnd={() => setDraggedStudent(null)}
                  >
                    <span>{s.name}</span>
                    <span className="pref-marker">#{s.prefRank + 1}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

const ArchiveView = ({ archive, currentYear, onSwitch }) => (
  <div className="archive-wrap">
    {archive.map((y, i) => (
      <Reveal as="div" key={y.year} className={"archive-year " + y.status} delay={i * 50}>
        <div className="yr">{y.year.split("-").map(s => s.slice(-2)).join("·")}</div>
        <div className="body">
          <h3>{y.title}</h3>
          <p>{y.summary}</p>
          <div className="stats-row">
            <span><strong>{y.projects ?? "—"}</strong> projects</span>
            <span><strong>{y.teams ?? "—"}</strong> teams</span>
            <span><strong>{y.students ?? "—"}</strong> students</span>
            {y.status === "current" && <span style={{ color: "var(--pink-ink)" }}>● live</span>}
            {y.status === "future" && <span style={{ color: "var(--muted)" }}>placeholder</span>}
          </div>
          {y.status !== "future" && (
            <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => onSwitch?.(y.year)}>
              {y.year === currentYear ? "Currently viewing" : "Switch to " + y.year}
            </button>
          )}
        </div>
      </Reveal>
    ))}
  </div>
);

const DashboardPage = ({ data, onNavigate }) => {
  const [tab, setTab] = React.useState("distribution");
  const responses = data.responses;

  return (
    <div className="page">
      <section className="dashboard-hero">
        <div>
          <p className="kicker"><span className="dot">●</span> &nbsp; Instructor view · Prof. Ran Yang</p>
          <h1>Cohort dashboard <span style={{ color: "var(--muted)", fontStyle: "italic" }}>2026·27</span></h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 580 }}>
            Live-feel preview using sample submissions. Switch tabs to see ranking distribution, individual responses,
            a conflict heatmap, and the auto team-making preview with manual overrides.
          </p>
          <p className="construction-note">Dashboard mockup · under construction · sample data only</p>
        </div>
        <Reveal as="dl" className="stats">
          <div><dt>Responses</dt><dd>{responses.length}</dd></div>
          <div><dt>Projects</dt><dd>{data.projects.length}</dd></div>
          <div><dt>Coverage</dt><dd><span className="pink">100%</span></dd></div>
        </Reveal>
      </section>

      <div className="dash-tabs" role="tablist">
        {[
          ["distribution", "Distribution"],
          ["heatmap", "Conflict heatmap"],
          ["students", "Student responses"],
          ["teams", "Auto team-making"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={"dash-tab" + (tab === k ? " is-active" : "")}
            onClick={() => setTab(k)}
            data-spark
          >{label}</button>
        ))}
      </div>

      {tab === "distribution" && <DistributionView projects={data.projects} responses={responses} />}
      {tab === "heatmap" && <HeatmapView projects={data.projects} responses={responses} />}
      {tab === "students" && <StudentsView projects={data.projects} responses={responses} />}
      {tab === "teams" && <TeamsView projects={data.projects} responses={responses} />}
    </div>
  );
};

const ArchivePage = ({ data, onNavigate, currentYear, setYear }) => (
  <div className="page">
    <section className="dashboard-hero">
      <div>
        <p className="kicker"><span className="dot">●</span> &nbsp; Engineering Physics archive</p>
        <h1>Every cohort, <span className="ital">held&nbsp;together.</span></h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 580 }}>
          A growing record of EP capstones at William &amp; Mary. The current year is live; past years archive
          themselves once teams ship; future years are placeholders waiting for a slate.
        </p>
      </div>
    </section>
    <ArchiveView archive={data.archive} currentYear={currentYear} onSwitch={(y) => { setYear(y); onNavigate("catalog"); }} />
  </div>
);

export { ArchivePage, DashboardPage };
