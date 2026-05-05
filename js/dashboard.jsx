/* Instructor dashboard — distribution, students, heatmap, teams (auto + manual) */

import * as React from "react";
import { Reveal } from "./motion.jsx";
import { buildTeams } from "./teamMatching.js";
import { PersonLink, YangLink } from "./links.jsx";
import { sortAnnouncements } from "./news.jsx";

const INSTRUCTOR_EMAIL = "rxyan2@wm.edu";
const CUSTOM_DRAFT_ID = "custom-draft";

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const uniqueRecipients = (people) => {
  const seen = new Set();
  return (people || [])
    .map((person) => ({
      name: (person.name || person.email || "").trim(),
      email: normalizeEmail(person.email),
      role: person.role || "recipient",
    }))
    .filter((person) => {
      if (!person.email || seen.has(person.email)) return false;
      seen.add(person.email);
      return true;
    });
};

const projectNumber = (project) => `P${String(project?.num || 0).padStart(2, "0")}`;

const projectLabel = (project) => (
  project ? `${projectNumber(project)} · ${project.title.split(":")[0]}` : "Selected project"
);

const mentorsForProject = (project) => {
  if (!project) return [];
  return uniqueRecipients([
    { name: project.advisor, email: project.advisorEmail, role: "mentor" },
    ...(project.coadvisors || []).map((person) => ({ ...person, role: "mentor" })),
  ]);
};

const resourceLine = (resource) => {
  const label = resource.kind ? `${resource.kind}: ${resource.label}` : resource.label;
  if (resource.url) return `${label} - ${resource.url}`;
  if (resource.page) return `${label} - open the EP site and choose ${resource.page}`;
  return label;
};

const draftFromAnnouncement = (announcement, cohortYear) => {
  if (!announcement) {
    return {
      subject: `[EP ${cohortYear}] `,
      body: "Hello everyone,\n\n\n\nBest,\nRan",
    };
  }

  const resources = (announcement.resources || []).map(resourceLine);
  return {
    subject: `[EP ${announcement.cohortYear || cohortYear}] ${announcement.title.replace(/\.$/, "")}`,
    body: [
      "Hello everyone,",
      announcement.summary,
      ...(announcement.body || []),
      resources.length ? `Resources:\n${resources.map((line) => `- ${line}`).join("\n")}` : "",
      "Best,\nRan",
    ].filter(Boolean).join("\n\n"),
  };
};

