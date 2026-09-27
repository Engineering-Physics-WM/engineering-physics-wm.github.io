export type CohortYear = string;
export type EmailAddress = string;
export type ProjectId = string;

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PersonContact = {
  name?: string | null;
  email?: EmailAddress | null;
  affiliation?: string | null;
  role?: string | null;
};

export type ProjectRecord = {
  id: ProjectId;
  num: number;
  slug?: string;
  title: string;
  advisor: string;
  advisorEmail?: EmailAddress | null;
  affiliation?: string | null;
  coadvisors?: PersonContact[] | null;
  areas?: string[];
  pitch?: string | null;
  background?: string | null;
  workspace?: string | null;
  notes?: string | null;
};

export type CohortStatus = {
  label?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  activeProjectIds?: ProjectId[];
};

export type CohortData = {
  currentYear: CohortYear;
  shortYearLabel?: string;
  projects: ProjectRecord[];
  cohortStatus?: CohortStatus;
  rankingPoll?: {
    isClosed?: boolean;
    closedMessage?: string;
  };
  announcements?: Announcement[];
  staticAnnouncements?: Announcement[];
  announcementAudiences?: Array<{ id: string; label: string }>;
};

export type AnnouncementResource = {
  label?: string;
  kind?: string;
  href?: string;
  url?: string;
  page?: string;
};

export type AnnouncementRow = {
  id: string;
  cohort_year: CohortYear;
  slug: string | null;
  title: string;
  summary: string;
  body: Json | null;
  resources: Json | null;
  audience_label: string | null;
  label: string | null;
  pinned: boolean | null;
  display_order: number | null;
  event_date: string | null;
  publish_at: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Announcement = {
  id: string;
  cohortYear: CohortYear;
  slug?: string | null;
  order?: number | null;
  date?: string;
  label?: string;
  title: string;
  summary: string;
  body?: string[];
  resources?: AnnouncementResource[];
  audience?: string;
  pinned?: boolean;
  live?: boolean;
  status?: string;
};

export type Ranking = ProjectId[];

export type RankingSubmissionRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  cohort_year: CohortYear;
  student_name: string | null;
  student_email: EmailAddress;
  notes: string | null;
  ranking: Json;
  receipt_code: string;
};

export type RankingSubmissionPayload = {
  cohort_year: CohortYear;
  student_name: string;
  student_email: EmailAddress;
  notes: string | null;
  ranking: Ranking;
  receipt_code: string;
};

export type RankingResponse = {
  id?: string;
  name: string;
  email: EmailAddress;
  notes?: string;
  ranking: Ranking;
  submittedAt?: string | null;
  receiptCode?: string | null;
};

export type AllowedStudentRow = {
  id: string;
  created_at: string;
  cohort_year: CohortYear;
  student_email: EmailAddress;
  student_email_normalized?: EmailAddress;
  student_name: string | null;
  honors_project_id: ProjectId | null;
  honors_project_number: number | null;
  honors_project_title: string | null;
};

export type HonorsProjectAssignment = {
  number: number;
  projectId: ProjectId;
  projectTitle: string;
  lockedForMatching: boolean;
};

export type AllowedStudent = {
  name: string;
  email: EmailAddress;
  honorsProject: HonorsProjectAssignment | null;
};

export type PollSettingsRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  cohort_year: CohortYear;
  is_open: boolean;
  closes_at: string | null;
  closed_message: string;
};

export type TeamRosterRow = {
  id?: string;
  created_at?: string;
  updated_at?: string | null;
  cohort_year: CohortYear;
  project_id: ProjectId;
  project_number: number | null;
  person_name: string;
  person_email: EmailAddress | null;
  member_type: "student" | "mentor" | string;
  source: string | null;
  locked: boolean;
  sort_order: number | null;
  assigned_by_email: EmailAddress | null;
};

export type TeamMember = {
  email: EmailAddress;
  name: string;
  prefRank: number;
  locked: boolean;
  honorsProject: HonorsProjectAssignment | null;
};

export type TeamMap = Record<ProjectId, TeamMember[]>;

export type TeamAssignment = {
  project: ProjectId;
  prefRank: number;
  locked: boolean;
};

export type MatchingModeId = "top3" | "top1";

export type MatchingModeOption = {
  id: MatchingModeId;
  label: string;
  description: string;
  topChoiceWindow: number;
};

export type TeamWarning =
  | { type: "team-size"; projectId: ProjectId; size: number }
  | { type: "honors-over-capacity"; projectId: ProjectId; size: number }
  | { type: "honors-unassigned"; email: EmailAddress; projectId: ProjectId }
  | { type: "optimizer-unassigned"; size: number }
  | { type: string; projectId?: ProjectId; email?: EmailAddress; size?: number };

export type TeamMatchingSummary = {
  teams: TeamMap;
  assigned: Record<EmailAddress, TeamAssignment>;
  satisfaction: number;
  unhappyCount: number;
  activeProjectIds: ProjectId[];
  inactiveProjectIds: ProjectId[];
  warnings: TeamWarning[];
  minTeamSize: number;
  maxTeamSize: number;
  topChoiceWindow: number;
  matchingMode: MatchingModeId;
  matchingLabel: string;
};

export type DashboardSummary = {
  responseCount: number;
  allowedStudentCount: number;
  awaitingCount: number;
  projectCount: number;
  coveragePercent: number | null;
};

export type InvestorGameRow = {
  game_id: string;
  created_at?: string;
  updated_at?: string;
  cohort_year: CohortYear;
  title: string;
  is_open: boolean;
  totals_visible: boolean;
  current_event: string;
  budget: number;
  project_ids: ProjectId[];
};

