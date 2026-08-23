/* Typed content for the Syllabus & Schedule page.
 * Source of truth: EP_Capstone_Syllabus_Fall2026.tex and EP_Capstone_Schedule_Fall2026.tex.
 * Keep this in sync when the instructor revises either document. */

import { INSTRUCTOR_EMAIL, INSTRUCTOR_NAME } from "./config.js";

export interface InfoFact {
  label: string;
  value: string;
}

export interface Pillar {
  num: string;
  title: string;
  body: string;
}

export interface PolicySection {
  id: string;
  title: string;
  body: string[];
}

export type Season = "fall" | "spring";

export interface ScheduleRow {
  week: string;
  date: string;
  isoDate: string;
  topic: string;
  location: string;
  notes: string;
  kind?: "break" | "milestone" | "cancelled" | "tbd";
}

export interface Term {
  id: string;
  season: Season;
  label: string;
  /** Empty until the term's calendar is finalized — the page shows a
   *  "not yet published" placeholder for any term with no rows. */
  rows: ScheduleRow[];
}

export interface CalendarDate {
  label: string;
  value: string;
}

export interface ReferenceLink {
  label: string;
  href: string;
}

export const SYLLABUS_META = {
  term: "Fall 2026 – Spring 2027 (year-long)",
  meets: "Mondays, 1:00–1:50 p.m.",
  where: "Small Hall 235 (primary; see notes below)",
  instructor: `${INSTRUCTOR_NAME}, Ph.D.`,
  instructorEmail: INSTRUCTOR_EMAIL,
  instructorOffice: "Small 252",
};

export const INFO_FACTS: InfoFact[] = [
  { label: "Term", value: SYLLABUS_META.term },
  { label: "Meets", value: SYLLABUS_META.meets },
  { label: "Where", value: SYLLABUS_META.where },
  { label: "Instructor", value: `${SYLLABUS_META.instructor} · ${SYLLABUS_META.instructorOffice}` },
];

export const PILLARS: Pillar[] = [
  {
    num: "01",
    title: "AI, technical to strategic",
    body: "Career success, intellectual property, innovation & entrepreneurship, and innovation & marketing are each taught explicitly with AI — connecting technical fluency to the legal, business, and policy currents around it, with guest experts from law, business, and CDSP.",
  },
  {
    num: "02",
    title: "Research, writing & AI",
    body: "Teams use AI to accelerate literature review each semester, then carry that research into dedicated thesis-writing sessions — building the skills to make findings clear to a technical and public audience alike.",
  },
  {
    num: "03",
    title: "Pitch, progress & presentation",
    body: "Pitch Perfect, Progress Report, and Final Presentation sessions repeat across both semesters, keeping every team accountable to the instructor and peers, and building toward the Mid-Year Presentations and the public EP Showcase.",
  },
  {
    num: "04",
    title: "Quantum engineering",
    body: "Two dedicated sessions connect quantum principles to applications — from modeling and control to hardware and measurement — building toward the public Showcase.",
  },
];

export const OVERVIEW = [
  "This capstone is a redesigned, year-long experience that equips Engineering Physics (EP) seniors to thrive in graduate study, industry, and national labs. The course treats AI in the broadest sense — not only the technical craft of building systems, but the business, legal, and policy currents that decide whether an idea survives contact with the world. Those currents are inseparable from modern engineering practice, and this course is built around that connection.",
  "Throughout the year, students develop both hard skills and transferable professional skills. They deliver mid-semester and final presentations each term, build a polished portfolio and pitch, complete career development milestones, and learn how science and engineering operate beyond the university. The result is more than a project check-in — it is a launchpad for the next step in a student's career.",
];

