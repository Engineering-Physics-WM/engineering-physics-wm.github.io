import * as React from "react";
import { Reveal } from "./motion.jsx";
import {
  CALENDAR_DATES,
  currentTermWeek,
  EXPECTATIONS,
  INFO_FACTS,
  OVERVIEW,
  PILLARS,
  POLICY_SECTIONS,
  REFERENCES,
  SPRING_CALENDAR_DATES,
  SYLLABUS_META,
  TERMS,
  type ScheduleRow,
  type Season,
  type Term,
} from "./syllabusData";

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatLongDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type OnNavigate = (page: string) => void;

const rowClass = (row: ScheduleRow) => {
  switch (row.kind) {
    case "break":
      return "schedule-row is-break";
    case "milestone":
      return "schedule-row is-milestone";
    case "cancelled":
      return "schedule-row is-cancelled";
    case "tbd":
      return "schedule-row is-tbd";
    default:
      return "schedule-row";
  }
};

const SeasonBadge = ({ season }: { season: Season }) => (
  <span className={`term-badge term-badge-${season}`}>
    <span className="term-badge-dot" aria-hidden="true" />
    {season === "fall" ? "Fall" : "Spring"}
  </span>
);

const LectureMaterials = ({ row, onNavigate }: { row: ScheduleRow; onNavigate: OnNavigate }) => {
  if (row.topic === "Pitch Perfect I") {
    return (
      <button
        type="button"
        className="lecture-resource-card"
        onClick={() => onNavigate("pitchPerfectAssignment")}
      >
        <span className="lecture-resource-type mono">Assignment · Homework 1</span>
        <strong>Assignment for Pitch Perfect I</strong>
        <span>Craft a 15-second business thesis pitch in fewer than 30 words.</span>
        <span className="lecture-resource-action" aria-hidden="true">
          Open assignment <span>↗</span>
        </span>
      </button>
    );
  }

  if (row.topic === "Career Success I with AI") {
    return (
      <button
        type="button"
        className="lecture-resource-card"
        onClick={() => onNavigate("careerSuccessAssignment")}
      >
        <span className="lecture-resource-type mono">Assignment · Assignment 2</span>
        <strong>Assignment for Career Success I</strong>
        <span>Complete your headshot, one-page resume, LinkedIn profile, and QR code.</span>
        <span className="lecture-resource-action" aria-hidden="true">
          Open assignment <span>↗</span>
        </span>
      </button>
    );
  }

  return (
    <div className="lecture-resource-empty">
      <span className="mono">Materials</span>
      <p>Slides, assignments, and supporting links will appear here when they are published.</p>
    </div>
  );
};

