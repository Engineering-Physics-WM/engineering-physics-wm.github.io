/* Instructor dashboard — distribution, students, heatmap, teams (auto + manual) */

import * as React from "react";
import { Reveal } from "./motion.jsx";
import { DEFAULT_MATCHING_MODE, MATCHING_MODE_OPTIONS, buildTeams, rankSatisfaction } from "./teamMatching.js";
import { PersonLink, YangLink } from "./links.jsx";
import { sortAnnouncements } from "./news.jsx";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { announcementFromRow, postDraftAsNowAnnouncement, staticAnnouncementToRow } from "./announcements.js";

const INSTRUCTOR_EMAIL = "rxyan2@wm.edu";
const CUSTOM_DRAFT_ID = "custom-draft";
const TEAM_AUDIENCES = new Set(["team", "team_students", "team_mentors"]);

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

const normalizeSubmissionRow = (row, projects) => {
  const projectIds = projects.map((project) => project.id);
  const seen = new Set();
  const ranking = (Array.isArray(row.ranking) ? row.ranking : [])
    .filter((projectId) => projectIds.includes(projectId) && !seen.has(projectId) && seen.add(projectId));
  const missing = projectIds.filter((projectId) => !seen.has(projectId));

  return {
    id: row.id,
    name: row.student_name || row.student_email || "Student",
    email: normalizeEmail(row.student_email),
    notes: row.notes || "",
    ranking: [...ranking, ...missing],
    submittedAt: row.updated_at || row.created_at,
    receiptCode: row.receipt_code,
  };
};

const normalizeAllowedStudentRow = (row, projects) => {
  const honorsProject = projects.find((project) => (
    project.id === row.honors_project_id ||
    (row.honors_project_number && project.num === Number(row.honors_project_number))
  ));

  return {
    name: row.student_name || row.student_email || "Student",
    email: normalizeEmail(row.student_email),
    honorsProject: honorsProject ? {
      number: honorsProject.num,
      projectId: honorsProject.id,
      projectTitle: row.honors_project_title || honorsProject.title,
      lockedForMatching: true,
    } : null,
  };
};

const dashboardReadError = (label, error) => (
  `${label} could not load: ${error?.message || "unknown live data error"}`
);

const functionErrorMessage = async (error, fallback) => {
  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const payload = await response.json();
      if (payload?.error) return payload.error;
    } catch {}
  }
  return error?.message || fallback;
};

const mentorsForProject = (project) => {
  if (!project) return [];
  return uniqueRecipients([
    { name: project.advisor, email: project.advisorEmail, role: "mentor" },
    ...(project.coadvisors || []).map((person) => ({ ...person, role: "mentor" })),
  ]);
};

const projectMentorRows = (project, cohortYear, assignedByEmail) => (
  mentorsForProject(project).map((mentor, index) => ({
    cohort_year: cohortYear,
    project_id: project.id,
    project_number: project.num,
    person_name: mentor.name || mentor.email || "Mentor",
    person_email: mentor.email || null,
    member_type: "mentor",
    source: "project_catalog",
    locked: true,
    sort_order: index,
    assigned_by_email: assignedByEmail,
  }))
);

const rowsToTeamMap = ({ projects, rows, responses, students }) => {
  const teams = Object.fromEntries(projects.map((project) => [project.id, []]));
  const studentByEmail = Object.fromEntries((students || []).map((student) => [normalizeEmail(student.email), student]));
  const responseByEmail = Object.fromEntries(responses.map((response) => [normalizeEmail(response.email), response]));

  rows
    .filter((row) => row.member_type === "student" && teams[row.project_id])
    .sort((a, b) => (a.project_number || 999) - (b.project_number || 999) || (a.sort_order ?? 999) - (b.sort_order ?? 999))
    .forEach((row) => {
      const email = normalizeEmail(row.person_email);
      const response = responseByEmail[email];
      teams[row.project_id].push({
        email: row.person_email,
        name: row.person_name,
        prefRank: response ? response.ranking.indexOf(row.project_id) : -1,
        locked: Boolean(row.locked),
        honorsProject: studentByEmail[email]?.honorsProject || null,
      });
    });

  return teams;
};

const buildSavedTeamRows = ({ projects, teams, cohortYear, assignedByEmail }) => (
  projects.flatMap((project) => {
    const roster = teams[project.id] || [];
    const studentRows = roster.map((student, index) => ({
      cohort_year: cohortYear,
      project_id: project.id,
      project_number: project.num,
      person_name: student.name,
      person_email: student.email,
      member_type: "student",
      source: student.honorsProject?.projectId === project.id ? "honors_default" : "manual",
      locked: true,
      sort_order: index,
      assigned_by_email: assignedByEmail,
    }));
    return [...studentRows, ...projectMentorRows(project, cohortYear, assignedByEmail)];
  })
);

const activeTeamSizeErrors = (teams, minTeamSize, maxTeamSize) => (
  Object.entries(teams)
    .filter(([, roster]) => roster.length > 0 && (roster.length < minTeamSize || roster.length > maxTeamSize))
    .map(([projectId, roster]) => ({ projectId, size: roster.length }))
);

const summarizeTeamSnapshot = ({ projects, responses, teams, minTeamSize, maxTeamSize, topChoiceWindow }) => {
  const assigned = {};
  const responseByEmail = Object.fromEntries(responses.map((response) => [normalizeEmail(response.email), response]));

  Object.entries(teams).forEach(([projectId, roster]) => {
    roster.forEach((student) => {
      const email = normalizeEmail(student.email);
      const response = responseByEmail[email];
      const prefRank = Number.isFinite(student.prefRank) && student.prefRank >= 0
        ? student.prefRank
        : response?.ranking.indexOf(projectId) ?? projects.length;
      assigned[student.email] = { project: projectId, prefRank, locked: Boolean(student.locked) };
    });
  });

  const satisfactionScores = responses.map((response) => {
    const result = assigned[response.email];
    return result ? rankSatisfaction(result.prefRank, projects.length) : 0;
  });
  const avg = satisfactionScores.length
    ? satisfactionScores.reduce((total, score) => total + score, 0) / satisfactionScores.length
    : 0;
  const activeProjectIds = projects.map((project) => project.id).filter((id) => (teams[id] || []).length > 0);
  const sizeWarnings = activeTeamSizeErrors(teams, minTeamSize, maxTeamSize)
    .map(({ projectId, size }) => ({ type: "team-size", projectId, size }));

  return {
    assigned,
    satisfaction: Math.round(avg * 100),
    unhappyCount: responses.filter((response) => assigned[response.email]?.prefRank >= topChoiceWindow).length,
    activeProjectIds,
    inactiveProjectIds: projects.map((project) => project.id).filter((id) => (teams[id] || []).length === 0),
    warnings: sizeWarnings,
  };
};