/** Preset student login. The password hash and session token are never selected by the client. */
export type InvestorGamePlayerRow = {
  id: string;
  created_at: string;
  updated_at: string;
  game_id: string;
  display_name: string;
  name_key: string;
  team_project_id: ProjectId | null;
  is_practice: boolean;
  is_instructor: boolean;
  budget: number;
  allocations: Json;
  total_invested: number;
  last_saved_at: string | null;
  is_active: boolean;
};

export type InvestorGameActivityRow = {
  id: number;
  created_at: string;
  game_id: string;
  player_id: string;
  event_label: string;
  player_name: string | null;
  team_project_id: string | null;
  allocations_before: Json;
  allocations_after: Json;
  total_before: number;
  total_after: number;
};

export type InvestorEvent = {
  id: string;
  label: string;
  starts_at: string;
  ends_at: string;
  finalized_at: string | null;
  totals: Record<string, number> | null;
};
export type InvestorResult = {
  event_id: string;
  player_id: string;
  player_name: string;
  team_project_id: string | null;
  is_practice: boolean;
  is_instructor: boolean;
  budget: number;
  allocations: Json;
  total_invested: number;
};
export type InvestorComment = {
  id: number;
  event_id: string;
  event_label: string;
  player_name: string;
  project_id: string;
  body: string;
  updated_at: string;
  is_mine: boolean;
};

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type AppDatabase = {
  public: {
    Tables: {
      ranking_submissions: TableDefinition<
        RankingSubmissionRow,
        Omit<RankingSubmissionPayload, "ranking"> & { ranking: Json },
        Partial<Omit<RankingSubmissionPayload, "ranking"> & { ranking: Json }>
      >;
      ranking_allowed_students: TableDefinition<AllowedStudentRow>;
      ranking_poll_settings: TableDefinition<PollSettingsRow>;
      cohort_announcements: TableDefinition<AnnouncementRow>;
      cohort_team_members: TableDefinition<TeamRosterRow, TeamRosterRow, Partial<TeamRosterRow>>;
      investor_game_events: TableDefinition<InvestorEvent & { game_id: string }>;
      investor_game_results: TableDefinition<InvestorResult>;
      investor_game_comments: TableDefinition<
        Omit<InvestorComment, "is_mine" | "event_label"> & { player_id: string }
      >;
      investor_games: TableDefinition<InvestorGameRow>;
      investor_game_players: TableDefinition<InvestorGamePlayerRow>;
      investor_game_activity: TableDefinition<InvestorGameActivityRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_ranking_student_allowed: {
        Args: {
          check_cohort_year: CohortYear;
          check_student_email: EmailAddress;
        };
        Returns: boolean;
      };
      is_ranking_poll_open: {
        Args: {
          check_cohort_year: CohortYear;
        };
        Returns: boolean;
      };
      submit_ranking_submission: {
        Args: {
          submit_cohort_year: CohortYear;
          submit_student_name: string;
          submit_student_email: EmailAddress;
          submit_ranking: Json;
          submit_receipt_code: string;
        };
        Returns: Array<{
          submission_mode: "created" | "updated";
          saved_receipt_code: string;
        }>;
      };
      investor_game_status: {
        Args: { p_game_id: string };
        Returns: Array<
          Omit<InvestorGameRow, "created_at" | "updated_at"> & {
            accepting: boolean;
            event_id: string | null;
            starts_at: string | null;
            ends_at: string | null;
            server_now: string;
          }
        >;
      };
      investor_game_events_list: { Args: { p_game_id: string }; Returns: InvestorEvent[] };
      investor_game_feedback: {
        Args: { p_game_id: string; p_session_token: string };
        Returns: Omit<InvestorComment, "player_name">[];
      };
      investor_game_my_results: {
        Args: { p_game_id: string; p_session_token: string };
        Returns: InvestorResult[];
      };
      investor_game_save_comment: {
        Args: {
          p_game_id: string;
          p_session_token: string;
          p_event_id: string;
          p_project_id: string;
          p_body: string;
        };
        Returns: undefined;
      };
      investor_game_admin_event: {
        Args: { p_event_id: string; p_starts_at: string; p_ends_at: string };
        Returns: undefined;
      };
      investor_game_admin_archive_player: { Args: { p_player_id: string }; Returns: undefined };
      investor_game_login: {
        Args: { p_game_id: string; p_name: string; p_password: string };
        Returns: Array<{
          status: "ok" | "wrong" | "locked";
          player_name: string | null;
          team_project_id: ProjectId | null;
          is_practice: boolean | null;
          is_instructor: boolean | null;
          budget: number | null;
          session_token: string | null;
          allocations: Json | null;
          saved_at: string | null;
        }>;
      };
      investor_game_session: {
        Args: { p_game_id: string; p_session_token: string };
        Returns: Array<{
          player_name: string;
          team_project_id: ProjectId | null;
          is_practice: boolean;
          is_instructor: boolean;
          budget: number;
          allocations: Json;
          saved_at: string | null;
        }>;
      };
      investor_game_save: {
        Args: { p_game_id: string; p_session_token: string; p_allocations: Json };
        Returns: Array<{ saved_total: number; saved_at: string | null; changed: boolean }>;
      };
      investor_game_public_totals: {
        Args: { p_game_id: string };
        Returns: Array<{ project_id: ProjectId; total_raised: number }>;
      };
      investor_game_admin_update_player: {
        Args: {
          p_player_id: string;
          p_new_password?: string | null;
          p_team_project_id?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