export const EXPECTATIONS: string[] = [
  "Attend all Monday class sessions (1:00–1:50 p.m.) and actively participate in guest lectures and discussions.",
  "Meet with their faculty team advisor at least one hour per week.",
  "Commit at least 10 hours per week to their project. Since this is a three-credit course per semester, that workload expectation reflects both in-class and out-of-class time.",
  "Honors students: register for an extra credit hour for their thesis and complete two credit hours of honors research across both semesters, in addition to the capstone requirements.",
  "Deliver a mid-semester team presentation each semester, plus a final team presentation each semester — in fall, alongside a written paper, during the University final exam period; in spring, at the Spring Showcase.",
  "Complete all professional development assignments, including resume, LinkedIn profile, and pitch preparation.",
  "Participate in the Spring Showcase (April 2027), which serves as the culminating public presentation of their work.",
];

export const CALENDAR_DATES: CalendarDate[] = [
  { label: "Labor Day (no classes)", value: "September 7" },
  { label: "Add/drop deadline", value: "September 4" },
  { label: "Fall Break", value: "October 8–11" },
  { label: "Midterm grading period", value: "October 5–25" },
  { label: "Withdrawal deadline", value: "October 26" },
  { label: "Election Day (no classes)", value: "November 3" },
  { label: "Remote instruction days", value: "November 23–24" },
  { label: "Thanksgiving Break", value: "November 25–29" },
  { label: "Last day of classes", value: "December 4" },
  { label: "University final exam period", value: "December 7–11 and December 14–15" },
  { label: "Fall final presentations & paper due", value: "Wed, December 9, 2:00–5:00 p.m." },
  { label: "Fall grades due", value: "January 4, 2027" },
];

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: "materials",
    title: "Course materials & technology",
    body: [
      "Gradescope (gradescope.com): individual assignments — e.g., pitch write-ups, professional-development deliverables — are submitted as PDFs through Gradescope.",
      "Personal computer: bring a charged laptop with necessary adapters for sessions that involve in-class work.",
    ],
  },
  {
    id: "grading",
    title: "Grading",
    body: [
      "At the end of the fall semester, students will receive a grade of G (continuing).",
      "A final letter grade will be assigned upon successful completion of the full year in Spring 2027, based on performance across both semesters.",
      "The final grade reflects attendance and participation, team advisor evaluations, mid-semester and final presentations, the fall paper, professional development milestones, and engagement with guest sessions.",
    ],
  },
  {
    id: "attendance",
    title: "Attendance, absence & late work",
    body: [
      "Accessibility accommodations: the course will comply with all accommodations approved by Student Accessibility Services (SAS), including extended time and any other approved adjustments. Students with an SAS accommodation letter should share it with the instructor as early in the semester as possible.",
      "Authorization rests with the instructor: only the course instructor may excuse an absence or authorize a late submission.",
      "Advance notice requirement: a student who anticipates missing a class session must notify the instructor at least one week (seven calendar days) in advance. The absence is excused only once the instructor has reviewed the request and granted approval in writing, substantiated with appropriate official documentation.",
      "Emergency exceptions: if a genuine emergency makes one week's notice unreasonable, the instructor may still excuse the absence, provided the student notifies the instructor as soon as circumstances reasonably allow and shows a good-faith effort to comply.",
      "Missed presentations or deliverables: contact the instructor immediately. Make-up opportunities are handled case-by-case; an unexcused absence from a presentation is not guaranteed a make-up.",
    ],
  },
  {
    id: "presentations",
    title: "Midterm & final presentations",
    body: [
      "Mid-semester presentations: held in class (Week 9, October 19); every team presents project progress to the instructor and peers.",
      "Presentation prep: Week 14 (November 23) is a remote team-preparation day; Week 15 (November 30) covers tips for presentations ahead of finals.",
      "Fall final presentations & paper: Wednesday, December 9, 2:00–5:00 p.m., during the University final exam period. Teams deliver their mid-year presentation and submit the accompanying paper. Final grades for the semester are not issued until the full year is complete.",
    ],
  },
  {
    id: "ai-policy",
    title: "Policy on artificial intelligence",
    body: [
      "Students may use AI tools for learning, brainstorming, and design only with explicit permission from the instructor. Even with permission, AI-generated content must be critically evaluated, and all sources — including AI systems — must be cited. Using AI to complete assignments without acknowledgment or without explicit permission is a violation of the Honor Code and will be treated as plagiarism.",
    ],
  },
  {
    id: "behavior",
    title: "Behavior & professionalism",
    body: [
      "Be punctual and prepared.",
      "Be respectful to guest speakers and peers.",
      "Engage actively during Q&A and discussions.",
      "Follow W&M's Honor Code at all times.",
    ],
  },
  {
    id: "ferpa",
    title: "Student privacy, FERPA & communication",
    body: [
      "In compliance with the Family Educational Rights and Privacy Act (FERPA), student grades and records cannot be shared with parents or third parties without the student's written consent. Instructors will not engage directly with parents regarding student performance.",
      "Course announcements and materials will be posted on Blackboard. For email communication with groups of students, all recipients will be BCC'ed in accordance with privacy regulations.",
    ],
  },
  {
    id: "student-success",
    title: "Student success resources",
    body: [
      "Student Accessibility Services: sas@wm.edu · 757-221-2512 · wm.edu/sas",
      "Dean of Students Office: wm.edu/offices/deanofstudents",
      "Student Success Center: wm.edu/offices/sas/student-success-center",
      "Counseling Center: wm.edu/offices/wellness/counselingcenter",
    ],
  },
  {
    id: "honor-code",
    title: "Honor Code",
    body: [
      "William & Mary's Honor Code requires honesty and integrity in all academic work. Violations include plagiarism, unauthorized collaboration, use of unauthorized materials, fabrication of data, and lying. Suspected violations will be reported to the Honor Council.",
    ],
  },
  {
    id: "final-note",
    title: "Final note & syllabus modifications",
    body: [
      "The EP Capstone is designed to prepare you for your next step in industry, research, or graduate study. This fall semester is only the first stage — the course culminates in the Spring 2027 Showcase, where teams will present their projects publicly. Full engagement throughout the year is essential for successful completion.",
      "The instructor reserves the right to modify the contents of this syllabus, including course policies, grading criteria, and the schedule, at any time during the semester. Students will be notified of any such changes via Blackboard and/or email in a timely manner.",
    ],
  },
];

