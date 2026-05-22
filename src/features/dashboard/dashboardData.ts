import { rankSatisfaction } from "../teams/teamMatching";

import type {
  AllowedStudent,
  AllowedStudentRow,
  CohortYear,
  EmailAddress,
  PersonContact,
  ProjectId,
  ProjectRecord,
  RankingResponse,
  RankingSubmissionRow,
  TeamAssignment,
  TeamMap,
  TeamMatchingSummary,
  TeamMember,
  TeamRosterRow,
  TeamWarning,
} from "../../types/domain";

export const REGULAR_STUDENT_EMAILS = new Set<EmailAddress>(["saneeley@wm.edu"]);

export const normalizeEmail = (email: string | null | undefined): EmailAddress =>
  (email || "").trim().toLowerCase();

export const uniqueRecipients = (people: PersonContact[] = []) => {
  const seen = new Set<EmailAddress>();
  return people
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

export const projectNumber = (project: Pick<ProjectRecord, "num"> | null | undefined) =>
  `P${String(project?.num || 0).padStart(2, "0")}`;

export const projectLabel = (project: ProjectRecord | null | undefined) =>
  project ? `${projectNumber(project)} · ${project.title.split(":")[0]}` : "Selected project";

export const normalizeSubmissionRow = (
  row: RankingSubmissionRow,
  projects: ProjectRecord[]
): RankingResponse => {
  const projectIds = projects.map((project) => project.id);
  const seen = new Set<ProjectId>();
  const ranking = (Array.isArray(row.ranking) ? row.ranking : []).filter(
    (projectId): projectId is ProjectId => {
      if (typeof projectId !== "string" || !projectIds.includes(projectId) || seen.has(projectId)) {
        return false;
      }
      seen.add(projectId);
      return true;
    }
  );
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

export const normalizeAllowedStudentRow = (
  row: AllowedStudentRow,
  projects: ProjectRecord[]
): AllowedStudent => {
  const email = normalizeEmail(row.student_email);
  const honorsProject = REGULAR_STUDENT_EMAILS.has(email)
    ? null
    : projects.find(
        (project) =>
          project.id === row.honors_project_id ||
          (row.honors_project_number && project.num === Number(row.honors_project_number))
      );

  return {
    name: row.student_name || row.student_email || "Student",
    email,
    honorsProject: honorsProject
      ? {
          number: honorsProject.num,
          projectId: honorsProject.id,
          projectTitle: row.honors_project_title || honorsProject.title,
          lockedForMatching: true,
        }
      : null,
  };
};

export const mentorsForProject = (project: ProjectRecord | null | undefined) => {
  if (!project) return [];
  return uniqueRecipients([
    { name: project.advisor, email: project.advisorEmail, role: "mentor" },
    ...(project.coadvisors || []).map((person) => ({ ...person, role: "mentor" })),
  ]);
};

export const isActiveProject = (
  project: ProjectRecord | null | undefined,
  activeProjectIds?: ProjectId[]
) => project != null && (!activeProjectIds?.length || activeProjectIds.includes(project.id));

export const splitProjectMentors = (projects: ProjectRecord[], activeProjectIds?: ProjectId[]) => {
  const activeProjects = projects.filter((project) => isActiveProject(project, activeProjectIds));
  const inactiveProjects = projects.filter(
    (project) => !isActiveProject(project, activeProjectIds)
  );
  const activeMentors = uniqueRecipients(activeProjects.flatMap(mentorsForProject));
  const activeEmails = new Set(activeMentors.map((mentor) => mentor.email));
  const inactiveMentors = uniqueRecipients(inactiveProjects.flatMap(mentorsForProject)).filter(
    (mentor) => !activeEmails.has(mentor.email)
  );

  return { activeProjects, inactiveProjects, activeMentors, inactiveMentors };
};

export const projectMentorRows = (
  project: ProjectRecord,
  cohortYear: CohortYear,
  assignedByEmail: EmailAddress | null
): TeamRosterRow[] =>
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
  }));

type RowsToTeamMapArgs = {
  projects: ProjectRecord[];
  rows: TeamRosterRow[];
  responses: RankingResponse[];
  students?: AllowedStudent[];
};