const withTeamSummary = (snapshot, projects, responses) => ({
  ...snapshot,
  ...summarizeTeamSnapshot({
    projects,
    responses,
    teams: snapshot.teams,
    minTeamSize: snapshot.minTeamSize,
    maxTeamSize: snapshot.maxTeamSize,
    topChoiceWindow: snapshot.topChoiceWindow,
  }),
});

const responseSignature = (responses) => (
  responses
    .map((response) => `${normalizeEmail(response.email)}:${(response.ranking || []).join(">")}`)
    .sort()
    .join("|")
);

const matchingOptionFor = (mode) => (
  MATCHING_MODE_OPTIONS.find((option) => option.id === mode) ||
  MATCHING_MODE_OPTIONS.find((option) => option.id === DEFAULT_MATCHING_MODE)
);

const peopleFromTeamRows = (rows, projectId, memberType) => uniqueRecipients(
  rows
    .filter((row) => row.project_id === projectId && row.member_type === memberType)
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || (a.person_name || "").localeCompare(b.person_name || ""))
    .map((row) => ({
      name: row.person_name,
      email: row.person_email,
      role: memberType,
    }))
);

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
  const params = [
    ["bcc", recipients.map((person) => person.email).join(",")],
    ["subject", subject],
    ["body", body],
  ];
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `mailto:${INSTRUCTOR_EMAIL}?${query}`;
};

const RecipientList = ({ title, people }) => (
  <section className="recipient-group">
    <h4>{title}<span>{people.length}</span></h4>
    {people.map((person) => (
      <div key={person.email} className="recipient-card">
        <span>
          <strong>{person.name || person.email}</strong>
          <em>{person.role}</em>
        </span>
        <span className="mono">{person.email}</span>
      </div>
    ))}
  </section>
);

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
          return (
            <Reveal as="div" key={row.id} className="dist-row" delay={i * 30}>
              <span className="dist-num">{String(row.num).padStart(2, "0")}</span>
              <div>
                <div className="dist-title" title={row.title}>{row.title}</div>
                <div className="dist-advisor"><PersonLink name={row.advisor}>{row.advisor}</PersonLink></div>
              </div>
              <div className="dist-bar" title={`${row.title} ranking distribution`}>
                {row.ranks.map((c, r) => {
                  if (c === 0) return null;
                  const cls = r < 5 ? `r${r+1}` : "rN";
                  return <span key={r} className={"dist-seg " + cls} style={{ flex: c }}>{c}</span>;
                })}
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

const StudentsView = ({ currentYear, projects, responses, students }) => {
  const map = Object.fromEntries(projects.map(p => [p.id, p]));
  const [expanded, setExpanded] = React.useState(new Set());
  const [reminderStatus, setReminderStatus] = React.useState("");
  const responseEmails = React.useMemo(
    () => new Set(responses.map((response) => normalizeEmail(response.email))),
    [responses]
  );
  const missingStudents = React.useMemo(
    () => students.filter((student) => student.email && !responseEmails.has(normalizeEmail(student.email))),
    [responseEmails, students]
  );
  const missingRecipients = React.useMemo(
    () => uniqueRecipients(missingStudents.map((student) => ({
      name: student.name,
      email: student.email,
      role: student.honorsProject ? "honors student" : "student",
    }))),
    [missingStudents]
  );

  const toggle = (email) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(email) ? next.delete(email) : next.add(email);
    return next;
  });

  const copyMissingEmails = async () => {
    if (!missingRecipients.length) return;
    try {
      await navigator.clipboard.writeText(missingRecipients.map((person) => person.email).join(", "));
      setReminderStatus(`Copied ${missingRecipients.length} email${missingRecipients.length === 1 ? "" : "s"}.`);
    } catch {
      setReminderStatus("Copy failed. Select the emails manually.");
    }
  };

  const openMissingReminder = () => {
    if (!missingRecipients.length) return;
    const url = buildMailtoUrl({
      recipients: missingRecipients,
      subject: `[EP ${currentYear}] Ranking poll reminder`,
      body: "Hello,\n\nA quick reminder to submit your Engineering Physics project ranking poll response when you have a moment.\n\nBest,\nRan",
    });
    const link = document.createElement("a");
    link.href = url;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setReminderStatus(`Opening a reminder draft for ${missingRecipients.length} student${missingRecipients.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="student-response-view">
      {students.length > 0 ? (
        <section className={"response-roster-card" + (missingStudents.length === 0 ? " is-complete" : "")}>
          <div className="response-roster-head">
            <div>
              <p className="field-label">Poll roster</p>
              <h3>{missingStudents.length ? `${missingStudents.length} awaiting response` : "All students responded"}</h3>
            </div>
            <div className="response-roster-metrics">
              <span><strong>{responses.length}</strong> answered</span>
              <span><strong>{students.length}</strong> expected</span>
            </div>
          </div>

          {missingStudents.length > 0 ? (
            <>
              <div className="missing-actions">
                <button className="btn btn-ghost" onClick={copyMissingEmails} data-spark>
                  Copy emails
                </button>
                <button className="btn btn-primary" onClick={openMissingReminder} data-spark>
                  Open reminder
                </button>
                {reminderStatus && <span className="response-action-status">{reminderStatus}</span>}
              </div>
              <div className="missing-student-list">
                {missingStudents.map((student, i) => (
                  <Reveal as="div" key={student.email} className="missing-student-card" delay={i * 20}>
                    <strong>{student.name || student.email}</strong>
                    <span className="mono">{student.email}</span>
                    {student.honorsProject && (
                      <em>Honors · P{String(student.honorsProject.number).padStart(2, "0")}</em>
                    )}
                  </Reveal>
                ))}
              </div>
            </>
          ) : (
            <div className="recipient-empty">Every allowed student has a saved ranking.</div>
          )}
        </section>
      ) : (
        <div className="team-save-status">
          The private student allowlist is not loaded, so missing-response tracking is unavailable.
        </div>
      )}

      {!responses.length ? (
        <div className="recipient-empty">No submitted rankings yet. This tab will fill as students complete the poll.</div>
      ) : (
        <div className="students-grid">
          <div className="student-row head">
            <div>Student</div>
            <div>Top picks</div>
            <div>Notes</div>
          </div>
          {responses.map((r, i) => {
            const isExpanded = expanded.has(r.email);
            const visible = isExpanded ? r.ranking : r.ranking.slice(0, 4);
            return (
              <Reveal as="div" key={r.email} className="student-row" delay={i * 20}>
                <div>
                  <div className="name">{r.name}</div>
                  <div className="email">{r.email}</div>
                </div>
                <div className="pref-list">
                  {visible.map((pid, idx) => {
                    const p = map[pid];
                    return p ? (
                      <span key={pid} className={"pref-chip" + (idx >= 4 ? " pref-chip-lower" : "")}>
                        <span className="n">#{idx + 1}</span>{" "}
                        {p.title.split(":")[0].split("(")[0].slice(0, 28)}{p.title.length > 28 ? "…" : ""}
                      </span>
                    ) : null;
                  })}
                  {r.ranking.length > 4 && (
                    <button
                      className={"pref-expand" + (isExpanded ? " is-open" : "")}
                      onClick={() => toggle(r.email)}
                      title={isExpanded ? "Show fewer" : "Show full ranking"}
                    >
                      {isExpanded ? "−" : `+${r.ranking.length - 4}`}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 220, textAlign: "right" }}>{r.notes || "—"}</div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
};

const HeatmapView = ({ projects, responses }) => {
  const idx = Object.fromEntries(projects.map((p, i) => [p.id, i]));
  // matrix[project][rank] = count
  const matrix = projects.map(() => Array(projects.length).fill(0));
  const studentsByCell = projects.map(() => projects.map(() => []));
  const [selectedCell, setSelectedCell] = React.useState(null);

  responses.forEach(r => r.ranking.forEach((pid, rank) => {
    const i = idx[pid];
    if (i !== undefined) {
      matrix[i][rank]++;
      studentsByCell[i][rank].push({
        name: r.name,
        email: r.email,
        submittedAt: r.submittedAt,
      });
    }
  }));
  const max = Math.max(1, ...matrix.flat());
  const selectedProject = selectedCell ? projects[selectedCell.projectIndex] : null;
  const selectedStudents = selectedCell
    ? studentsByCell[selectedCell.projectIndex][selectedCell.rankIndex]
    : [];

  return (
    <div className="heatmap-layout">
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
                const isSelected = selectedCell?.projectIndex === r && selectedCell?.rankIndex === c;
                return (
                  <button
                    key={c}
                    className={"h-cell" + (isSelected ? " is-selected" : "")}
                    data-v={v}
                    type="button"
                    style={{ background: bg, color: t > 0.5 ? "white" : "var(--ink-soft)" }}
                    title={`${p.title} -> rank #${c + 1}: ${v}`}
                    aria-pressed={isSelected}
                    aria-label={`${v} student${v === 1 ? "" : "s"} ranked ${p.title} number ${c + 1}`}
                    onClick={() => setSelectedCell(isSelected ? null : { projectIndex: r, rankIndex: c })}
                  >
                    {v || ""}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <aside className="heatmap-detail" aria-live="polite">
        {selectedCell ? (
          <>
            <div className="heatmap-detail-head">
              <div>
                <p className="field-label">Selected square</p>
                <h3>Rank #{selectedCell.rankIndex + 1}</h3>
              </div>
              <button className="ann-btn" onClick={() => setSelectedCell(null)}>Clear</button>
            </div>
            <p className="heatmap-project-title">{selectedProject?.title}</p>
            <div className="heatmap-student-list">
              {selectedStudents.length > 0 ? selectedStudents.map((student) => (
                <div key={student.email} className="heatmap-student-card">
                  <strong>{student.name || student.email}</strong>
                  <span className="mono">{student.email}</span>
                </div>
              )) : (
                <div className="recipient-empty">No students selected this project at rank #{selectedCell.rankIndex + 1}.</div>
              )}
            </div>
          </>
        ) : (
          <div className="heatmap-detail-empty">
            <p className="field-label">Cell details</p>
            <h3>Click a square</h3>
            <p>Student names and emails for that project/rank combination will appear here.</p>
          </div>
        )}
      </aside>
    </div>
  );
};