/** Terms in chronological order. Add a new term object as future semesters
 *  are scheduled — leave `rows` empty until that term's calendar is final,
 *  and the page will show a "not yet published" placeholder for it.
 *  Within a term, mark a week `kind: "tbd"` to hold its place before the
 *  topic is set, or `kind: "cancelled"` if a planned session falls through. */
export const TERMS: Term[] = [
  {
    id: "2026-fall",
    season: "fall",
    label: "Fall 2026",
    rows: [
      {
        week: "1",
        date: "Wed, Aug 26",
        isoDate: "2026-08-26",
        location: "—",
        topic: "No Class — Opening Convocation (half week)",
        notes: "—",
        kind: "break",
      },
      {
        week: "2",
        date: "Mon, Aug 31",
        isoDate: "2026-08-31",
        location: "Small 235",
        topic: "Pitch Perfect I",
        notes: "Prof. Yang",
      },
      {
        week: "3",
        date: "Mon, Sep 7",
        isoDate: "2026-09-07",
        location: "—",
        topic: "No Class — Labor Day",
        notes: "—",
        kind: "break",
      },
      {
        week: "4",
        date: "Mon, Sep 14",
        isoDate: "2026-09-14",
        location: "Small 235",
        topic: "Pitch Perfect II",
        notes: "Prof. Yang",
      },
      {
        week: "5",
        date: "Mon, Sep 21",
        isoDate: "2026-09-21",
        location: "SWEM Cox Room",
        topic: "Lit Review I with AI",
        notes: "Profs. Andrew & Yang",
      },
      {
        week: "6",
        date: "Mon, Sep 28",
        isoDate: "2026-09-28",
        location: "Career Center — business casual or formal",
        topic: "Career Success I with AI",
        notes: "Profs. Snyder & Yang",
      },
      {
        week: "7",
        date: "Mon, Oct 5",
        isoDate: "2026-10-05",
        location: "Small 235",
        topic: "Quantum Engineering I",
        notes: "Profs. Benten & Yang",
      },
      {
        week: "8",
        date: "Mon, Oct 12",
        isoDate: "2026-10-12",
        location: "TBD",
        topic: "Public Speaking",
        notes: "Profs. Neighbors & Yang",
      },
      {
        week: "9",
        date: "Mon, Oct 19",
        isoDate: "2026-10-19",
        location: "Small 235",
        topic: "Progress Report I",
        notes: "Prof. Yang",
        kind: "milestone",
      },
      {
        week: "10",
        date: "Mon, Oct 26",
        isoDate: "2026-10-26",
        location: "Small 235",
        topic: "Intellectual Property with AI",
        notes: "Profs. Rajec & Yang",
      },
      {
        week: "11",
        date: "Mon, Nov 2",
        isoDate: "2026-11-02",
        location: "Entrepreneurship Hub — business casual or formal",
        topic: "Innovation & Entrepreneurship with AI",
        notes: "Profs. Henshaw & Yang",
      },
      {
        week: "12",
        date: "Mon, Nov 9",
        isoDate: "2026-11-09",
        location: "Mason School of Business — business casual or formal",
        topic: "Innovation & Marketing with AI",
        notes: "Profs. Swan & Yang",
      },
      {
        week: "13",
        date: "Mon, Nov 16",
        isoDate: "2026-11-16",
        location: "Small 235",
        topic: "Pitch Perfect III",
        notes: "Prof. Yang",
      },
      {
        week: "14",
        date: "Mon, Nov 23",
        isoDate: "2026-11-23",
        location: "Remote",
        topic: "Team Preparation Day",
        notes: "Prof. Yang — remote instruction day",
      },
      {
        week: "15",
        date: "Mon, Nov 30",
        isoDate: "2026-11-30",
        location: "Small 235",
        topic: "Progress Report II",
        notes: "Prof. Yang — Dec 4 is the last day of classes",
        kind: "milestone",
      },
      {
        week: "Finals",
        date: "Wed, Dec 9",
        isoDate: "2026-12-09",
        location: "Small 235",
        topic: "Mid-Year Presentations",
        notes: "2:00–5:00 p.m., final exam period — team presentations & paper due",
        kind: "milestone",
      },
    ],
  },
  {
    id: "2027-spring",
    season: "spring",
    label: "Spring 2027",
    rows: [
      {
        week: "1",
        date: "Wed, Jan 27",
        isoDate: "2027-01-27",
        location: "—",
        topic: "No Class — Spring Semester Begins (half week)",
        notes: "—",
        kind: "break",
      },
      {
        week: "2",
        date: "Mon, Feb 1",
        isoDate: "2027-02-01",
        location: "Small 235",
        topic: "Progress Report III",
        notes: "Prof. Yang",
        kind: "milestone",
      },
      {
        week: "3",
        date: "Mon, Feb 8",
        isoDate: "2027-02-08",
        location: "SWEM Cox Room",
        topic: "Lit Review II with AI",
        notes: "Profs. Andrew & Yang",
      },
      {
        week: "4",
        date: "Mon, Feb 15",
        isoDate: "2027-02-15",
        location: "Small 235",
        topic: "Writing Thesis I",
        notes: "Prof. Yang",
      },
      {
        week: "5",
        date: "Mon, Feb 22",
        isoDate: "2027-02-22",
        location: "Career Center — business casual or formal",
        topic: "Career Success II with AI",
        notes: "Profs. Snyder & Yang",
      },
      {
        week: "6",
        date: "Mon, Mar 1",
        isoDate: "2027-03-01",
        location: "Small 235",
        topic: "Progress Report IV",
        notes: "Prof. Yang",
        kind: "milestone",
      },
      {
        week: "7",
        date: "Mon, Mar 8",
        isoDate: "2027-03-08",
        location: "Small 235",
        topic: "AI Policy & Law / AI in CDSP (TBD)",
        notes: "Giuffrida & Yang, or Schmidt & Yang — not yet decided",
        kind: "tbd",
      },
      {
        week: "8",
        date: "Mon, Mar 15",
        isoDate: "2027-03-15",
        location: "—",
        topic: "No Class — Spring Break",
        notes: "—",
        kind: "break",
      },
      {
        week: "9",
        date: "Mon, Mar 22",
        isoDate: "2027-03-22",
        location: "Small 235",
        topic: "Writing Thesis II",
        notes: "Prof. Yang",
      },
      {
        week: "10",
        date: "Mon, Mar 29",
        isoDate: "2027-03-29",
        location: "Small 235",
        topic: "Quantum Engineering II",
        notes: "Profs. Aubin et al. & Yang",
      },
      {
        week: "11",
        date: "Mon, Apr 5",
        isoDate: "2027-04-05",
        location: "Small 235",
        topic: "Writing Thesis III",
        notes: "Prof. Yang",
      },
      {
        week: "12",
        date: "Mon, Apr 12",
        isoDate: "2027-04-12",
        location: "Small 235",
        topic: "Final Presentation I",
        notes: "Prof. Yang",
        kind: "milestone",
      },
      {
        week: "13",
        date: "Mon, Apr 19",
        isoDate: "2027-04-19",
        location: "Small 235",
        topic: "Final Presentation II",
        notes: "Prof. Yang",
        kind: "milestone",
      },
      {
        week: "Showcase",
        date: "Mon, Apr 26",
        isoDate: "2027-04-26",
        location: "Physics Library",
        topic: "EP Spring Showcase",
        notes: "12:00–2:00 p.m. — Prof. Yang et al.",
        kind: "milestone",
      },
    ],
  },
];

