const TEAM_MIN = 2;
const TEAM_MAX = 3;
const TOP_CHOICE_WINDOW = 3;
const SECONDARY_CHOICE_WINDOW = 5;
const DEFAULT_MATCHING_MODE = "top3";
const MATCHING_MODE_OPTIONS = [
  {
    id: "top3",
    label: "Top 3 balance",
    description: "Prioritize top 3 choices, then full ranking",
    topChoiceWindow: TOP_CHOICE_WINDOW,
  },
  {
    id: "top1",
    label: "Top 1 first",
    description: "Prioritize first choices, then ranking order",
    topChoiceWindow: 1,
  },
];

const matchingModeConfig = (mode) => (
  MATCHING_MODE_OPTIONS.find((option) => option.id === mode) ||
  MATCHING_MODE_OPTIONS.find((option) => option.id === DEFAULT_MATCHING_MODE)
);

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

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

const activeProjectCountCandidates = (projectCount, responseCount, lockedProjectCount) => {
  if (!responseCount || !projectCount) return [];
  const minimumViable = Math.ceil(responseCount / TEAM_MAX);
  const maximumViable = Math.floor(responseCount / TEAM_MIN);
  if (lockedProjectCount > maximumViable) return [lockedProjectCount];

  const first = Math.min(projectCount, maximumViable);
  const last = clamp(Math.max(lockedProjectCount, minimumViable), 0, first);
  const counts = [];
  for (let count = first; count >= last; count--) counts.push(count);
  return counts;
};

const prefRankFor = (response, projectId, projectCount) => {
  const rank = response.ranking.indexOf(projectId);
  return rank >= 0 ? rank : projectCount;
};

const preferenceUtility = (rank, projectCount, mode = DEFAULT_MATCHING_MODE) => {
  const normalizedRank = rank >= 0 ? rank : projectCount;
  const fullRanking = Math.max(0, projectCount - normalizedRank);

  if (matchingModeConfig(mode).id === "top1") {
    const first = normalizedRank === 0 ? 1 : 0;
    return (
      first * 10_000_000 +
      fullRanking * 1_000 -
      normalizedRank
    );
  }

  const top3 = normalizedRank < TOP_CHOICE_WINDOW ? 1 : 0;
  const first = normalizedRank === 0 ? 1 : 0;
  const top5 = normalizedRank < SECONDARY_CHOICE_WINDOW ? 1 : 0;

  return (
    top3 * 1_000_000 +
    first * 30_000 +
    top5 * 10_000 +
    fullRanking * 100 -
    normalizedRank
  );
};

const rankSatisfaction = (rank, projectCount) => {
  if (!Number.isFinite(rank) || rank < 0) return 0;
  const curve = [1, 0.92, 0.84, 0.72, 0.6, 0.46, 0.34, 0.24, 0.16];
  if (rank < curve.length) return curve[rank];
  return Math.max(0.08, 1 - rank / Math.max(projectCount, 1));
};

const subsetsOfProjectIds = (projectIds, count, lockedProjectIds) => {
  if (count < lockedProjectIds.size || count > projectIds.length) return [];
  if (count === 0) return [new Set()];

  const locked = new Set(lockedProjectIds);
  const flexible = projectIds.filter((id) => !locked.has(id));
  const need = count - locked.size;
  const sets = [];

  const walk = (start, picked) => {
    if (picked.length === need) {
      sets.push(new Set([...locked, ...picked]));
      return;
    }
    for (let i = start; i <= flexible.length - (need - picked.length); i++) {
      walk(i + 1, [...picked, flexible[i]]);
    }
  };

  walk(0, []);
  return sets;
};

const buildDemandMap = (projectIds, responses) => {
  const top3Demand = Object.fromEntries(projectIds.map((id) => [id, 0]));
  const top1Demand = Object.fromEntries(projectIds.map((id) => [id, 0]));
  const rankedDemand = Object.fromEntries(projectIds.map((id) => [id, 0]));

  responses.forEach((response) => {
    response.ranking.forEach((projectId, rank) => {
      if (projectId in rankedDemand) rankedDemand[projectId] += Math.max(0, projectIds.length - rank);
    });
    response.ranking.slice(0, TOP_CHOICE_WINDOW).forEach((projectId, index) => {
      if (projectId in top3Demand) top3Demand[projectId]++;
      if (index === 0 && projectId in top1Demand) top1Demand[projectId]++;
    });
  });

  return { top3Demand, top1Demand, rankedDemand };
};

