import type { AllowedStudent, Announcement, RankingSubmission, TeamMember } from "./schema";

const iso = (value: Date | string | null | undefined) =>
  value ? (value instanceof Date ? value.toISOString() : value) : null;

export const rankingSubmissionRow = (row: RankingSubmission) => ({
  id: row.id,
  created_at: iso(row.createdAt),
  updated_at: iso(row.updatedAt),
  cohort_year: row.cohortYear,
  student_name: row.studentName,
  student_email: row.studentEmail,
  notes: row.notes,
  ranking: row.ranking,
  receipt_code: row.receiptCode,
});

export const allowedStudentRow = (row: AllowedStudent) => ({
  id: row.id,
  created_at: iso(row.createdAt),
  cohort_year: row.cohortYear,
  student_email: row.studentEmail,
  student_email_normalized: row.studentEmailNormalized,
  student_name: row.studentName,
  honors_project_id: row.honorsProjectId,
  honors_project_number: row.honorsProjectNumber,
  honors_project_title: row.honorsProjectTitle,
});

export const announcementRow = (row: Announcement) => ({
  id: row.id,
  cohort_year: row.cohortYear,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  body: row.body,
  resources: row.resources,
  audience_label: row.audienceLabel,
  label: row.label,
  pinned: row.pinned,
  display_order: row.displayOrder,
  event_date: row.eventDate,
  publish_at: iso(row.publishAt),
  status: row.status,
  created_by_email: row.createdByEmail,
  created_at: iso(row.createdAt),
  updated_at: iso(row.updatedAt),
});

export const teamMemberRow = (row: TeamMember) => ({
  id: row.id,
  created_at: iso(row.createdAt),
  updated_at: iso(row.updatedAt),
  cohort_year: row.cohortYear,
  project_id: row.projectId,
  project_number: row.projectNumber,
  person_name: row.personName,
  person_email: row.personEmail,
  member_type: row.memberType,
  source: row.source,
  locked: row.locked,
  sort_order: row.sortOrder,
  assigned_by_email: row.assignedByEmail,
});
