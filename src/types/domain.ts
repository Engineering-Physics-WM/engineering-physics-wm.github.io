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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
