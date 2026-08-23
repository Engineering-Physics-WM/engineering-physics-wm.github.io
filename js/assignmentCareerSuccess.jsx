import * as React from "react";
import { Reveal } from "./motion.jsx";

const TaskCard = ({ number, title, children }) => (
  <article className="career-task-card">
    <span className="career-task-number mono">{number}</span>
    <h3>{title}</h3>
    {children}
  </article>
);

export const CareerSuccessAssignmentPage = ({ onNavigate }) => (
  <div className="page assignment-page career-assignment-page">
    <button className="assignment-back mono" type="button" onClick={() => onNavigate("syllabus")}>
      ← Back to syllabus &amp; schedule
    </button>

    <section className="assignment-hero">
      <div>
        <p className="kicker">
          <span className="dot">●</span> &nbsp; EPAD Assignment 2 · Career Success I
        </p>
        <h1>
          Career development
          <br /> sprint.
        </h1>
      </div>
      <Reveal as="dl" className="assignment-meta">
        <div>
          <dt>Format</dt>
          <dd>One PDF package</dd>
        </div>
        <div>
          <dt>Submit</dt>
          <dd className="pink">Gradescope</dd>
        </div>
        <div>
          <dt>Photo due</dt>
          <dd>September 15, 2026 · 2:00 p.m.</dd>
        </div>
      </Reveal>
    </section>

    <div className="assignment-layout">
      <main className="assignment-content">
        <section className="assignment-section assignment-overview">
          <p className="assignment-eyebrow mono">01 · Assignment overview</p>
          <h2>Build a professional presence.</h2>
          <p>
            Complete the three tasks below and combine every deliverable into one PDF package for
            Gradescope. Bring questions to the Career Success I class meeting at the Career Center.
          </p>
        </section>

        <section className="assignment-section">
          <p className="assignment-eyebrow mono">02 · Tasks</p>
          <div className="career-task-grid">
            <TaskCard number="01" title="Professional photo booth">
              <ul>
                <li>
                  Visit the Career Center photo booth any weekday between 8:00 a.m. and 4:45 p.m.
                </li>
                <li>
                  Complete your photo by <strong>Tuesday, September 15, 2026 at 2:00 p.m.</strong>
                </li>
                <li>Check in at the front desk and plan for about five minutes.</li>
                <li>Dress at least business casual and arrive looking presentation-ready.</li>
                <li>
                  There are no assigned slots. You may visit on any weekday before the deadline.
                </li>
              </ul>
            </TaskCard>

            <TaskCard number="02" title="Resume one-pager">
              <ul>
                <li>Draft a new resume or update your existing resume.</li>
                <li>Review the Career Center guidance for writing a strong resume.</li>
                <li>Keep the finished resume to a single page and save it as a PDF.</li>
              </ul>
            </TaskCard>

            <TaskCard number="03" title="LinkedIn profile & QR code">
              <ul>
                <li>Create a LinkedIn profile or update your existing profile.</li>
                <li>Make sure the profile is publicly viewable.</li>
                <li>
                  Use the{" "}
                  <a
                    href="https://www.adobe.com/express/feature/image/qr-code-generator"
                    target="_blank"
                    rel="noopener"
                  >
                    Adobe Express QR code generator ↗
                  </a>{" "}
                  to create a static QR code for your public LinkedIn URL. Adobe Express QR codes do
                  not expire.
                </li>
                <li>
                  Download the QR code image and test it with a phone before submitting. The code
                  remains usable only while your LinkedIn URL remains valid and public.
                </li>
              </ul>
            </TaskCard>
          </div>
        </section>

        <section className="assignment-section">
          <p className="assignment-eyebrow mono">03 · What to submit</p>
          <ol className="assignment-numbered-list">
            <li>
              <span>
                <strong>Professional photo:</strong> your digital photo-booth headshot.
              </span>
            </li>
            <li>
              <span>
                <strong>Resume:</strong> your one-page resume in PDF format.
              </span>
            </li>
            <li>
              <span>
                <strong>LinkedIn deliverables:</strong> the public profile URL and the Adobe Express
                QR code image that opens it.
              </span>
            </li>
          </ol>
          <div className="assignment-callout">
            <span className="mono">Package requirement</span>
            <p>Combine all three items into one PDF and upload that single file to Gradescope.</p>
          </div>
        </section>

        <section className="assignment-section career-meeting-card">
          <p className="assignment-eyebrow mono">04 · Next meeting</p>
          <div>
            <span className="career-meeting-date mono">MON · SEP 28 · 2026</span>
            <h2>Career Center</h2>
            <p>Career Success I with AI · 1:00–1:50 p.m.</p>
          </div>
        </section>
      </main>

      <aside className="assignment-sidebar">
        <div className="assignment-checklist-card">
          <p className="assignment-eyebrow mono">Before you submit</p>
          <h2>Final checklist</h2>
          <ul className="assignment-check-list">
            <li>Professional headshot completed by the deadline.</li>
            <li>Attire is at least business casual.</li>
            <li>Resume is one page and saved as a PDF.</li>
            <li>LinkedIn profile is public.</li>
            <li>QR code was created in Adobe Express.</li>
            <li>QR code opens the public LinkedIn profile on a phone.</li>
            <li>Photo, resume, profile URL, and QR image are combined into one PDF.</li>
          </ul>
        </div>
        <a
          className="btn btn-primary assignment-submit-link"
          href="https://www.gradescope.com/"
          target="_blank"
          rel="noopener"
        >
          Go to Gradescope ↗
        </a>
      </aside>
    </div>
  </div>
);