const teamSaveErrorMessage = (error) => {
  if (error?.code === "42P01" || /cohort_team_members/i.test(error?.message || "")) {
    return "Could not save yet. The team assignments table is not ready in the live database.";
  }
  return `Could not save teams: ${error?.message || "unknown live data error"}`;
};

const TeamsView = ({ currentYear, projects, responses, students, teamMemberRows, setTeamMemberRows, teamRowsError, onDraftStateChange }) => {
  const [seed, setSeed] = React.useState(0);
  const [teams, setTeams] = React.useState(null);
  const [draggedStudent, setDraggedStudent] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);
  const [matchingMode, setMatchingMode] = React.useState(DEFAULT_MATCHING_MODE);
  const [teamSource, setTeamSource] = React.useState("auto");
  const [showSavedRoster, setShowSavedRoster] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState("");
  const liveResponseSignature = React.useMemo(() => responseSignature(responses), [responses]);
  const previousResponseSignatureRef = React.useRef(null);

  React.useEffect(() => {
    const previousSignature = previousResponseSignatureRef.current;
    if (previousSignature && previousSignature !== liveResponseSignature && showSavedRoster) {
      setShowSavedRoster(false);
      setSaveStatus("New rankings loaded; showing live auto preview.");
    }
    previousResponseSignatureRef.current = liveResponseSignature;
  }, [liveResponseSignature, showSavedRoster]);

  React.useEffect(() => {
    onDraftStateChange?.(dirty || saving);
    return () => onDraftStateChange?.(false);
  }, [dirty, saving, onDraftStateChange]);

  React.useEffect(() => {
    const autoResult = buildTeams({ projects, responses, students, seed, mode: matchingMode });
    const savedStudentRows = (teamMemberRows || []).filter((row) => row.member_type === "student");

    if (savedStudentRows.length && showSavedRoster) {
      const savedTeams = rowsToTeamMap({ projects, rows: teamMemberRows, responses, students });
      setTeams(withTeamSummary({ ...autoResult, teams: savedTeams }, projects, responses));
      setTeamSource("saved");
      setDirty(false);
      return;
    }

    setTeams(autoResult);
    setTeamSource("auto");
    setDirty(false);
  }, [projects, responses, students, seed, teamMemberRows, showSavedRoster, matchingMode]);

  if (!teams) return null;

  const matchingOption = matchingOptionFor(matchingMode);
  const missLabel = teams.topChoiceWindow === 1 ? "Missed top choice" : `Moved below top-${teams.topChoiceWindow}`;
  const sizeErrors = activeTeamSizeErrors(teams.teams, teams.minTeamSize, teams.maxTeamSize);
  const activeStudentCount = Object.values(teams.teams).reduce((total, roster) => total + roster.length, 0);
  const canSave = activeStudentCount > 0 && !saving && sizeErrors.length === 0 && (dirty || teamSource !== "saved");
  const hasSavedRoster = (teamMemberRows || []).some((row) => row.member_type === "student");

  const selectMatchingMode = (nextMode) => {
    if (nextMode === matchingMode || saving) return;
    const nextOption = matchingOptionFor(nextMode);
    setMatchingMode(nextMode);
    setShowSavedRoster(false);
    setSaveStatus(`Showing ${nextOption.label} auto preview.`);
  };

  const moveStudent = (email, fromProjectId, toProjectId) => {
    if (fromProjectId === toProjectId) return;
    if ((teams.teams[toProjectId] || []).length >= teams.maxTeamSize) return;
    const next = JSON.parse(JSON.stringify(teams.teams));
    const fromList = next[fromProjectId] || [];
    const i = fromList.findIndex(s => s.email === email);
    if (i < 0) return;
    const [stu] = fromList.splice(i, 1);
    // Recompute prefRank for new project
    const r = responses.find(x => x.email === email);
    if (r) stu.prefRank = r.ranking.indexOf(toProjectId);
    stu.locked = false;
    next[toProjectId].push(stu);
    setTeams(withTeamSummary({ ...teams, teams: next }, projects, responses));
    setDirty(true);
    setTeamSource("manual");
    setSaveStatus("Unsaved manual changes.");
  };

  const saveFinalTeams = async () => {
    if (!isSupabaseConfigured) {
      setSaveStatus("The live database is not configured for this build, so the final teams cannot be saved yet.");
      return;
    }
    if (sizeErrors.length) {
      setSaveStatus("Fix team sizes before saving. Every active project needs 2-3 students.");
      return;
    }

    setSaving(true);
    setSaveStatus("Saving final team assignments...");

    const rows = buildSavedTeamRows({
      projects,
      teams: teams.teams,
      cohortYear: currentYear,
      assignedByEmail: INSTRUCTOR_EMAIL,
    });

    const { error: deleteError } = await supabase
      .from("cohort_team_members")
      .delete()
      .eq("cohort_year", currentYear);

    if (deleteError) {
      setSaving(false);
      setSaveStatus(teamSaveErrorMessage(deleteError));
      return;
    }

    const { error: insertError } = await supabase
      .from("cohort_team_members")
      .insert(rows);

    setSaving(false);

    if (insertError) {
      setSaveStatus(teamSaveErrorMessage(insertError));
      return;
    }

    const lockedTeams = Object.fromEntries(
      Object.entries(teams.teams).map(([projectId, roster]) => [
        projectId,
        roster.map((student) => ({ ...student, locked: true })),
      ])
    );
    const lockedRows = buildSavedTeamRows({
      projects,
      teams: lockedTeams,
      cohortYear: currentYear,
      assignedByEmail: INSTRUCTOR_EMAIL,
    });

    setTeams(withTeamSummary({ ...teams, teams: lockedTeams }, projects, responses));
    setTeamMemberRows(lockedRows);
    setShowSavedRoster(true);
    setTeamSource("saved");
    setDirty(false);
    setSaveStatus(`Saved ${activeStudentCount} students and ${rows.filter((row) => row.member_type === "mentor" && row.person_email).length} mentors to the live database.`);
  };

  return (
    <div>
      <div className="teams-controls">
        <div className="field">
          <span className="field-label">Team size</span>
          <div className="mono" style={{ fontSize: 13 }}>2–3 students</div>
        </div>
        <div className="field matching-field">
          <span className="field-label">Matching logic</span>
          <div className="matching-segments" role="radiogroup" aria-label="Matching logic">
            {MATCHING_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={matchingMode === option.id}
                className={"matching-segment" + (matchingMode === option.id ? " is-active" : "")}
                onClick={() => selectMatchingMode(option.id)}
                disabled={saving}
                data-spark
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Preference rule</span>
          <div className="mono" style={{ fontSize: 13 }}>{matchingOption.description}</div>
        </div>
        <div className="field">
          <span className="field-label">Source</span>
          <div className="mono" style={{ fontSize: 13 }}>{teamSource === "saved" ? "Saved final roster" : teamSource === "manual" ? "Manual draft" : `${matchingOption.label} auto preview`}</div>
        </div>
        {hasSavedRoster && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setShowSavedRoster((value) => !value);
              setSaveStatus(showSavedRoster
                ? "Showing live auto preview from current ranking submissions."
                : "Showing saved final roster from the live database.");
            }}
            disabled={saving}
            data-spark
          >
            {showSavedRoster ? "Use live auto preview" : "View saved roster"}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => { setSaveStatus(""); setSeed(s => s + 1); }} disabled={teamSource === "saved" || saving} data-spark>
          {teamSource === "saved" ? "Roster locked" : "Re-roll"}
        </button>
        <button className="btn btn-primary" onClick={saveFinalTeams} disabled={!canSave} data-spark>
          {saving ? "Saving..." : dirty || teamSource !== "saved" ? "Save final teams" : "Saved"}
        </button>
        <div className="satisfaction">
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Cohort satisfaction</div>
            <div className="big">{teams.satisfaction}%</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>{missLabel}</div>
            <div className="big" style={{ color: teams.unhappyCount > 4 ? "var(--pink-ink)" : "var(--olive-ink)" }}>{teams.unhappyCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Inactive projects</div>
            <div className="big" style={{ color: "var(--muted)" }}>{teams.inactiveProjectIds.length}</div>
          </div>
        </div>
      </div>
      {(saveStatus || teamRowsError || sizeErrors.length > 0) && (
        <div className={"team-save-status" + (sizeErrors.length ? " is-warning" : "")}>
          {sizeErrors.length > 0
            ? `Cannot save yet: ${sizeErrors.length} active team${sizeErrors.length === 1 ? " has" : "s have"} fewer than ${teams.minTeamSize} students.`
            : saveStatus || teamRowsError}
        </div>
      )}
      {!responses.length && !saveStatus && !teamRowsError && (
        <div className="team-save-status">
          Waiting for submitted rankings before creating the first auto-match preview.
        </div>
      )}

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
                {roster.map(s => {
                  const preferenceLabel = s.prefRank >= 0 ? `#${s.prefRank + 1}` : "Unranked";
                  const markerLabel = s.honorsProject ? `${preferenceLabel} · Honors` : preferenceLabel;

                  return (
                    <li
                      key={s.email}
                      draggable
                      className={(draggedStudent?.email === s.email ? "dragging" : "") + (s.locked ? " is-locked" : "")}
                      onDragStart={() => setDraggedStudent({ email: s.email, fromProject: p.id })}
                      onDragEnd={() => setDraggedStudent(null)}
                      title={s.honorsProject ? "Honors default; drag to override manually" : s.locked ? "Saved final assignment; drag to revise" : "Drag for manual override"}
                    >
                      <span>{s.name}</span>
                      <span className="pref-marker">{markerLabel}</span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

const EmailDraftView = ({ data, projects, responses, students, teamMemberRows, onAnnouncementsChange }) => {
  const announcements = React.useMemo(
    () => sortAnnouncements((data.announcements || []).filter(item => item.cohortYear === data.currentYear)),
    [data.announcements, data.currentYear]
  );
  const audienceOptions = React.useMemo(() => {
    const baseOptions = data.announcementAudiences || [
      { id: "all", label: "All students + mentors" },
      { id: "students", label: "All students" },
      { id: "honors_students", label: "Honors students" },
      { id: "mentors", label: "All mentors" },
      { id: "team", label: "Selected team: students + mentors" },
      { id: "team_students", label: "Selected team students" },
      { id: "team_mentors", label: "Selected team mentors" },
    ];
    if (baseOptions.some((option) => option.id === "missing_students")) return baseOptions;

    const options = [...baseOptions];
    const studentsIndex = options.findIndex((option) => option.id === "students");
    options.splice(studentsIndex >= 0 ? studentsIndex + 1 : options.length, 0, {
      id: "missing_students",
      label: "Students missing poll response",
    });
    return options;
  }, [data.announcementAudiences]);
  const defaultSource = announcements[0]?.id || CUSTOM_DRAFT_ID;
  const initialDraft = draftFromAnnouncement(announcements[0], data.currentYear);

  const [audience, setAudience] = React.useState("all");
  const [projectId, setProjectId] = React.useState(projects[0]?.id || "");
  const [sourceId, setSourceId] = React.useState(defaultSource);
  const [subject, setSubject] = React.useState(initialDraft.subject);
  const [body, setBody] = React.useState(initialDraft.body);
  const [status, setStatus] = React.useState("");
  const [recipientFilter, setRecipientFilter] = React.useState("all");
  const [rewriting, setRewriting] = React.useState(false);
  const [postingNews, setPostingNews] = React.useState(false);

  const teams = React.useMemo(
    () => buildTeams({ projects, responses, students, seed: 0 }),
    [projects, responses, students]
  );
  const fallbackStudentRecipients = React.useMemo(
    () => responses.map((response) => ({
      name: response.name,
      email: response.email,
      honorsProject: null,
    })),
    [responses]
  );
  const emailStudents = students.length ? students : fallbackStudentRecipients;
  const responseEmailSet = React.useMemo(
    () => new Set(responses.map((response) => normalizeEmail(response.email))),
    [responses]
  );

  const project = projects.find((p) => p.id === projectId);
  const audienceLabel = audienceOptions.find((option) => option.id === audience)?.label || "Selected group";
  const hasSavedTeams = (teamMemberRows || []).some((row) => row.member_type === "student");
  const teamRecipientSource = hasSavedTeams ? "Saved team assignments" : "Current auto-match preview";

  const recipients = React.useMemo(() => {
    const studentRecipients = emailStudents.map((student) => ({ name: student.name, email: student.email, role: "student" }));
    const honorsRecipients = emailStudents
      .filter((student) => student.honorsProject)
      .map((student) => ({ name: student.name, email: student.email, role: "student" }));
    const missingStudentRecipients = students
      .filter((student) => student.email && !responseEmailSet.has(normalizeEmail(student.email)))
      .map((student) => ({ name: student.name, email: student.email, role: "student" }));
    const mentorRecipients = projects.flatMap(mentorsForProject);
    const teamStudents = hasSavedTeams
      ? peopleFromTeamRows(teamMemberRows || [], projectId, "student")
      : (teams.teams[projectId] || []).map((student) => ({
        name: student.name,
        email: student.email,
        role: "student",
      }));
    const teamMentors = hasSavedTeams
      ? peopleFromTeamRows(teamMemberRows || [], projectId, "mentor")
      : mentorsForProject(project);

    if (audience === "students") return uniqueRecipients(studentRecipients);
    if (audience === "missing_students") return uniqueRecipients(missingStudentRecipients);
    if (audience === "honors_students") return uniqueRecipients(honorsRecipients);
    if (audience === "mentors") return uniqueRecipients(mentorRecipients);
    if (audience === "team_students") return uniqueRecipients(teamStudents);
    if (audience === "team_mentors") return uniqueRecipients(teamMentors);
    if (audience === "team") return uniqueRecipients([...teamStudents, ...teamMentors]);
    return uniqueRecipients([...studentRecipients, ...mentorRecipients]);
  }, [audience, emailStudents, hasSavedTeams, project, projectId, projects, responseEmailSet, students, teamMemberRows, teams]);

  const studentRecipients = recipients.filter((person) => person.role === "student");
  const mentorRecipients = recipients.filter((person) => person.role === "mentor");
  const studentCount = studentRecipients.length;
  const mentorCount = mentorRecipients.length;
  const isTeamAudience = TEAM_AUDIENCES.has(audience);
  const selectedAnnouncement = announcements.find((item) => item.id === sourceId);
  const mailtoUrl = buildMailtoUrl({ recipients, subject, body });
  const visibleRecipientGroups = [
    { id: "student", title: "Students", people: studentRecipients },
    { id: "mentor", title: "Mentors", people: mentorRecipients },
  ].filter((group) => (
    recipientFilter === "all" ? group.people.length > 0 : group.id === recipientFilter
  ));

  React.useEffect(() => {
    if (recipientFilter === "student" && studentCount === 0) setRecipientFilter("all");
    if (recipientFilter === "mentor" && mentorCount === 0) setRecipientFilter("all");
  }, [mentorCount, recipientFilter, studentCount]);

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
    const link = document.createElement("a");
    link.href = mailtoUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus(`Opening your mail composer with ${recipients.length} BCC recipients. Review, choose the W&M account, then send.`);
  };

  const rewriteDraft = async () => {
    if (!isSupabaseConfigured) {
      setStatus("AI rewrite needs the live dashboard connection.");
      return;
    }
    if (!subject.trim() && !body.trim()) {
      setStatus("Write or select a draft before asking AI to rewrite it.");
      return;
    }

    setRewriting(true);
    setStatus("Rewriting draft...");
    const { data: rewrittenDraft, error } = await supabase.functions.invoke("rewrite-email", {
      body: {
        cohortYear: data.currentYear,
        audienceLabel,
        projectLabel: isTeamAudience ? projectLabel(project) : null,
        recipientCounts: {
          students: studentCount,
          mentors: mentorCount,
        },
        subject,
        body,
      },
    });
    setRewriting(false);

    if (error || rewrittenDraft?.error) {
      setStatus(rewrittenDraft?.error || await functionErrorMessage(error, "AI rewrite failed."));
      return;
    }
    if (!rewrittenDraft?.subject || !rewrittenDraft?.body) {
      setStatus("AI rewrite returned an incomplete draft.");
      return;
    }

    setSubject(rewrittenDraft.subject);
    setBody(rewrittenDraft.body);
    setStatus("AI rewrote the draft. Review it before opening Mail.");
  };

  const postAsNowNews = async () => {
    if (!isSupabaseConfigured) {
      setStatus("Live announcement posting is not configured.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setStatus("Add a subject and message before posting a news update.");
      return;
    }
    if (!window.confirm("Post this draft as the public Now update? It will replace the current pinned Now item.")) {
      return;
    }

    setPostingNews(true);
    setStatus("Posting Now update...");
    const { data: userData } = await supabase.auth.getUser();

    try {
      await postDraftAsNowAnnouncement({
        cohortYear: data.currentYear,
        subject,
        body,
        audienceLabel,
        createdByEmail: userData?.user?.email,
      });
      onAnnouncementsChange?.();
      setStatus("Posted as the Now update. The front page, Updates page, and news source list will refresh from the live announcement.");
    } catch (error) {
      setStatus(error?.message || "Could not post the Now update.");
    } finally {
      setPostingNews(false);
    }
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

          {isTeamAudience && (
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
          <button className="btn btn-pink" onClick={rewriteDraft} disabled={rewriting || (!subject.trim() && !body.trim())} data-spark>
            {rewriting ? "Rewriting..." : "Rewrite with AI"}
          </button>
          <button className="btn btn-primary" onClick={postAsNowNews} disabled={postingNews || (!subject.trim() || !body.trim())} data-spark>
            {postingNews ? "Posting..." : "Post as Now news"}
          </button>
          <button className="btn btn-primary" onClick={openMailDraft} disabled={!recipients.length} data-spark>
            Open in Mail
          </button>
          <button className="btn btn-ghost" onClick={() => copyText(recipients.map((person) => person.email).join(", "), "Recipient list")}>
            Copy recipients
          </button>
          <button className="btn btn-ghost" onClick={() => copyText(body, "Message body")}>
            Copy body
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
          <button
            className={"recipient-stat" + (recipientFilter === "all" ? " is-active" : "")}
            type="button"
            aria-pressed={recipientFilter === "all"}
            onClick={() => setRecipientFilter("all")}
          >
            <strong>{recipients.length}</strong> all
          </button>
          <button
            className={"recipient-stat" + (recipientFilter === "student" ? " is-active" : "")}
            type="button"
            aria-pressed={recipientFilter === "student"}
            onClick={() => setRecipientFilter("student")}
          >
            <strong>{studentCount}</strong> students
          </button>
          <button
            className={"recipient-stat" + (recipientFilter === "mentor" ? " is-active" : "")}
            type="button"
            aria-pressed={recipientFilter === "mentor"}
            onClick={() => setRecipientFilter("mentor")}
          >
            <strong>{mentorCount}</strong> mentors
          </button>
        </div>
        {isTeamAudience && (
          <div className="team-email-context">
            <span className="mono">{projectLabel(project)}</span>
            <span>{teamRecipientSource}</span>
          </div>
        )}
        <div className="recipient-list">
          {visibleRecipientGroups.map((group) => (
            <RecipientList key={group.id} title={group.title} people={group.people} />
          ))}
          {!recipients.length && <div className="recipient-empty">No recipients found for this selection.</div>}
          {recipients.length > 0 && visibleRecipientGroups.length === 0 && (
            <div className="recipient-empty">No {recipientFilter === "student" ? "students" : "mentors"} in this selection.</div>
          )}
        </div>
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

/* ── Announcements (Updates tab) ─────────────────────────────────── */

const ANN_COLUMNS = "id,cohort_year,slug,title,summary,body,resources,audience_label,label,pinned,display_order,event_date,publish_at,status,created_at,updated_at";

const BLANK = (cohortYear) => ({
  cohortYear,
  slug: "",
  title: "",
  summary: "",
  body: [],
  resources: [],
  audience: "",
  label: "",
  pinned: false,
  order: null,
  date: new Date().toISOString().slice(0, 10),
  status: "published",
});

const annToRow = (ann, instructorEmail) => ({
  cohort_year: ann.cohortYear,
  slug: ann.slug || ann.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `update-${Date.now()}`,
  title: ann.title,
  summary: ann.summary,
  body: ann.body,
  resources: ann.resources,
  audience_label: ann.audience || null,
  label: ann.label || null,
  pinned: Boolean(ann.pinned),
  display_order: ann.order != null ? Number(ann.order) : null,
  event_date: ann.date || null,
  publish_at: new Date().toISOString(),
  status: ann.status || "published",
  created_by_email: instructorEmail || null,
});

const bodyText = (body) => (Array.isArray(body) ? body.join("\n\n") : (body || ""));
const textToBody = (text) => text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

const ResourcesEditor = ({ value, onChange }) => {
  const add = () => onChange([...value, { label: "", kind: "Link", href: "" }]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const set = (i, field, val) => onChange(value.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  return (
    <div className="ann-resources-editor">
      {value.map((r, i) => (
        <div key={i} className="ann-resource-row">
          <input placeholder="Label" value={r.label} onChange={e => set(i, "label", e.target.value)} />
          <input placeholder="URL (https://...)" value={r.href || ""} onChange={e => set(i, "href", e.target.value)} />
          <button className="ann-res-remove" onClick={() => remove(i)} title="Remove">×</button>
        </div>
      ))}
      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={add}>+ Add resource</button>
    </div>
  );
};

const AnnForm = ({ value, onChange, onSave, onCancel, saving }) => {
  const set = (field, val) => onChange({ ...value, [field]: val });
  return (
    <div className="ann-form">
      <div className="ann-form-grid">
        <label className="ann-label">
          Title
          <input value={value.title} onChange={e => set("title", e.target.value)} placeholder="Update title" />
        </label>
        <label className="ann-label">
          Label <span className="ann-hint">(e.g. "Now", "May 13")</span>
          <input value={value.label} onChange={e => set("label", e.target.value)} placeholder="Short date/label" />
        </label>
        <label className="ann-label">
          Date
          <input type="date" value={value.date || ""} onChange={e => set("date", e.target.value)} />
        </label>
        <label className="ann-label">
          Status
          <select value={value.status} onChange={e => set("status", e.target.value)}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <label className="ann-label">
        Summary <span className="ann-hint">(first sentence shown in card)</span>
        <input value={value.summary} onChange={e => set("summary", e.target.value)} placeholder="One sentence summary" />
      </label>
      <label className="ann-label">
        Body paragraphs <span className="ann-hint">(separate paragraphs with a blank line)</span>
        <textarea
          className="ann-body-input"
          rows={6}
          value={bodyText(value.body)}
          onChange={e => set("body", textToBody(e.target.value))}
          placeholder={"First paragraph.\n\nSecond paragraph."}
        />
      </label>
      <label className="ann-label">
        Audience <span className="ann-hint">(optional)</span>
        <input value={value.audience} onChange={e => set("audience", e.target.value)} placeholder="e.g. All students" />
      </label>
      <div className="ann-form-row">
        <label className="ann-checkbox-label">
          <input type="checkbox" checked={value.pinned} onChange={e => set("pinned", e.target.checked)} />
          Pinned
        </label>
        <label className="ann-label" style={{ flex: 1 }}>
          Display order <span className="ann-hint">(lower = first, blank = auto)</span>
          <input
            type="number"
            value={value.order ?? ""}
            onChange={e => set("order", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="e.g. 1"
            style={{ width: 80 }}
          />
        </label>
      </div>
      <div className="ann-label">
        Resources
        <ResourcesEditor value={value.resources || []} onChange={v => set("resources", v)} />
      </div>
      <div className="ann-form-actions">
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !value.title.trim()}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
};

const AnnouncementsView = ({ data, onAnnouncementsChange }) => {
  const cohortYear = data.currentYear;
  const [items, setItems] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  const [newDraft, setNewDraft] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [importing, setImporting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true); setError("");
    const { data: rows, error: err } = await supabase
      .from("cohort_announcements")
      .select(ANN_COLUMNS)
      .eq("cohort_year", cohortYear)
      .order("display_order", { ascending: true, nullsFirst: false });
    if (err) { setError(err.message); setLoading(false); return; }
    setItems((rows || []).map(announcementFromRow));
    setLoading(false);
  }, [cohortYear]);

  React.useEffect(() => { load(); }, [load]);

  const handleSave = async (ann, isNew) => {
    setSaving(true); setError("");
    try {
      const row = annToRow(ann, INSTRUCTOR_EMAIL);
      let result;
      if (isNew) {
        result = await supabase.from("cohort_announcements").insert(row).select(ANN_COLUMNS).single();
      } else {
        result = await supabase.from("cohort_announcements").update(row).eq("id", ann.id).select(ANN_COLUMNS).single();
      }
      if (result.error) throw result.error;
      await load();
      onAnnouncementsChange?.();
      setEditingId(null); setEditDraft(null);
      setCreating(false); setNewDraft(null);
    } catch (err) {
      setError(err.message || "Save failed");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setSaving(true); setError("");
    const { error: err } = await supabase.from("cohort_announcements").delete().eq("id", id);
    if (err) { setError(err.message); setSaving(false); return; }
    setConfirmDelete(null);
    await load();
    onAnnouncementsChange?.();
    setSaving(false);
  };

  const handleImport = async () => {
    if (!isSupabaseConfigured) return;
    setImporting(true); setError("");
    const staticItems = (data.announcements || []).filter(a => a.cohortYear === cohortYear);
    try {
      for (const item of staticItems) {
        const row = staticAnnouncementToRow(item);
        await supabase.from("cohort_announcements").upsert(row, { onConflict: "cohort_year,slug" });
      }
      await load();
      onAnnouncementsChange?.();
    } catch (err) {
      setError(err.message || "Import failed");
    }
    setImporting(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({ ...item });
    setCreating(false); setNewDraft(null);
  };
  const startCreate = () => {
    setCreating(true);
    setNewDraft(BLANK(cohortYear));
    setEditingId(null); setEditDraft(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const cancelCreate = () => { setCreating(false); setNewDraft(null); };

  if (!isSupabaseConfigured) {
    return (
      <div className="ann-empty">
        <p>Supabase is not configured — announcements editing is only available with a live database.</p>
      </div>
    );
  }

  return (
    <div className="ann-view">
      <div className="ann-toolbar">
        <span className="ann-count">{items ? `${items.length} update${items.length !== 1 ? "s" : ""}` : "Loading…"}</span>
        <div className="ann-toolbar-actions">
          {items != null && items.length === 0 && (
            <button className="btn btn-ghost" onClick={handleImport} disabled={importing}>
              {importing ? "Importing…" : "Import from static data"}
            </button>
          )}
          <button className="btn btn-primary" onClick={startCreate} disabled={creating}>+ New update</button>
        </div>
      </div>

      {error && <div className="team-save-status is-warning">{error}</div>}

      {creating && newDraft && (
        <div className="ann-card ann-card-new">
          <div className="ann-card-head"><span className="ann-pill ann-pill-new">New</span></div>
          <AnnForm
            value={newDraft}
            onChange={setNewDraft}
            onSave={() => handleSave(newDraft, true)}
            onCancel={cancelCreate}
            saving={saving}
          />
        </div>
      )}

      {loading && <div className="team-save-status">Loading updates…</div>}

      {!loading && items && items.length === 0 && !creating && (
        <div className="ann-empty">
          <p>No updates in Supabase yet for <strong>{cohortYear}</strong>.</p>
          <p>Create one above, or import from the static data in data.js.</p>
        </div>
      )}

      {(items || []).map(item => (
        <div key={item.id} className={"ann-card" + (item.status !== "published" ? " ann-card-dim" : "") + (item.pinned ? " ann-card-pinned" : "")}>
          {editingId === item.id && editDraft ? (
            <>
              <div className="ann-card-head">
                <span className="ann-pill">{item.status}</span>
                {item.pinned && <span className="ann-pill ann-pill-pin">Pinned</span>}
                <span className="ann-editing-label">Editing</span>
              </div>
              <AnnForm
                value={editDraft}
                onChange={setEditDraft}
                onSave={() => handleSave(editDraft, false)}
                onCancel={cancelEdit}
                saving={saving}
              />
            </>
          ) : (
            <>
              <div className="ann-card-head">
                <span className="ann-pill">{item.status}</span>
                {item.pinned && <span className="ann-pill ann-pill-pin">Pinned</span>}
                {item.label && <span className="ann-date-label">{item.label}</span>}
                <span className="ann-date">{item.date}</span>
                <div className="ann-card-btns">
                  <button className="ann-btn" onClick={() => startEdit(item)}>Edit</button>
                  <button
                    className={"ann-btn ann-btn-del" + (confirmDelete === item.id ? " is-confirm" : "")}
                    onClick={() => confirmDelete === item.id ? handleDelete(item.id) : setConfirmDelete(item.id)}
                    onBlur={() => setConfirmDelete(null)}
                    disabled={saving}
                  >
                    {confirmDelete === item.id ? "Confirm delete" : "Delete"}
                  </button>
                </div>
              </div>
              <h3 className="ann-title">{item.title}</h3>
              <p className="ann-summary">{item.summary}</p>
              {item.body?.length > 0 && (
                <details className="ann-body-details">
                  <summary>Body ({item.body.length} paragraph{item.body.length !== 1 ? "s" : ""})</summary>
                  {item.body.map((p, i) => <p key={i}>{p}</p>)}
                </details>
              )}
              {item.resources?.length > 0 && (
                <div className="ann-resources">
                  {item.resources.map((r, i) => (
                    <span key={i} className="ann-resource-chip">
                      {r.href ? <a href={r.href} target="_blank" rel="noopener">{r.label}</a> : r.label}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const DashboardPage = ({ data, onNavigate, onAnnouncementsChange }) => {
  const [tab, setTab] = React.useState("distribution");
  const [responses, setResponses] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const [teamMemberRows, setTeamMemberRows] = React.useState([]);
  const [teamRowsError, setTeamRowsError] = React.useState("");
  const [dashboardError, setDashboardError] = React.useState("");
  const [loadingDashboard, setLoadingDashboard] = React.useState(true);
  const [syncingDashboard, setSyncingDashboard] = React.useState(false);
  const [autoRefreshPaused, setAutoRefreshPaused] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const hasLoadedDashboardRef = React.useRef(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      hasLoadedDashboardRef.current = true;
      setLoadingDashboard(false);
      setSyncingDashboard(false);
      return undefined;
    }

    let alive = true;
    const loadDashboard = async () => {
      const firstLoad = !hasLoadedDashboardRef.current;
      setLoadingDashboard(firstLoad);
      setSyncingDashboard(!firstLoad);
      setDashboardError("");
      setTeamRowsError("");

      let submissionResult;
      let allowedResult;
      let teamResult;

      try {
        [submissionResult, allowedResult, teamResult] = await Promise.all([
          supabase
            .from("ranking_submissions")
            .select("*")
            .eq("cohort_year", data.currentYear)
            .order("created_at", { ascending: true }),
          supabase
            .from("ranking_allowed_students")
            .select("*")
            .eq("cohort_year", data.currentYear)
            .order("student_name", { ascending: true }),
          supabase
            .from("cohort_team_members")
            .select("*")
            .eq("cohort_year", data.currentYear),
        ]);
      } catch (error) {
        if (!alive) return;
        setResponses([]);
        setStudents([]);
        setTeamMemberRows([]);
        setDashboardError(`Live dashboard data could not load: ${error?.message || "unknown error"}`);
        hasLoadedDashboardRef.current = true;
        setLoadingDashboard(false);
        setSyncingDashboard(false);
        return;
      }

      if (!alive) return;

      let normalizedResponses = [];
      let normalizedStudents = [];

      if (allowedResult.error) {
        setStudents([]);
        setDashboardError((previous) => [
          previous,
          dashboardReadError("Private student allowlist", allowedResult.error),
        ].filter(Boolean).join(" "));
      } else {
        normalizedStudents = (allowedResult.data || [])
          .map((row) => normalizeAllowedStudentRow(row, data.projects))
          .filter((student) => student.email);
        setStudents(normalizedStudents);
      }

      if (submissionResult.error) {
        setResponses([]);
        setDashboardError(dashboardReadError("Ranking submissions", submissionResult.error));
      } else {
        normalizedResponses = (submissionResult.data || [])
          .map((row) => normalizeSubmissionRow(row, data.projects))
          .filter((row) => row.email);

        if (!allowedResult.error && normalizedStudents.length) {
          const rosterEmails = new Set(normalizedStudents.map((student) => student.email));
          normalizedResponses = normalizedResponses.filter((response) => rosterEmails.has(response.email));
        }

        setResponses(normalizedResponses);
      }

      if (teamResult.error) {
        setTeamMemberRows([]);
        setTeamRowsError(teamSaveErrorMessage(teamResult.error));
      } else {
        const activeResponseEmails = new Set(normalizedResponses.map((response) => response.email));
        const rows = (teamResult.data || []).filter((row) => (
          row.member_type !== "student" || activeResponseEmails.has(normalizeEmail(row.person_email))
        ));
        const hiddenRows = (teamResult.data || []).length - rows.length;

        setTeamMemberRows(rows);
        if (hiddenRows > 0) {
          setTeamRowsError(`Hidden ${hiddenRows} saved team row${hiddenRows === 1 ? "" : "s"} for student${hiddenRows === 1 ? "" : "s"} no longer in the active ranking roster.`);
        }
      }

      hasLoadedDashboardRef.current = true;
      setLoadingDashboard(false);
      setSyncingDashboard(false);
    };

    loadDashboard();

    return () => {
      alive = false;
    };
  }, [data.currentYear, data.projects, refreshKey]);

  React.useEffect(() => {
    if (!isSupabaseConfigured || autoRefreshPaused) return undefined;
    const refreshTimer = window.setInterval(() => {
      setRefreshKey((key) => key + 1);
    }, 8000);
    return () => window.clearInterval(refreshTimer);
  }, [autoRefreshPaused]);

  const coverage = students.length
    ? `${Math.round((responses.length / students.length) * 100)}%`
    : "—";

  return (
    <div className="page">
      <section className="dashboard-hero">
        <div>
          <p className="kicker"><span className="dot">●</span> &nbsp; Instructor view · <YangLink>Prof. Ran Yang</YangLink></p>
          <h1>Cohort dashboard <span style={{ color: "var(--muted)", fontStyle: "italic" }}>2026·27</span></h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 580 }}>
            Live poll submissions power the ranking distribution, individual responses, conflict heatmap,
            auto team-making preview, saved final teams, and BCC email drafts.
          </p>
          <p className="construction-note">Instructor-only · private student data stays in the live database</p>
          <button className="btn btn-ghost" onClick={() => setRefreshKey((key) => key + 1)} disabled={loadingDashboard || syncingDashboard} style={{ marginTop: 12 }}>
            {loadingDashboard || syncingDashboard ? "Refreshing..." : "Refresh live data"}
          </button>
        </div>
        <Reveal as="dl" className="stats">
          <div><dt>Responses</dt><dd>{loadingDashboard ? "…" : responses.length}</dd></div>
          <div><dt>Awaiting</dt><dd>{loadingDashboard ? "…" : students.length ? Math.max(students.length - responses.length, 0) : "—"}</dd></div>
          <div><dt>Projects</dt><dd>{data.projects.length}</dd></div>
          <div><dt>Coverage</dt><dd><span className="pink">{loadingDashboard ? "…" : coverage}</span></dd></div>
        </Reveal>
      </section>

      {loadingDashboard && <div className="team-save-status">Loading live poll data...</div>}
      {dashboardError && <div className="team-save-status is-warning">{dashboardError}</div>}
      {!loadingDashboard && !dashboardError && !responses.length && (
        <div className="team-save-status">
          No live ranking submissions yet. The public poll can still accept responses while this dashboard waits.
        </div>
      )}

      <div className="dash-tabs" role="tablist">
        {[
          ["distribution", "Distribution"],
          ["heatmap", "Conflict heatmap"],
          ["students", "Student responses"],
          ["teams", "Auto team-making"],
          ["email", "Email drafts"],
          ["updates", "Updates"],
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
      {tab === "students" && (
        <StudentsView
          currentYear={data.currentYear}
          projects={data.projects}
          responses={responses}
          students={students}
        />
      )}
      {tab === "teams" && (
        <TeamsView
          currentYear={data.currentYear}
          projects={data.projects}
          responses={responses}
          students={students}
          teamMemberRows={teamMemberRows}
          setTeamMemberRows={setTeamMemberRows}
          teamRowsError={teamRowsError}
          onDraftStateChange={setAutoRefreshPaused}
        />
      )}
      {tab === "email" && (
        <EmailDraftView
          data={data}
          projects={data.projects}
          responses={responses}
          students={students}
          teamMemberRows={teamMemberRows}
          onAnnouncementsChange={onAnnouncementsChange}
        />
      )}
      {tab === "updates" && (
        <AnnouncementsView data={data} onAnnouncementsChange={onAnnouncementsChange} />
      )}
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
        <p className="archive-dev-note">Archive records are under development while earlier cohort details are being cleaned up.</p>
      </div>
    </section>
    <ArchiveView archive={data.archive} currentYear={currentYear} onSwitch={(y) => { setYear(y); onNavigate("catalog"); }} />
  </div>
);

export { ArchivePage, DashboardPage };