const activeSetDemandScore = (activeSet, { top3Demand, top1Demand, rankedDemand }, projectIds, mode = DEFAULT_MATCHING_MODE) => {
  const isTop1Mode = matchingModeConfig(mode).id === "top1";
  return [...activeSet].reduce((total, id) => (
    total +
    (isTop1Mode
      ? (top1Demand[id] || 0) * 10_000 + (rankedDemand[id] || 0) * 10
      : (top3Demand[id] || 0) * 1000 + (top1Demand[id] || 0) * 50) -
    projectIds.indexOf(id)
  ), 0);
};

const top1ActiveSetCandidates = (projectIds, count, lockedProjectIds, demand) => {
  if (count < lockedProjectIds.size || count > projectIds.length) return [];
  const locked = new Set(lockedProjectIds);
  const need = count - locked.size;
  const flexible = projectIds
    .filter((id) => !locked.has(id))
    .sort((a, b) => (
      (demand.top1Demand[b] || 0) - (demand.top1Demand[a] || 0) ||
      (demand.rankedDemand[b] || 0) - (demand.rankedDemand[a] || 0) ||
      projectIds.indexOf(a) - projectIds.indexOf(b)
    ));

  if (need < 0 || need > flexible.length) return [];
  return [new Set([...locked, ...flexible.slice(0, need)])];
};

const addFlowEdge = (graph, from, to, cap, cost) => {
  const forward = { to, rev: graph[to].length, cap, cost, originalCap: cap };
  const reverse = { to: from, rev: graph[from].length, cap: 0, cost: -cost, originalCap: 0 };
  graph[from].push(forward);
  graph[to].push(reverse);
  return forward;
};

const minCostMaxFlow = (graph, source, sink, targetFlow) => {
  let flow = 0;
  let cost = 0;

  while (flow < targetFlow) {
    const dist = Array(graph.length).fill(Infinity);
    const parentNode = Array(graph.length).fill(-1);
    const parentEdge = Array(graph.length).fill(-1);
    dist[source] = 0;

    for (let pass = 0; pass < graph.length - 1; pass++) {
      let changed = false;
      graph.forEach((edges, node) => {
        if (!Number.isFinite(dist[node])) return;
        edges.forEach((edge, edgeIndex) => {
          if (edge.cap <= 0) return;
          const nextDist = dist[node] + edge.cost;
          if (nextDist >= dist[edge.to] - 1e-9) return;
          dist[edge.to] = nextDist;
          parentNode[edge.to] = node;
          parentEdge[edge.to] = edgeIndex;
          changed = true;
        });
      });
      if (!changed) break;
    }

    if (parentNode[sink] === -1) break;

    let add = targetFlow - flow;
    for (let node = sink, steps = 0; node !== source; node = parentNode[node], steps++) {
      if (node < 0 || steps > graph.length) return { flow, cost, failed: true };
      add = Math.min(add, graph[parentNode[node]][parentEdge[node]].cap);
    }
    for (let node = sink, steps = 0; node !== source; node = parentNode[node], steps++) {
      if (node < 0 || steps > graph.length) return { flow, cost, failed: true };
      const edge = graph[parentNode[node]][parentEdge[node]];
      edge.cap -= add;
      graph[edge.to][edge.rev].cap += add;
      cost += edge.cost * add;
    }
    flow += add;
  }

  return { flow, cost };
};