export const rowsToTeamMap = ({
  projects,
  rows,
  responses,
  students = [],
}: RowsToTeamMapArgs): TeamMap => {
  const teams = Object.fromEntries(projects.map((project) => [project.id, []])) as TeamMap;
  const studentByEmail = Object.fromEntries(
    students.map((student) => [normalizeEmail(student.email), student])
  ) as Record<EmailAddress, AllowedStudent>;
  const responseByEmail = Object.fromEntries(
    responses.map((response) => [normalizeEmail(response.email), response])
  ) as Record<EmailAddress, RankingResponse>;

  rows
    .filter((row) => row.member_type === "student" && teams[row.project_id])
    .sort(
      (a, b) =>
        (a.project_number || 999) - (b.project_number || 999) ||
        (a.sort_order ?? 999) - (b.sort_order ?? 999)
    )
    .forEach((row) => {
      const email = normalizeEmail(row.person_email);
      const response = responseByEmail[email];
      teams[row.project_id].push({
        email: row.person_email || email,
        name: row.person_name,
        prefRank: response ? response.ranking.indexOf(row.project_id) : -1,
        locked: Boolean(row.locked),
        honorsProject: studentByEmail[email]?.honorsProject || null,
      });
    });

  return teams;
};

type BuildSavedTeamRowsArgs = {
  projects: ProjectRecord[];
  teams: TeamMap;
  cohortYear: CohortYear;
  assignedByEmail: EmailAddress | null;
};

export const buildSavedTeamRows = ({
  projects,
  teams,
  cohortYear,
  assignedByEmail,
}: BuildSavedTeamRowsArgs): TeamRosterRow[] =>
  projects.flatMap((project) => {
    const roster = teams[project.id] || [];
    const studentRows: TeamRosterRow[] = roster.map((student, index) => ({
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
    return [
      ...studentRows,
      ...(roster.length ? projectMentorRows(project, cohortYear, assignedByEmail) : []),
    ];
  });

export const activeTeamSizeErrors = (
  teams: TeamMap,
  minTeamSize: number,
  maxTeamSize: number
): Array<{ projectId: ProjectId; size: number }> =>
  Object.entries(teams)
    .filter(
      ([, roster]) =>
        roster.length > 0 && (roster.length < minTeamSize || roster.length > maxTeamSize)
    )
    .map(([projectId, roster]) => ({ projectId, size: roster.length }));

type TeamSnapshotSummaryArgs = {
  projects: ProjectRecord[];
  responses: RankingResponse[];
  teams: TeamMap;
  minTeamSize: number;
  maxTeamSize: number;
  topChoiceWindow: number;
};

export const summarizeTeamSnapshot = ({
  projects,
  responses,
  teams,
  minTeamSize,
  maxTeamSize,
  topChoiceWindow,
}: TeamSnapshotSummaryArgs) => {
  const assigned: Record<EmailAddress, TeamAssignment> = {};
  const responseByEmail = Object.fromEntries(
    responses.map((response) => [normalizeEmail(response.email), response])
  ) as Record<EmailAddress, RankingResponse>;

  Object.entries(teams).forEach(([projectId, roster]) => {
    roster.forEach((student: TeamMember) => {
      const email = normalizeEmail(student.email);
      const response = responseByEmail[email];
      const prefRank =
        Number.isFinite(student.prefRank) && student.prefRank >= 0
          ? student.prefRank
          : (response?.ranking.indexOf(projectId) ?? projects.length);
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
  const activeProjectIds = projects
    .map((project) => project.id)
    .filter((id) => (teams[id] || []).length > 0);
  const sizeWarnings = activeTeamSizeErrors(teams, minTeamSize, maxTeamSize).map(
    ({ projectId, size }): TeamWarning => ({ type: "team-size", projectId, size })
  );

  return {
    assigned,
    satisfaction: Math.round(avg * 100),
    unhappyCount: responses.filter(
      (response) => assigned[response.email]?.prefRank >= topChoiceWindow
    ).length,
    activeProjectIds,
    inactiveProjectIds: projects
      .map((project) => project.id)
      .filter((id) => (teams[id] || []).length === 0),
    warnings: sizeWarnings,
  };
};

export const withTeamSummary = (
  snapshot: TeamMatchingSummary,
  projects: ProjectRecord[],
  responses: RankingResponse[]
): TeamMatchingSummary => ({
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

export const peopleFromTeamRows = (
  rows: TeamRosterRow[],
  projectId: ProjectId,
  memberType: string
) =>
  uniqueRecipients(
    rows
      .filter((row) => row.project_id === projectId && row.member_type === memberType)
      .sort(
        (a, b) =>
          (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
          (a.person_name || "").localeCompare(b.person_name || "")
      )
      .map((row) => ({
        name: row.person_name,
        email: row.person_email,
        role: memberType,
      }))
  );
