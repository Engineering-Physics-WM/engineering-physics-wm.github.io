import { supabase } from "./supabaseClient";

import type {
  InvestorComment,
  InvestorResult,
  InvestorGameActivityRow,
  InvestorGamePlayerRow,
  ProjectId,
} from "../types/domain";

export const INVESTOR_GAME_ID = "ep-investor-2026-2027";
export const GAME_COHORT_YEAR = "2026-2027";
export const INVESTMENT_BUDGET = 1_000_000;
export const INVESTMENT_STEP = 10_000;
export const PLAYER_NAME_MAX = 40;
export const PASSWORD_MIN = 3;
export const PASSWORD_MAX = 64;

/** Team project ids in the game. Must match supabase/investor-game.sql. */
export const GAME_PROJECT_IDS: readonly ProjectId[] = [
  "animal-crossing",
  "smr-heat-load",
  "irays-pupillometry",
  "usv-race-boat",
  "laser-optics",
  "soft-bio-robot",
];

export type AllocationMap = Record<ProjectId, number>;
type OwnTeam = ProjectId | null | undefined;
type SupabaseLikeError = { code?: string; message?: string };

export type GameStatus = {
  game_id: string;
  cohort_year: string;
  title: string;
  is_open: boolean;
  totals_visible: boolean;
  current_event: string;
  budget: number;
  project_ids: ProjectId[];
  accepting: boolean;
  event_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  server_now: string;
};

const notConfiguredError = (): SupabaseLikeError => ({
  message: "The live game is not configured.",
});

// ── Login input ───────────────────────────────────────────────────────────────

/** Collapse inner whitespace and trim, matching how the database matches names. */
export const cleanPlayerName = (value: string) => value.replace(/\s+/g, " ").trim();

export const validatePassword = (value: string) => {
  const length = [...value.trim()].length;
  return length < PASSWORD_MIN || length > PASSWORD_MAX
    ? `Passwords need ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`
    : null;
};

// ── Budget math ───────────────────────────────────────────────────────────────

/** Coerce any input to the nearest $10K step between 0 and the budget. */
export const sanitizeAmount = (value: unknown, budget = INVESTMENT_BUDGET) => {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(Math.round(amount / INVESTMENT_STEP) * INVESTMENT_STEP, budget);
};

/** Parse typed dollar text such as "250000", "$250,000", "250k", or "1m".
 *  Returns null when the text is not a dollar amount. */
export const parseDollarInput = (raw: string) => {
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/[$,\s]/g, "");
  if (!text) return 0;
  const match = text.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.round(Number(match[1]) * multiplier);
};

export const emptyAllocations = (projectIds: readonly ProjectId[]): AllocationMap =>
  Object.fromEntries(projectIds.map((id) => [id, 0]));

export const totalInvested = (allocations: AllocationMap) =>
  Object.values(allocations).reduce(
    (sum, amount) => sum + (Number.isFinite(amount) ? amount : 0),
    0
  );

/** Build a clean allocation map: unknown keys dropped, own team forced to zero, and the running
 *  total never past the budget. */
export const normalizeAllocations = (
  value: unknown,
  projectIds: readonly ProjectId[],
  ownTeamId: OwnTeam = null,
  budget = INVESTMENT_BUDGET
): AllocationMap => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const next = emptyAllocations(projectIds);
  let remaining = budget;
  for (const id of projectIds) {
    if (id === ownTeamId) continue;
    const amount = Math.min(sanitizeAmount(source[id], budget), remaining);
    next[id] = amount;
    remaining -= amount;
  }
  return next;
};

/** Largest amount this team can hold given what is invested elsewhere. Own team is always 0. */
export const maxForProject = (
  allocations: AllocationMap,
  projectId: ProjectId,
  ownTeamId: OwnTeam = null,
  budget = INVESTMENT_BUDGET
) =>
  projectId === ownTeamId
    ? 0
    : Math.max(0, budget - (totalInvested(allocations) - (allocations[projectId] || 0)));