export type TermWeekState = "upcoming" | "in-term" | "ended" | "unscheduled";

export interface TermWeek {
  term: Term;
  state: TermWeekState;
  /** The matching row when state is "in-term"; undefined otherwise. */
  row?: ScheduleRow;
}

/** Picks the term + week that "today" falls in, so the hero stat and any
 *  season indicator stay correct as terms start, run, and end — and as new
 *  terms are added below. `today` is an ISO yyyy-mm-dd string. */
export const currentTermWeek = (today: string): TermWeek | null => {
  const scheduled = TERMS.filter((t) => t.rows.length > 0);
  if (scheduled.length === 0) return null;

  // The current term is the last one whose first week has already arrived;
  // before the very first term starts, that term is still "current" (upcoming).
  let term = scheduled[0];
  for (const t of scheduled) {
    if (t.rows[0].isoDate <= today) term = t;
    else break;
  }

  const first = term.rows[0];
  const last = term.rows[term.rows.length - 1];
  if (today < first.isoDate) return { term, state: "upcoming" };
  if (today > last.isoDate) return { term, state: "ended" };

  let row: ScheduleRow = first;
  for (const r of term.rows) {
    if (r.isoDate <= today) row = r;
    else break;
  }
  return { term, state: "in-term", row };
};

export const REFERENCES: ReferenceLink[] = [
  {
    label: "University Registrar — 2026–27 Undergraduate Academic Calendar",
    href: "https://www.wm.edu/offices/registrar/catalogs-calendars-exams/ugcalendar/26-27/",
  },
  {
    label: "University Registrar — FERPA Policy",
    href: "https://www.wm.edu/offices/registrar/confidentiality-privacy/ferpa-policy/",
  },
  {
    label: "Dean of Students — Honor Code & Honor Councils",
    href: "https://www.wm.edu/offices/deanofstudents/services/communityvalues/honorcodeandcouncils/honorcode/",
  },
  { label: "Student Accessibility Services", href: "https://www.wm.edu/sas" },
  { label: "Dean of Students Office", href: "https://www.wm.edu/offices/deanofstudents/" },
  {
    label: "Student Success Center",
    href: "https://www.wm.edu/offices/sas/student-success-center/",
  },
  { label: "Counseling Center", href: "https://www.wm.edu/offices/wellness/counselingcenter/" },
];
