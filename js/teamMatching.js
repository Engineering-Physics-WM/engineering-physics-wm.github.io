const TEAM_MIN = 2;
const TEAM_MAX = 3;
const TOP_CHOICE_WINDOW = 3;

const hashSeed = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const tieScore = (value, seed) => hashSeed(`${seed}:${value}`);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const chooseActiveProjectCount = (projectCount, responseCount, lockedProjectCount) => {
  if (!responseCount || !projectCount) return 0;
  const minimumViable = Math.ceil(responseCount / TEAM_MAX);
  const maximumViable = Math.floor(responseCount / TEAM_MIN);
  const preferred = Math.min(projectCount, maximumViable);
  return clamp(Math.max(lockedProjectCount, preferred), minimumViable, maximumViable);
};

export const buildTeams = ({ projects, responses, students = [], seed = 0 }) => {
  const projectIds = projects.map(p => p.id);
  const teams = Object.fromEntries(projects.map(p => [p.id, []]));
  const assigned = {};
  const studentByEmail = Object.fromEntries(students.map(s => [s.email.toLowerCase(), s]));
  const warnings = [];

  const prefRankFor = (response, projectId) => {
    const rank = response.ranking.indexOf(projectId);
    return rank >= 0 ? rank : projects.length;
  };

  const addStudent = (projectId, response, { locked = false } = {}) => {
    if (!projectId || assigned[response.email] || !teams[projectId]) return false;
    if (!locked && teams[projectId].length >= TEAM_MAX) return false;
    const student = studentByEmail[response.email.toLowerCase()];
    const prefRank = prefRankFor(response, projectId);
    teams[projectId].push({
      email: response.email,
      name: response.name,
      prefRank,
      locked,
      honorsProject: student?.honorsProject || null,
    });
    assigned[response.email] = { project: projectId, prefRank, locked };
    return true;
  };

  responses.forEach(response => {
    const student = studentByEmail[response.email.toLowerCase()];
    const honorsProjectId = student?.honorsProject?.projectId;
    if (honorsProjectId && !addStudent(honorsProjectId, response, { locked: true })) {
      warnings.push({ type: "honors-unassigned", email: response.email, projectId: honorsProjectId });
    }
  });

  const top3Demand = Object.fromEntries(projectIds.map(id => [id, 0]));
  const top1Demand = Object.fromEntries(projectIds.map(id => [id, 0]));
  responses.forEach(response => {
    response.ranking.slice(0, TOP_CHOICE_WINDOW).forEach((projectId, index) => {
      if (projectId in top3Demand) top3Demand[projectId]++;
      if (index === 0 && projectId in top1Demand) top1Demand[projectId]++;
    });
  });

  const activeProjects = new Set(projectIds.filter(id => teams[id].length > 0));
  const targetActiveCount = chooseActiveProjectCount(projectIds.length, responses.length, activeProjects.size);
  projectIds
    .map((id, index) => ({ id, index, top3: top3Demand[id], top1: top1Demand[id] }))
    .sort((a, b) => b.top3 - a.top3 || b.top1 - a.top1 || a.index - b.index)
    .forEach(({ id }) => {
      if (activeProjects.size < targetActiveCount) activeProjects.add(id);
    });

  const orderedResponses = [...responses].sort((a, b) => {
    const aLocked = assigned[a.email]?.locked ? 1 : 0;
    const bLocked = assigned[b.email]?.locked ? 1 : 0;
    return aLocked - bLocked || tieScore(a.email, seed) - tieScore(b.email, seed) || a.name.localeCompare(b.name);
  });

  const unassigned = () => orderedResponses.filter(response => !assigned[response.email]);
  const bestForProject = (projectId) => unassigned()
    .map(response => ({ response, rank: prefRankFor(response, projectId) }))
    .sort((a, b) => (
      a.rank - b.rank ||
      tieScore(a.response.email, `${seed}:${projectId}`) - tieScore(b.response.email, `${seed}:${projectId}`) ||
      a.response.name.localeCompare(b.response.name)
    ))[0];

  const activeProjectIds = () => projectIds.filter(id => activeProjects.has(id));

  while (activeProjectIds().some(id => teams[id].length < TEAM_MIN) && unassigned().length) {
    const projectId = activeProjectIds()
      .filter(id => teams[id].length < TEAM_MIN)
      .sort((a, b) => (
        teams[a].length - teams[b].length ||
        top3Demand[b] - top3Demand[a] ||
        projectIds.indexOf(a) - projectIds.indexOf(b)
      ))[0];
    const pick = bestForProject(projectId);
    if (!pick) break;
    addStudent(projectId, pick.response);
  }

  for (const response of unassigned()) {
    const top3Seat = response.ranking
      .slice(0, TOP_CHOICE_WINDOW)
      .find(projectId => activeProjects.has(projectId) && teams[projectId].length < TEAM_MAX);
    if (top3Seat) addStudent(top3Seat, response);
  }

  for (const response of unassigned()) {
    const best = projectIds
      .filter(id => activeProjects.has(id) && teams[id].length < TEAM_MAX)
      .map(id => ({ id, rank: prefRankFor(response, id) }))
      .sort((a, b) => a.rank - b.rank || projectIds.indexOf(a.id) - projectIds.indexOf(b.id))[0];
    if (best) addStudent(best.id, response);
  }

  const satisfactionScores = responses.map(response => {
    const result = assigned[response.email];
    if (!result) return 0;
    if (result.prefRank === 0) return 1;
    if (result.prefRank === 1) return 0.8;
    if (result.prefRank === 2) return 0.6;
    return 0.25;
  });
  const avg = satisfactionScores.length
    ? satisfactionScores.reduce((total, score) => total + score, 0) / satisfactionScores.length
    : 0;
  const activeTeamIds = projectIds.filter(id => teams[id].length > 0);
  const sizeWarnings = activeTeamIds
    .filter(id => teams[id].length < TEAM_MIN || teams[id].length > TEAM_MAX)
    .map(id => ({ type: "team-size", projectId: id, size: teams[id].length }));

  return {
    teams,
    assigned,
    satisfaction: Math.round(avg * 100),
    unhappyCount: responses.filter(response => assigned[response.email]?.prefRank >= TOP_CHOICE_WINDOW).length,
    activeProjectIds: activeTeamIds,
    inactiveProjectIds: projectIds.filter(id => teams[id].length === 0),
    warnings: [...warnings, ...sizeWarnings],
    minTeamSize: TEAM_MIN,
    maxTeamSize: TEAM_MAX,
    topChoiceWindow: TOP_CHOICE_WINDOW,
  };
};

export { TEAM_MAX, TEAM_MIN, TOP_CHOICE_WINDOW };
