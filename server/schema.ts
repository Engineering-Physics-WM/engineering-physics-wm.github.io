import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const rankingSubmissions = pgTable(
  "ranking_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    cohortYear: text("cohort_year").notNull(),
    studentName: text("student_name").notNull(),
    studentEmail: text("student_email").notNull(),
    notes: text("notes"),
    ranking: jsonb("ranking").$type<string[]>().notNull(),
    receiptCode: text("receipt_code").notNull(),
  },
  (table) => [
    uniqueIndex("ranking_one_response_per_student").on(
      table.cohortYear,
      sql`lower(${table.studentEmail})`
    ),
    check(
      "ranking_submissions_wm_email",
      sql`${table.studentEmail} ~* '^[^@[:space:]]+@wm\\.edu$'`
    ),
    check(
      "ranking_submissions_ranking_array",
      sql`jsonb_typeof(${table.ranking}) = 'array' and jsonb_array_length(${table.ranking}) > 0`
    ),
  ]
);

export const rankingAllowedStudents = pgTable(
  "ranking_allowed_students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    cohortYear: text("cohort_year").notNull(),
    studentEmail: text("student_email").notNull(),
    studentEmailNormalized: text("student_email_normalized").generatedAlwaysAs(
      sql`lower("student_email")`
    ),
    studentName: text("student_name"),
    honorsProjectId: text("honors_project_id"),
    honorsProjectNumber: integer("honors_project_number"),
    honorsProjectTitle: text("honors_project_title"),
  },
  (table) => [
    uniqueIndex("ranking_allowed_students_unique_email").on(
      table.cohortYear,
      table.studentEmailNormalized
    ),
    check(
      "ranking_allowed_students_wm_email",
      sql`${table.studentEmail} ~* '^[^@[:space:]]+@wm\\.edu$'`
    ),
  ]
);

export const rankingPollSettings = pgTable("ranking_poll_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  cohortYear: text("cohort_year").notNull().unique(),
  isOpen: boolean("is_open").notNull().default(true),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  closedMessage: text("closed_message").notNull(),
});

export const cohortAnnouncements = pgTable(
  "cohort_announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    cohortYear: text("cohort_year").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: jsonb("body")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    resources: jsonb("resources")
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    audienceLabel: text("audience_label"),
    label: text("label"),
    pinned: boolean("pinned").notNull().default(false),
    displayOrder: integer("display_order"),
    eventDate: date("event_date"),
    publishAt: timestamp("publish_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull().default("draft"),
    createdByEmail: text("created_by_email"),
  },
  (table) => [
    unique("cohort_announcements_unique_slug").on(table.cohortYear, table.slug),
    check(
      "cohort_announcements_status",
      sql`${table.status} in ('draft', 'published', 'archived')`
    ),
  ]
);

export const cohortTeamMembers = pgTable(
  "cohort_team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    cohortYear: text("cohort_year").notNull(),
    projectId: text("project_id").notNull(),
    projectNumber: integer("project_number"),
    personName: text("person_name").notNull(),
    personEmail: text("person_email"),
    memberType: text("member_type").notNull(),
    source: text("source"),
    locked: boolean("locked").notNull().default(false),
    sortOrder: integer("sort_order"),
    assignedByEmail: text("assigned_by_email"),
  },
  (table) => [
    uniqueIndex("cohort_team_members_unique_project_member")
      .on(table.cohortYear, table.projectId, sql`lower(${table.personEmail})`, table.memberType)
      .where(sql`${table.personEmail} is not null`),
    uniqueIndex("cohort_team_members_one_student_team")
      .on(table.cohortYear, sql`lower(${table.personEmail})`)
      .where(sql`${table.memberType} = 'student' and ${table.personEmail} is not null`),
    check("cohort_team_members_member_type", sql`${table.memberType} in ('student', 'mentor')`),
    check(
      "cohort_team_members_email_shape",
      sql`${table.personEmail} is null or ${table.personEmail} ~* '^[^@[:space:]]+@wm\\.edu$'`
    ),
  ]
);

export const announcementEmailJobs = pgTable("announcement_email_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  announcementId: uuid("announcement_id")
    .notNull()
    .references(() => cohortAnnouncements.id, { onDelete: "cascade" }),
  cohortYear: text("cohort_year").notNull(),
  audienceType: text("audience_type").notNull(),
  teamProjectId: text("team_project_id"),
  requestedByEmail: text("requested_by_email"),
  status: text("status").notNull().default("queued"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

export const schema = {
  rankingSubmissions,
  rankingAllowedStudents,
  rankingPollSettings,
  cohortAnnouncements,
  cohortTeamMembers,
  announcementEmailJobs,
};

export type RankingSubmission = typeof rankingSubmissions.$inferSelect;
export type AllowedStudent = typeof rankingAllowedStudents.$inferSelect;
export type PollSettings = typeof rankingPollSettings.$inferSelect;
export type Announcement = typeof cohortAnnouncements.$inferSelect;
export type TeamMember = typeof cohortTeamMembers.$inferSelect;