/** Set one team's amount, clamped so the total never exceeds the budget. */
export const setAllocation = (
  allocations: AllocationMap,
  projectId: ProjectId,
  requested: unknown,
  ownTeamId: OwnTeam = null,
  budget = INVESTMENT_BUDGET
): AllocationMap => ({
  ...allocations,
  [projectId]: Math.min(
    sanitizeAmount(requested, budget),
    maxForProject(allocations, projectId, ownTeamId, budget)
  ),
});

export const validateAllocations = (
  allocations: AllocationMap,
  projectIds: readonly ProjectId[],
  ownTeamId: OwnTeam = null,
  budget = INVESTMENT_BUDGET
) => {
  for (const [id, amount] of Object.entries(allocations)) {
    if (!projectIds.includes(id)) return `Unknown team: ${id}.`;
    if (!Number.isInteger(amount) || amount < 0 || amount > budget) {
      return `Each investment must be a whole-dollar amount from $0 to ${formatDollars(budget)}.`;
    }
    if (id === ownTeamId && amount > 0) return "You cannot invest in your own team.";
    if (amount % INVESTMENT_STEP !== 0) return "Investments go in $10,000 steps.";
  }
  if (totalInvested(allocations) > budget) {
    return `Your total cannot be more than ${formatDollars(budget)}.`;
  }
  return null;
};

export type AllocationChange = { projectId: ProjectId; delta: number };

/** Per-team differences between two portfolios, in team order, skipping unchanged teams. */
export const describeChanges = (
  before: unknown,
  after: unknown,
  projectIds: readonly ProjectId[]
): AllocationChange[] => {
  const from = normalizeAllocations(before, projectIds, null, Number.MAX_SAFE_INTEGER);
  const to = normalizeAllocations(after, projectIds, null, Number.MAX_SAFE_INTEGER);
  return projectIds
    .map((projectId) => ({ projectId, delta: to[projectId] - from[projectId] }))
    .filter((change) => change.delta !== 0);
};

// ── Formatting ────────────────────────────────────────────────────────────────

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatDollars = (amount: number) => usd.format(amount);

const trimDecimal = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");