const buildMailtoUrl = ({ recipients, subject, body }) => {
  const params = new URLSearchParams();
  params.set("bcc", recipients.map((person) => person.email).join(","));
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${INSTRUCTOR_EMAIL}?${params.toString()}`;
};

const buildAiPrompt = ({ cohortYear, audienceLabel, project, subject, body }) => [
  `Draft a concise, friendly Engineering Physics Capstone email for the ${cohortYear} cohort.`,
  `Audience: ${audienceLabel}${project ? ` (${projectLabel(project)})` : ""}.`,
  "Tone: clear, warm, direct, no hype. Keep it short enough that students will actually read it.",
  `Current subject:\n${subject}`,
  `Source text or draft:\n${body}`,
  "Return only a polished subject line and email body.",
].join("\n\n");

const useDistribution = (projects, responses) => React.useMemo(() => {
  const idx = Object.fromEntries(projects.map((p, i) => [p.id, i]));
  const dist = projects.map(p => ({ id: p.id, num: p.num, title: p.title, advisor: p.advisor, ranks: Array(projects.length).fill(0), total: 0 }));
  responses.forEach(r => {
    r.ranking.forEach((pid, rank) => {
      const i = idx[pid];
      if (i !== undefined) {
        dist[i].ranks[rank]++;
        if (rank < 3) dist[i].total++;
      }
    });
  });
  return dist.sort((a, b) => a.num - b.num);
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
              <span className="dist-num">{String(row.num).padStart(2, "0")}</span>
              <div>
                <div className="dist-title" title={row.title}>{row.title}</div>
                <div className="dist-advisor"><PersonLink name={row.advisor}>{row.advisor}</PersonLink></div>
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

const TeamsView = ({ projects, responses, students }) => {
  const [seed, setSeed] = React.useState(0);
  const [teams, setTeams] = React.useState(null);
  const [draggedStudent, setDraggedStudent] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);

  React.useEffect(() => {
    const result = buildTeams({ projects, responses, students, seed });
    setTeams(result);
  }, [projects, responses, students, seed]);

  if (!teams) return null;

  const moveStudent = (email, fromProjectId, toProjectId) => {
    if (fromProjectId === toProjectId) return;
    if (teams.teams[fromProjectId]?.find(s => s.email === email)?.locked) return;
    if ((teams.teams[toProjectId] || []).length >= teams.maxTeamSize) return;
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
        <div className="field">
          <span className="field-label">Team size</span>
          <div className="mono" style={{ fontSize: 13 }}>2–3 students</div>
        </div>
        <div className="field">
          <span className="field-label">Preference window</span>
          <div className="mono" style={{ fontSize: 13 }}>Top 3 first</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setSeed(s => s + 1)} data-spark>Re-roll</button>
        <div className="satisfaction">
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Cohort satisfaction</div>
            <div className="big">{teams.satisfaction}%</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Moved below top-3</div>
            <div className="big" style={{ color: teams.unhappyCount > 4 ? "var(--pink-ink)" : "var(--olive-ink)" }}>{teams.unhappyCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Inactive projects</div>
            <div className="big" style={{ color: "var(--muted)" }}>{teams.inactiveProjectIds.length}</div>
          </div>
        </div>
      </div>

      <div className="teams-grid">
        {[...projects].sort((a, b) => a.num - b.num).map((p) => {
          const roster = teams.teams[p.id] || [];
          return (
            <Reveal as="div" key={p.id} className="team-card" delay={(p.num - 1) * 30}>
              <div className="team-num mono">TEAM {String(p.num).padStart(2, "0")}</div>
              <h4 className="team-title">{p.title}</h4>
              <div className="team-advisor"><PersonLink name={p.advisor}>{p.advisor}</PersonLink> · {p.affiliation}</div>
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
                {roster.length === 0 && <li className="team-empty">Inactive · no team this pass</li>}
                {roster.map(s => (
                  <li
                    key={s.email}
                    draggable={!s.locked}
                    className={(draggedStudent?.email === s.email ? "dragging" : "") + (s.locked ? " is-locked" : "")}
                    onDragStart={() => !s.locked && setDraggedStudent({ email: s.email, fromProject: p.id })}
                    onDragEnd={() => setDraggedStudent(null)}
                    title={s.locked ? "Honors-approved project; locked for matching" : "Drag for manual override"}
                  >
                    <span>{s.name}</span>
                    <span className="pref-marker">
                      {s.locked ? `Honors P${String(s.honorsProject?.number).padStart(2, "0")}` : `#${s.prefRank + 1}`}
                    </span>
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

const EmailDraftView = ({ data, projects, responses, students }) => {
  const announcements = React.useMemo(
    () => sortAnnouncements((data.announcements || []).filter(item => item.cohortYear === data.currentYear)),
    [data.announcements, data.currentYear]
  );
  const audienceOptions = data.announcementAudiences || [
    { id: "all", label: "All students + mentors" },
    { id: "students", label: "All students" },
    { id: "honors_students", label: "Honors students" },
    { id: "mentors", label: "All mentors" },
    { id: "team", label: "Selected project team" },
  ];
  const defaultSource = announcements[0]?.id || CUSTOM_DRAFT_ID;
  const initialDraft = draftFromAnnouncement(announcements[0], data.currentYear);

  const [audience, setAudience] = React.useState("all");
  const [projectId, setProjectId] = React.useState(projects[0]?.id || "");
  const [sourceId, setSourceId] = React.useState(defaultSource);
  const [subject, setSubject] = React.useState(initialDraft.subject);
  const [body, setBody] = React.useState(initialDraft.body);
  const [status, setStatus] = React.useState("");

  const teams = React.useMemo(
    () => buildTeams({ projects, responses, students, seed: 0 }),
    [projects, responses, students]
  );

  const project = projects.find((p) => p.id === projectId);
  const audienceLabel = audienceOptions.find((option) => option.id === audience)?.label || "Selected group";

  const recipients = React.useMemo(() => {
    const studentRecipients = students.map((student) => ({ name: student.name, email: student.email, role: "student" }));
    const honorsRecipients = students
      .filter((student) => student.honorsProject)
      .map((student) => ({ name: student.name, email: student.email, role: "student" }));
    const mentorRecipients = projects.flatMap(mentorsForProject);
    const teamStudents = (teams.teams[projectId] || []).map((student) => ({
      name: student.name,
      email: student.email,
      role: "student",
    }));

    if (audience === "students") return uniqueRecipients(studentRecipients);
    if (audience === "honors_students") return uniqueRecipients(honorsRecipients);
    if (audience === "mentors") return uniqueRecipients(mentorRecipients);
    if (audience === "team") return uniqueRecipients([...teamStudents, ...mentorsForProject(project)]);
    return uniqueRecipients([...studentRecipients, ...mentorRecipients]);
  }, [audience, project, projectId, projects, students, teams]);

  const studentCount = recipients.filter((person) => person.role === "student").length;
  const mentorCount = recipients.filter((person) => person.role === "mentor").length;
  const selectedAnnouncement = announcements.find((item) => item.id === sourceId);
  const mailtoUrl = buildMailtoUrl({ recipients, subject, body });

  const selectSource = (nextSourceId) => {
    setSourceId(nextSourceId);
    const draft = nextSourceId === CUSTOM_DRAFT_ID
      ? draftFromAnnouncement(null, data.currentYear)
      : draftFromAnnouncement(announcements.find((item) => item.id === nextSourceId), data.currentYear);
    setSubject(draft.subject);
    setBody(draft.body);
    setStatus("");
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${label} copied.`);
    } catch {
      setStatus("Copy failed. Select the text and copy it manually.");
    }
  };

  const openMailDraft = () => {
    if (!recipients.length) {
      setStatus("No recipients found for this group yet.");
      return;
    }
    window.location.href = mailtoUrl;
    setStatus(`Opening your mail composer with ${recipients.length} BCC recipients. Review, choose the W&M account, then send.`);
  };

  return (
    <div className="email-draft-grid">
      <section className="email-composer">
        <div className="email-section-head">
          <div>
            <p className="kicker"><span className="dot">●</span> &nbsp; Dashboard-only</p>
            <h3>Draft cohort email</h3>
          </div>
          <span className="email-mode mono">Mail app draft</span>
        </div>

        <div className="email-form-grid">
          <label className="field">
            <span className="field-label">Send to</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              {audienceOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>

          {audience === "team" && (
            <label className="field">
              <span className="field-label">Project team</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {[...projects].sort((a, b) => a.num - b.num).map((item) => (
                  <option key={item.id} value={item.id}>{projectLabel(item)}</option>
                ))}
              </select>
            </label>
          )}

          <label className="field email-source-field">
            <span className="field-label">Use news item</span>
            <select value={sourceId} onChange={(e) => selectSource(e.target.value)}>
              {announcements.map((item) => (
                <option key={item.id} value={item.id}>{item.label} · {item.title}</option>
              ))}
              <option value={CUSTOM_DRAFT_ID}>Draft something new</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Message</span>
          <textarea rows="13" value={body} onChange={(e) => setBody(e.target.value)} />
        </label>

        <div className="email-actions">
          <button className="btn btn-primary" onClick={openMailDraft} disabled={!recipients.length} data-spark>
            Open in Mail
          </button>
          <button className="btn btn-ghost" onClick={() => copyText(recipients.map((person) => person.email).join(", "), "Recipient list")}>
            Copy recipients
          </button>
          <button className="btn btn-ghost" onClick={() => copyText(body, "Message body")}>
            Copy body
          </button>
          <button
            className="btn btn-pink"
            onClick={() => copyText(buildAiPrompt({ cohortYear: data.currentYear, audienceLabel, project: audience === "team" ? project : null, subject, body }), "AI drafting prompt")}
          >
            Copy AI prompt
          </button>
        </div>

        <p className="email-note">
          This prepares a draft with BCC recipients. It does not auto-send, attach files, or choose the sender account for you.
        </p>
        {selectedAnnouncement?.resources?.length > 0 && (
          <p className="email-note">
            Attachments still need to be added in Mail. Linked resources are included in the message text.
          </p>
        )}
        {status && <p className="email-status">{status}</p>}
      </section>

      <aside className="recipient-panel">
        <div className="email-section-head">
          <div>
            <p className="field-label">Recipient preview</p>
            <h3>{recipients.length} people</h3>
          </div>
        </div>
        <div className="recipient-stats">
          <span><strong>{studentCount}</strong> students</span>
          <span><strong>{mentorCount}</strong> mentors</span>
        </div>
        {audience === "team" && (
          <div className="team-email-context">
            <span className="mono">{projectLabel(project)}</span>
            <span>{(teams.teams[projectId] || []).length || 0} matched students in the current auto preview</span>
          </div>
        )}
        <ul className="recipient-list">
          {recipients.map((person) => (
            <li key={person.email}>
              <span>
                <strong>{person.name || person.email}</strong>
                <em>{person.role}</em>
              </span>
              <span className="mono">{person.email}</span>
            </li>
          ))}
          {!recipients.length && <li className="empty">No recipients found for this selection.</li>}
        </ul>
      </aside>
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
          <p className="kicker"><span className="dot">●</span> &nbsp; Instructor view · <YangLink>Prof. Ran Yang</YangLink></p>
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
          ["email", "Email drafts"],
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
      {tab === "teams" && <TeamsView projects={data.projects} responses={responses} students={data.students || []} />}
      {tab === "email" && <EmailDraftView data={data} projects={data.projects} responses={responses} students={data.students || []} />}
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