const optimizeForActiveSet = ({
  activeProjectIds,
  candidates,
  lockedRosters,
  projectCount,
  seed,
  mode,
}) => {
  const seatPlan = [];
  const projectNeeds = activeProjectIds.map((projectId) => {
    const lockedCount = (lockedRosters[projectId] || []).length;
    if (lockedCount > TEAM_MAX) return null;
    const requiredSeats = Math.max(0, TEAM_MIN - lockedCount);
    const optionalSeats = TEAM_MAX - lockedCount - requiredSeats;
    for (let i = 0; i < requiredSeats; i++) seatPlan.push({ projectId, required: true });
    for (let i = 0; i < optionalSeats; i++) seatPlan.push({ projectId, required: false });
    return {
      projectId,
      minNeed: requiredSeats,
      maxNeed: TEAM_MAX - lockedCount,
    };
  });

  if (projectNeeds.some((need) => !need)) return null;
  const totalMin = projectNeeds.reduce((total, need) => total + need.minNeed, 0);
  const totalMax = projectNeeds.reduce((total, need) => total + need.maxNeed, 0);
  if (candidates.length < totalMin || candidates.length > totalMax) return null;

  // Required seats encode the 2-student minimum; optional seats encode the 3-student cap.
  const requiredSeatBonus = 100_000_000;
  const source = 0;
  const studentOffset = 1;
  const seatOffset = studentOffset + candidates.length;
  const sink = seatOffset + seatPlan.length;
  const graph = Array.from({ length: sink + 1 }, () => []);
  const assignmentEdges = [];

  candidates.forEach((_, studentIndex) => {
    addFlowEdge(graph, source, studentOffset + studentIndex, 1, 0);
  });
  seatPlan.forEach((_, seatIndex) => {
    addFlowEdge(graph, seatOffset + seatIndex, sink, 1, 0);
  });
  candidates.forEach((response, studentIndex) => {
    seatPlan.forEach((seat, seatIndex) => {
      const rank = prefRankFor(response, seat.projectId, projectCount);
      const utility = preferenceUtility(rank, projectCount, mode) +
        (seat.required ? requiredSeatBonus : 0) -
        tieScore(`${response.email}:${seat.projectId}:${seatIndex}`, seed) / 1_000_000_000;
      const edge = addFlowEdge(
        graph,
        studentOffset + studentIndex,
        seatOffset + seatIndex,
        1,
        -utility
      );
      assignmentEdges.push({ edge, studentIndex, seatIndex });
    });
  });

  const result = minCostMaxFlow(graph, source, sink, candidates.length);
  if (result.failed || result.flow !== candidates.length) return null;

  const teams = Object.fromEntries(activeProjectIds.map((projectId) => [projectId, [...(lockedRosters[projectId] || [])]]));
  const filledRequiredSeats = new Set();
  assignmentEdges.forEach(({ edge, studentIndex, seatIndex }) => {
    if (edge.cap !== 0) return;
    const seat = seatPlan[seatIndex];
    const response = candidates[studentIndex];
    if (seat.required) filledRequiredSeats.add(seatIndex);
    teams[seat.projectId].push({
      email: response.email,
      name: response.name,
      prefRank: prefRankFor(response, seat.projectId, projectCount),
      locked: false,
      honorsProject: null,
    });
  });

  if (seatPlan.some((seat, index) => seat.required && !filledRequiredSeats.has(index))) return null;

  return { teams, score: -result.cost - filledRequiredSeats.size * requiredSeatBonus };
};

const summarizeTeams = ({ projects, responses, teams, assigned, warnings, mode = DEFAULT_MATCHING_MODE }) => {
  const projectIds = projects.map((project) => project.id);
  const projectCount = projects.length;
  const modeConfig = matchingModeConfig(mode);
  const satisfactionScores = responses.map((response) => {
    const result = assigned[response.email];
    return result ? rankSatisfaction(result.prefRank, projectCount) : 0;
  });
  const avg = satisfactionScores.length
    ? satisfactionScores.reduce((total, score) => total + score, 0) / satisfactionScores.length
    : 0;
  const activeTeamIds = projectIds.filter((id) => (teams[id] || []).length > 0);
  const sizeWarnings = activeTeamIds
    .filter((id) => teams[id].length < TEAM_MIN || teams[id].length > TEAM_MAX)
    .map((id) => ({ type: "team-size", projectId: id, size: teams[id].length }));

  return {
    teams,
    assigned,
    satisfaction: Math.round(avg * 100),
    unhappyCount: responses.filter((response) => assigned[response.email]?.prefRank >= modeConfig.topChoiceWindow).length,
    activeProjectIds: activeTeamIds,
    inactiveProjectIds: projectIds.filter((id) => (teams[id] || []).length === 0),
    warnings: [...warnings, ...sizeWarnings],
    minTeamSize: TEAM_MIN,
    maxTeamSize: TEAM_MAX,
    topChoiceWindow: modeConfig.topChoiceWindow,
    matchingMode: modeConfig.id,
    matchingLabel: modeConfig.label,
  };
};