/** "$1M", "$250K", "$12.5K", "$900". */
export const formatCompactDollars = (amount: number) => {
  if (amount >= 1_000_000) return `$${trimDecimal(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `$${trimDecimal(amount / 1_000)}K`;
  return `$${Math.round(amount)}`;
};

// ── Instructor summary ────────────────────────────────────────────────────────

export type ProjectInvestmentSummary = {
  projectId: ProjectId;
  total: number;
  investors: number;
  teamPlayers: number;
};

export const summarizeInvestments = (
  rows: (Pick<InvestorGamePlayerRow, "allocations" | "team_project_id"> & {
    budget?: number | null;
  })[],
  projectIds: readonly ProjectId[],
  budget = INVESTMENT_BUDGET
) => {
  const projects: ProjectInvestmentSummary[] = projectIds.map((projectId) => ({
    projectId,
    total: 0,
    investors: 0,
    teamPlayers: 0,
  }));
  const byId = new Map(projects.map((project) => [project.projectId, project]));
  let capitalDeployed = 0;

  for (const row of rows) {
    const team = row.team_project_id ? byId.get(row.team_project_id) : undefined;
    if (team) team.teamPlayers += 1;
    const rowBudget = row.budget ?? budget;
    const allocations = normalizeAllocations(
      row.allocations,
      projectIds,
      row.team_project_id,
      rowBudget
    );
    for (const id of projectIds) {
      const amount = allocations[id];
      if (amount > 0) {
        const summary = byId.get(id)!;
        summary.total += amount;
        summary.investors += 1;
      }
    }
    capitalDeployed += totalInvested(allocations);
  }

  return {
    projects,
    playerCount: rows.length,
    capitalDeployed,
    capitalAvailable: rows.reduce((sum, row) => sum + (row.budget ?? budget), 0),
  };
};

// ── Live database: students ───────────────────────────────────────────────────

export const isMissingSetupError = (error: SupabaseLikeError | null | undefined) =>
  error?.code === "PGRST202" ||
  error?.code === "PGRST205" ||
  error?.code === "42P01" ||
  /could not find the (function|table)|does not exist|not set up/i.test(error?.message || "");

/** The stored session no longer matches a student (password reset, removed, or bad token). */
export const isSessionEndedError = (error: SupabaseLikeError | null | undefined) =>
  error?.code === "28000" || error?.code === "22P02";

export const fetchGameStatus = async (gameId: string) => {
  if (!supabase) return { game: null, error: notConfiguredError() };
  const { data, error } = await supabase.rpc("investor_game_status", { p_game_id: gameId });
  return { game: (data?.[0] as GameStatus | undefined) ?? null, error };
};

export type PlayerSession = {
  token: string;
  name: string;
  teamProjectId: ProjectId | null;
  isPractice: boolean;
  isInstructor: boolean;
  budget: number;
  allocations: unknown;
  savedAt: string | null;
};

export type LoginResult =
  | { status: "ok" | "wrong" | "locked"; player: PlayerSession | null; error?: never }
  | { error: SupabaseLikeError; status?: never; player?: never };

export const loginPlayer = async ({
  gameId,
  name,
  password,
}: {
  gameId: string;
  name: string;
  password: string;
}): Promise<LoginResult> => {
  if (!supabase) return { error: notConfiguredError() };
  const { data, error } = await supabase.rpc("investor_game_login", {
    p_game_id: gameId,
    p_name: cleanPlayerName(name),
    p_password: password.trim(),
  });
  if (error) return { error };
  const row = data?.[0];
  if (!row) return { error: { message: "The game did not respond. Try again." } };
  const player =
    row.status === "ok" && row.session_token && row.player_name
      ? {
          token: row.session_token,
          name: row.player_name,
          teamProjectId: row.team_project_id,
          isPractice: Boolean(row.is_practice),
          isInstructor: Boolean(row.is_instructor),
          budget: row.budget ?? INVESTMENT_BUDGET,
          allocations: row.allocations,
          savedAt: row.saved_at,
        }
      : null;
  return { status: row.status, player };
};

export const fetchSession = async (
  gameId: string,
  token: string
): Promise<{ player: PlayerSession | null; error: SupabaseLikeError | null }> => {
  if (!supabase) return { player: null, error: notConfiguredError() };
  const { data, error } = await supabase.rpc("investor_game_session", {
    p_game_id: gameId,
    p_session_token: token,
  });
  if (error) return { player: null, error };
  const row = data?.[0];
  return {
    player: row
      ? {
          token,
          name: row.player_name,
          teamProjectId: row.team_project_id,
          isPractice: row.is_practice,
          isInstructor: row.is_instructor,
          budget: row.budget ?? INVESTMENT_BUDGET,
          allocations: row.allocations,
          savedAt: row.saved_at,
        }
      : null,
    error: null,
  };
};

export type SaveResult =
  | { savedAt: string | null; changed: boolean; error?: never }
  | { error: SupabaseLikeError; savedAt?: never; changed?: never };

export const saveAllocations = async ({
  gameId,
  token,
  allocations,
}: {
  gameId: string;
  token: string;
  allocations: AllocationMap;
}): Promise<SaveResult> => {
  if (!supabase) return { error: notConfiguredError() };
  const { data, error } = await supabase.rpc("investor_game_save", {
    p_game_id: gameId,
    p_session_token: token,
    p_allocations: allocations,
  });
  if (error) return { error };
  const row = data?.[0];
  return { savedAt: row?.saved_at ?? null, changed: Boolean(row?.changed) };
};

export type TeamTotal = { projectId: ProjectId; total: number };

/** Public: one total per team. Empty when the instructor has hidden totals. */
export const fetchPublicTotals = async (gameId: string) => {
  if (!supabase) return { totals: [] as TeamTotal[], error: notConfiguredError() };
  const { data, error } = await supabase.rpc("investor_game_public_totals", { p_game_id: gameId });
  const totals: TeamTotal[] = (data ?? []).map((row) => ({
    projectId: row.project_id,
    total: Number(row.total_raised) || 0,
  }));
  return { totals, error };
};

// ── Live database: instructor only (row-level security blocks everyone else) ──

export type AdminPlayer = Pick<
  InvestorGamePlayerRow,
  | "id"
  | "display_name"
  | "team_project_id"
  | "is_practice"
  | "is_instructor"
  | "budget"
  | "allocations"
  | "total_invested"
  | "last_saved_at"
>;

export const fetchPlayers = async (gameId: string) => {
  if (!supabase) return { rows: [] as AdminPlayer[], error: notConfiguredError() };
  const { data, error } = await supabase
    .from("investor_game_players")
    .select(
      "id, display_name, team_project_id, is_practice, is_instructor, budget, allocations, total_invested, last_saved_at"
    )
    .eq("game_id", gameId)
    .eq("is_active", true)
    .order("display_name", { ascending: true });
  return { rows: (data ?? []) as unknown as AdminPlayer[], error };
};

export type AdminActivity = Omit<InvestorGameActivityRow, "game_id">;

export const fetchActivity = async (gameId: string) => {
  if (!supabase) return { rows: [] as AdminActivity[], error: notConfiguredError() };
  const rows: AdminActivity[] = [];
  // Page through the complete ledger; Supabase's default row cap must not hide older days.
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from("investor_game_activity")
      .select(
        "id, created_at, player_id, player_name, team_project_id, event_label, allocations_before, allocations_after, total_before, total_after"
      )
      .eq("game_id", gameId)
      .order("id", { ascending: false })
      .range(from, from + 499);
    if (error) return { rows: [], error };
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return { rows, error: null };
  }
};

export const setGameSettings = async (
  gameId: string,
  settings: { is_open?: boolean; totals_visible?: boolean; current_event?: string }
) => {
  if (!supabase) return { error: notConfiguredError() };
  const { data, error } = await supabase
    .from("investor_games")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("game_id", gameId)
    .select("game_id");
  if (error) return { error };
  if (!data?.length) {
    return {
      error: { message: "Nothing changed. Check that you are signed in as the instructor." },
    };
  }
  return { error: null };
};

export const deletePlayer = async (playerId: string) => {
  if (!supabase) return { error: notConfiguredError() };
  return supabase.rpc("investor_game_admin_archive_player", { p_player_id: playerId });
};

export const adminUpdatePlayer = async ({
  playerId,
  newPassword = null,
  teamProjectId = null,
}: {
  playerId: string;
  newPassword?: string | null;
  teamProjectId?: ProjectId | null;
}) => {
  if (!supabase) return { error: notConfiguredError() };
  const { error } = await supabase.rpc("investor_game_admin_update_player", {
    p_player_id: playerId,
    p_new_password: newPassword === null ? null : newPassword.trim(),
    p_team_project_id: teamProjectId,
  });
  return { error };
};

export const fetchEvents = async () => {
  if (!supabase) return { data: [], error: notConfiguredError() };
  return supabase.rpc("investor_game_events_list", { p_game_id: INVESTOR_GAME_ID });
};
export const fetchFeedback = async (token: string) => {
  if (!supabase) return { data: [], error: notConfiguredError() };
  const data: Omit<InvestorComment, "player_name">[] = [];
  for (let from = 0; ; from += 500) {
    const page = await supabase
      .rpc("investor_game_feedback", {
        p_game_id: INVESTOR_GAME_ID,
        p_session_token: token,
      })
      .range(from, from + 499);
    if (page.error) return { data: [], error: page.error };
    data.push(...(page.data ?? []));
    if (!page.data || page.data.length < 500) return { data, error: null };
  }
};
export const fetchMyResults = async (token: string) => {
  if (!supabase) return { data: [], error: notConfiguredError() };
  return supabase.rpc("investor_game_my_results", {
    p_game_id: INVESTOR_GAME_ID,
    p_session_token: token,
  });
};
export const saveComment = async (
  token: string,
  eventId: string,
  projectId: string,
  body: string
) => {
  if (!supabase) return { error: notConfiguredError() };
  return supabase.rpc("investor_game_save_comment", {
    p_game_id: INVESTOR_GAME_ID,
    p_session_token: token,
    p_event_id: eventId,
    p_project_id: projectId,
    p_body: body,
  });
};
export const updateEventWindow = async (eventId: string, startsAt: string, endsAt: string) => {
  if (!supabase) return { error: notConfiguredError() };
  return supabase.rpc("investor_game_admin_event", {
    p_event_id: eventId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });
};
export const fetchAdminArchive = async () => {
  if (!supabase) return { comments: [], results: [], error: notConfiguredError() };
  const events = await fetchEvents();
  if (events.error) return { comments: [], results: [], error: events.error };
  const ids = (events.data ?? []).map((e) => e.id);
  if (!ids.length) return { comments: [], results: [], error: null };
  type CommentRow = Omit<InvestorComment, "is_mine" | "event_label">;
  type Page<T> = { data: T[] | null; error: SupabaseLikeError | null } | null;
  const comments: CommentRow[] = [];
  const results: InvestorResult[] = [];
  let commentsDone: boolean = false;
  let resultsDone: boolean = false;
  for (let from = 0; !commentsDone || !resultsDone; from += 500) {
    const [commentPage, resultPage]: [Page<CommentRow>, Page<InvestorResult>] = await Promise.all([
      commentsDone
        ? null
        : supabase
            .from("investor_game_comments")
            .select("id, event_id, player_name, project_id, body, updated_at")
            .in("event_id", ids)
            .order("id", { ascending: false })
            .range(from, from + 499),
      resultsDone
        ? null
        : supabase
            .from("investor_game_results")
            .select("*")
            .in("event_id", ids)
            .order("event_id")
            .order("player_id")
            .range(from, from + 499),
    ]);
    const error = commentPage?.error || resultPage?.error;
    if (error) return { comments: [], results: [], error };
    comments.push(...(commentPage?.data ?? []));
    results.push(...(resultPage?.data ?? []));
    commentsDone = commentsDone || !commentPage?.data || commentPage.data.length < 500;
    resultsDone = resultsDone || !resultPage?.data || resultPage.data.length < 500;
  }
  return { comments, results, error: null };
};

/** ET is the course timezone, regardless of the viewer's browser timezone. */
export const courseDay = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const groupActivity = (rows: AdminActivity[], projectIds: readonly ProjectId[]) => {
  const days = new Map<
    string,
    Map<string, Map<string, { name: string; entries: (AdminActivity & { delta: number })[] }>>
  >();
  for (const entry of rows) {
    const day = courseDay(entry.created_at);
    if (!days.has(day)) days.set(day, new Map());
    const teams = days.get(day)!;
    for (const change of describeChanges(
      entry.allocations_before,
      entry.allocations_after,
      projectIds
    )) {
      if (!teams.has(change.projectId)) teams.set(change.projectId, new Map());
      const people = teams.get(change.projectId)!;
      if (!people.has(entry.player_id))
        people.set(entry.player_id, { name: entry.player_name || "Archived angel", entries: [] });
      people.get(entry.player_id)!.entries.push({ ...entry, delta: change.delta });
    }
  }
  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, teams]) => ({
      day,
      teams: [...teams].map(([projectId, people]) => ({
        projectId,
        people: [...people].map(([id, person]) => ({ id, ...person })),
      })),
    }));
};
