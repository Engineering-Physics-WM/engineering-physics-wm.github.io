-- Template only. Do not commit real student names or emails.
-- Copy this file to an ignored private file, such as:
--   supabase/allowed-students-2026-2027.private.sql
-- Then replace the example rows and run the private file in Supabase SQL Editor.

insert into public.ranking_allowed_students (
  cohort_year,
  student_email,
  student_name,
  honors_project_id,
  honors_project_number,
  honors_project_title
)
values
  (
    '2026-2027',
    'student1@wm.edu',
    'Example Student One',
    null,
    null,
    null
  ),
  (
    '2026-2027',
    'student2@wm.edu',
    'Example Student Two',
    'animal-crossing',
    1,
    'Animal Crossing: Reengineering Effective Wildlife Crossing Structures At The Jamestown Dam'
  )
on conflict on constraint ranking_allowed_students_unique_email do update
set
  student_name = excluded.student_name,
  honors_project_id = excluded.honors_project_id,
  honors_project_number = excluded.honors_project_number,
  honors_project_title = excluded.honors_project_title;
