import * as React from "react";
import { Reveal } from "./motion.jsx";

const formatDate = (date) => {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const sortAnnouncements = (items = []) => [...items].sort((a, b) => {
  if (Number.isFinite(a.order) && Number.isFinite(b.order)) return a.order - b.order;
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return (b.date || "").localeCompare(a.date || "");
});

const ResourceLink = ({ resource, onNavigate }) => {
  if (resource.page) {
    return (
      <button type="button" className="news-resource" onClick={() => onNavigate(resource.page)}>
        <span>{resource.kind}</span>{resource.label}
      </button>
    );
  }
  return (
    <a className="news-resource" href={resource.url} target="_blank" rel="noopener">
      <span>{resource.kind}</span>{resource.label}
    </a>
  );
};

const AnnouncementItem = ({ item, onNavigate, compact = false, defaultOpen = false }) => (
  <details className={"news-item" + (compact ? " is-compact" : "")} open={defaultOpen}>
    <summary>
      <span className="news-date mono">{item.label || formatDate(item.date)}</span>
      <span className="news-summary-text">
        <strong>{item.title}</strong>
        <span>{item.summary}</span>
      </span>
    </summary>
    <div className="news-body">
      {item.body?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {item.resources?.length > 0 && (
        <div className="news-resources" aria-label="Announcement resources">
          {item.resources.map((resource) => (
            <ResourceLink key={resource.label} resource={resource} onNavigate={onNavigate} />
          ))}
        </div>
      )}
      {item.audience && <p className="news-audience mono">Audience: {item.audience}</p>}
    </div>
  </details>
);

const AnnouncementPanel = ({ announcements, onNavigate }) => {
  const items = sortAnnouncements(announcements).slice(0, 4);
  return (
    <>
      <div className="hero-timeline" aria-label="This week">
        {items.map((item, index) => (
          <AnnouncementItem
            key={item.id}
            item={item}
            onNavigate={onNavigate}
            compact
          />
        ))}
      </div>
      <button className="btn btn-ghost btn-news-all" onClick={() => onNavigate("news")}>
        View all updates
      </button>
    </>
  );
};

const NewsPage = ({ data, currentYear, onNavigate }) => {
  const announcements = sortAnnouncements((data.announcements || []).filter(item => item.cohortYear === currentYear));
  return (
    <div className="page news-page">
      <section className="news-hero">
        <p className="kicker"><span className="dot">●</span> &nbsp; Cohort updates · {currentYear}</p>
        <h1>News, files, and weekly notes.</h1>
        <p>
          Public announcements for the Engineering Physics cohort. Each item can hold links, PDFs, slides,
          forms, recordings, and longer context without cluttering the front page.
        </p>
      </section>

      <section className="news-layout">
        <div className="news-feed">
          {announcements.map((item, index) => (
            <Reveal as="div" key={item.id} delay={index * 35}>
              <AnnouncementItem item={item} onNavigate={onNavigate} defaultOpen={index === 0} />
            </Reveal>
          ))}
        </div>
        <aside className="news-side">
          <h2>Publishing Model</h2>
          <p>
            Updates are scoped by cohort year. The public page can stay open, while the instructor dashboard
            can later publish drafts and trigger email sends to selected groups.
          </p>
          <ul>
            <li>All students + mentors</li>
            <li>All students</li>
            <li>Honors students</li>
            <li>All mentors</li>
            <li>A selected project team</li>
          </ul>
        </aside>
      </section>
    </div>
  );
};

export { AnnouncementPanel, NewsPage, sortAnnouncements };
