CREATE TABLE "announcement_email_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"cohort_year" text NOT NULL,
	"audience_type" text NOT NULL,
	"team_project_id" text,
	"requested_by_email" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "cohort_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cohort_year" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audience_label" text,
	"label" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"display_order" integer,
	"event_date" date,
	"publish_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_email" text,
	CONSTRAINT "cohort_announcements_unique_slug" UNIQUE("cohort_year","slug"),
	CONSTRAINT "cohort_announcements_status" CHECK ("cohort_announcements"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "cohort_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cohort_year" text NOT NULL,
	"project_id" text NOT NULL,
	"project_number" integer,
	"person_name" text NOT NULL,
	"person_email" text,
	"member_type" text NOT NULL,
	"source" text,
	"locked" boolean DEFAULT false NOT NULL,
	"sort_order" integer,
	"assigned_by_email" text,
	CONSTRAINT "cohort_team_members_member_type" CHECK ("cohort_team_members"."member_type" in ('student', 'mentor')),
	CONSTRAINT "cohort_team_members_email_shape" CHECK ("cohort_team_members"."person_email" is null or "cohort_team_members"."person_email" ~* '^[^@[:space:]]+@wm\.edu$')
);
--> statement-breakpoint
CREATE TABLE "ranking_allowed_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cohort_year" text NOT NULL,
	"student_email" text NOT NULL,
	"student_email_normalized" text GENERATED ALWAYS AS (lower("student_email")) STORED,
	"student_name" text,
	"honors_project_id" text,
	"honors_project_number" integer,
	"honors_project_title" text,
	CONSTRAINT "ranking_allowed_students_wm_email" CHECK ("ranking_allowed_students"."student_email" ~* '^[^@[:space:]]+@wm\.edu$')
);
--> statement-breakpoint
CREATE TABLE "ranking_poll_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cohort_year" text NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"closes_at" timestamp with time zone,
	"closed_message" text NOT NULL,
	CONSTRAINT "ranking_poll_settings_cohort_year_unique" UNIQUE("cohort_year")
);
--> statement-breakpoint
CREATE TABLE "ranking_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cohort_year" text NOT NULL,
	"student_name" text NOT NULL,
	"student_email" text NOT NULL,
	"notes" text,
	"ranking" jsonb NOT NULL,
	"receipt_code" text NOT NULL,
	CONSTRAINT "ranking_submissions_wm_email" CHECK ("ranking_submissions"."student_email" ~* '^[^@[:space:]]+@wm\.edu$'),
	CONSTRAINT "ranking_submissions_ranking_array" CHECK (jsonb_typeof("ranking_submissions"."ranking") = 'array' and jsonb_array_length("ranking_submissions"."ranking") > 0)
);
--> statement-breakpoint
ALTER TABLE "announcement_email_jobs" ADD CONSTRAINT "announcement_email_jobs_announcement_id_cohort_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."cohort_announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cohort_team_members_unique_project_member" ON "cohort_team_members" USING btree ("cohort_year","project_id",lower("person_email"),"member_type") WHERE "cohort_team_members"."person_email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "cohort_team_members_one_student_team" ON "cohort_team_members" USING btree ("cohort_year",lower("person_email")) WHERE "cohort_team_members"."member_type" = 'student' and "cohort_team_members"."person_email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_allowed_students_unique_email" ON "ranking_allowed_students" USING btree ("cohort_year","student_email_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_one_response_per_student" ON "ranking_submissions" USING btree ("cohort_year",lower("student_email"));