const SchedulePillarRow = ({ row, onNavigate }: { row: ScheduleRow; onNavigate: OnNavigate }) => {
  const [open, setOpen] = React.useState(false);
  const expandable = row.kind !== "break" && row.kind !== "cancelled";
  const panelId = `lecture-${row.isoDate}`;

  return (
    <>
      <tr className={`${rowClass(row)}${open ? " is-open" : ""}`}>
        <td className="mono">{row.week}</td>
        <td className="mono">{row.date}</td>
        <td>
          {expandable ? (
            <button
              type="button"
              className="lecture-toggle"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((value) => !value)}
            >
              <span>{row.topic}</span>
              <span className="lecture-toggle-mark" aria-hidden="true">
                {open ? "−" : "+"}
              </span>
            </button>
          ) : (
            row.topic
          )}
        </td>
        <td>{row.location}</td>
        <td>
          {row.guestSpeakers?.map((speaker, index) => {
            const joiner = row.guestSpeakerJoiner === "or" ? " or " : " & ";
            return (
              <React.Fragment key={speaker}>
                {index > 0 && joiner}
                <span className="schedule-speaker-name">{speaker}</span>
              </React.Fragment>
            );
          })}
          {row.guestSpeakers?.length ? (
            <span className="schedule-note"> · {row.notes}</span>
          ) : (
            row.notes
          )}
        </td>
      </tr>
      {expandable && open && (
        <tr className="lecture-materials-row">
          <td colSpan={5}>
            <div id={panelId} className="lecture-materials-panel">
              <LectureMaterials row={row} onNavigate={onNavigate} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const TermSchedule = ({ term, onNavigate }: { term: Term; onNavigate: OnNavigate }) => (
  <div className={`term-schedule-block term-schedule-${term.season}`}>
    <div className="term-schedule-head">
      <SeasonBadge season={term.season} />
      <h3>{term.label}</h3>
    </div>
    {term.rows.length > 0 ? (
      <div className="schedule-table-wrap">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Wk</th>
              <th>Date</th>
              <th>Topic</th>
              <th>Location</th>
              <th>Faculty / notes</th>
            </tr>
          </thead>
          <tbody>
            {term.rows.map((row) => (
              <SchedulePillarRow row={row} onNavigate={onNavigate} key={row.week} />
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="schedule-empty">
        Schedule not yet published — check back once the {term.label} calendar is finalized.
      </p>
    )}
  </div>
);

const PolicyItem = ({
  id,
  title,
  body,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  body: string[];
  defaultOpen?: boolean;
}) => (
  <details id={`policy-${id}`} className="news-item syllabus-policy" open={defaultOpen}>
    <summary>
      <span className="news-summary-text">
        <strong>{title}</strong>
      </span>
    </summary>
    <div className="news-body">
      {body.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  </details>
);

const SyllabusPage = ({ onNavigate }: { onNavigate: OnNavigate }) => {
  const today = todayIso();
  const termWeek = React.useMemo(() => currentTermWeek(today), [today]);

  const weekValue = !termWeek
    ? "—"
    : termWeek.state === "upcoming"
      ? "0"
      : termWeek.state === "ended"
        ? `${capitalize(termWeek.term.season)} ended`
        : termWeek.row?.week === "Finals"
          ? "Finals"
          : `Wk ${termWeek.row?.week}`;

  return (
    <div className="page syllabus-page">
      <section className="news-hero">
        <div>
          <p className="kicker">
            <span className="dot">●</span> &nbsp; EP Capstone · {SYLLABUS_META.term}
          </p>
          <h1>
            Syllabus
            <br />& schedule.
          </h1>
        </div>
        <Reveal as="dl" className="news-hero-stats">
          <div>
            <dt>Current week</dt>
            <dd className="current-week-value">
              {weekValue}
              {termWeek && <SeasonBadge season={termWeek.term.season} />}
            </dd>
          </div>
          <div>
            <dt>Today</dt>
            <dd className="pink">{formatLongDate(today)}</dd>
          </div>
        </Reveal>
      </section>

      <div className="facts syllabus-facts">
        {INFO_FACTS.map((fact) => (
          <div className="fact" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd style={{ fontSize: 16 }}>{fact.value}</dd>
          </div>
        ))}
        <div className="fact">
          <dt>Instructor email</dt>
          <dd style={{ fontSize: 16 }}>
            <a href={`mailto:${SYLLABUS_META.instructorEmail}`}>{SYLLABUS_META.instructorEmail}</a>
          </dd>
        </div>
      </div>

      <div className="section-heading">
        <h2>Course overview</h2>
      </div>
      <div className="syllabus-overview">
        {OVERVIEW.map((paragraph, index) => (
          <p key={index} className="syllabus-copy">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="syllabus-pillars">
        {PILLARS.map((pillar) => (
          <div className="pillar-card" key={pillar.num}>
            <span className="pillar-num mono">{pillar.num}</span>
            <h3>{pillar.title}</h3>
            <p>{pillar.body}</p>
          </div>
        ))}
      </div>

      <div className="section-heading">
        <h2>Course schedule</h2>
      </div>
      {TERMS.map((term) => (
        <TermSchedule term={term} onNavigate={onNavigate} key={term.id} />
      ))}

      <div className="news-layout syllabus-layout">
        <section aria-label="Course policies">
          <div className="section-heading">
            <h2>Expectations</h2>
          </div>
          <ul className="syllabus-list">
            {EXPECTATIONS.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <div className="section-heading">
            <h2>Policies</h2>
          </div>
          {POLICY_SECTIONS.map((section, index) => (
            <PolicyItem
              key={section.id}
              id={section.id}
              title={section.title}
              body={section.body}
              defaultOpen={index === 0}
            />
          ))}

          <div className="section-heading syllabus-references-heading">
            <h2>References</h2>
          </div>
          <ul className="syllabus-references">
            {REFERENCES.map((ref) => (
              <li key={ref.href}>
                <a href={ref.href} target="_blank" rel="noopener">
                  {ref.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>

        <aside className="news-side syllabus-side">
          <h2>Academic calendar</h2>
          <p>Important dates for the full 2026–27 academic year.</p>
          <h3 className="syllabus-calendar-term">Fall 2026</h3>
          <ul className="syllabus-calendar">
            {CALENDAR_DATES.map((item) => (
              <li key={item.label}>
                <span className="news-side-date">{item.value}</span>
                {item.label}
              </li>
            ))}
          </ul>
          <h3 className="syllabus-calendar-term">Spring 2027</h3>
          <ul className="syllabus-calendar">
            {SPRING_CALENDAR_DATES.map((item) => (
              <li key={item.label}>
                <span className="news-side-date">{item.value}</span>
                {item.label}
              </li>
            ))}
          </ul>

          <div className="news-side-actions">
            <button
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={() => onNavigate("catalog")}
            >
              Browse projects
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={() => onNavigate("news")}
            >
              Cohort updates
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export { SyllabusPage };