export const buildTeams = ({ projects, responses, students = [], seed = 0, mode = DEFAULT_MATCHING_MODE }) => {
  const modeConfig = matchingModeConfig(mode);
  const projectIds = projects.map((project) => project.id);
  const emptyTeams = Object.fromEntries(projects.map((project) => [project.id, []]));
  const assigned = {};
  const warnings = [];
  const projectCount = projects.length;
  const studentByEmail = Object.fromEntries(students.map((student) => [normalizeEmail(student.email), student]));
  const lockedRosters = Object.fromEntries(projectIds.map((id) => [id, []]));
  const candidates = [];

  responses.forEach((response) => {
    const email = normalizeEmail(response.email);
    const student = studentByEmail[email];
    const honorsProjectId = student?.honorsProject?.projectId;

    if (honorsProjectId && projectIds.includes(honorsProjectId)) {
      const prefRank = prefRankFor(response, honorsProjectId, projectCount);
      const lockedStudent = {
        email: response.email,
        name: response.name,
        prefRank,
        locked: true,
        honorsProject: student.honorsProject,
      };
      lockedRosters[honorsProjectId].push(lockedStudent);
      assigned[response.email] = { project: honorsProjectId, prefRank, locked: true };
      return;
    }

    if (honorsProjectId) {
      warnings.push({ type: "honors-unassigned", email: response.email, projectId: honorsProjectId });
    }
    candidates.push(response);
  });

  const lockedProjectIds = new Set(
    projectIds.filter((projectId) => lockedRosters[projectId].length > 0)
  );
  lockedProjectIds.forEach((projectId) => {
    if (lockedRosters[projectId].length > TEAM_MAX) {
      warnings.push({ type: "honors-over-capacity", projectId, size: lockedRosters[projectId].length });
    }
  });

  if (!responses.length) {
    return summarizeTeams({ projects, responses, teams: emptyTeams, assigned, warnings, mode: modeConfig.id });
  }

  const demand = buildDemandMap(projectIds, responses);
  const stopAfterFirstViableTeamCount = modeConfig.id === DEFAULT_MATCHING_MODE;
  let best = null;

  for (const targetActiveCount of activeProjectCountCandidates(projectIds.length, responses.length, lockedProjectIds.size)) {
    const activeSets = (modeConfig.id === "top1"
      ? top1ActiveSetCandidates(projectIds, targetActiveCount, lockedProjectIds, demand)
      : subsetsOfProjectIds(projectIds, targetActiveCount, lockedProjectIds))
      .sort((a, b) => (
        activeSetDemandScore(b, demand, projectIds, modeConfig.id) -
        activeSetDemandScore(a, demand, projectIds, modeConfig.id)
      ));

    activeSets.forEach((activeSet) => {
      const activeProjectIds = projectIds.filter((id) => activeSet.has(id));
      const lockedScore = activeProjectIds.flatMap((id) => lockedRosters[id] || [])
        .reduce((total, student) => total + preferenceUtility(student.prefRank, projectCount, modeConfig.id), 0);
      const result = optimizeForActiveSet({
        activeProjectIds,
        candidates,
        lockedRosters,
        projectCount,
        seed,
        mode: modeConfig.id,
      });

      if (!result) return;
      const demandScore = activeSetDemandScore(activeSet, demand, projectIds, modeConfig.id);
      const totalScore = result.score + lockedScore + demandScore / 1_000_000;
      if (!best || totalScore > best.totalScore) best = { ...result, activeProjectIds, totalScore };
    });

    if (best && stopAfterFirstViableTeamCount) break;
  }

  if (!best) {
    warnings.push({ type: "optimizer-unassigned", size: candidates.length });
    return summarizeTeams({ projects, responses, teams: emptyTeams, assigned, warnings, mode: modeConfig.id });
  }

  const teams = Object.fromEntries(projects.map((project) => [project.id, best.teams[project.id] || []]));
  Object.entries(teams).forEach(([projectId, roster]) => {
    roster.forEach((student) => {
      assigned[student.email] = {
        project: projectId,
        prefRank: student.prefRank,
        locked: Boolean(student.locked),
      };
    });
  });

  return summarizeTeams({ projects, responses, teams, assigned, warnings, mode: modeConfig.id });
};

export { rankSatisfaction, TEAM_MAX, TEAM_MIN, TOP_CHOICE_WINDOW, DEFAULT_MATCHING_MODE, MATCHING_MODE_OPTIONS };
