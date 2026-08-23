import * as React from "react";
import { Reveal } from "./motion.jsx";

const BreakdownItem = ({ label, children }) => (
  <li>
    <span>{label}</span>
    <strong>{children}</strong>
  </li>
);

export const PitchPerfectAssignmentPage = ({ onNavigate }) => (
  <div className="page assignment-page">
    <button className="assignment-back mono" type="button" onClick={() => onNavigate("syllabus")}>
      ← Back to syllabus &amp; schedule
    </button>

    <section className="assignment-hero">
      <div>
        <p className="kicker">
          <span className="dot">●</span> &nbsp; EPAD Homework 1 · Pitch Perfect I
        </p>
        <h1>
          15-second business
          <br /> thesis pitch.
        </h1>
      </div>
      <Reveal as="dl" className="assignment-meta">
        <div>
          <dt>Format</dt>
          <dd>One-page PDF</dd>
        </div>
        <div>
          <dt>Submit</dt>
          <dd className="pink">Gradescope</dd>
        </div>
        <div>
          <dt>Limits</dt>
          <dd>15 seconds · under 30 words</dd>
        </div>
      </Reveal>
    </section>

    <div className="assignment-layout">
      <main className="assignment-content">
        <section className="assignment-section assignment-overview">
          <p className="assignment-eyebrow mono">01 · Assignment overview</p>
          <h2>Make every word work.</h2>
          <p>
            Each team will craft and speak a single 15-second pitch for the product you are
            developing using the template below. Keep it under 30 words. Discuss and refine it with
            your team and your advisor(s).
          </p>
        </section>

        <section className="assignment-section">
          <p className="assignment-eyebrow mono">02 · Template</p>
          <blockquote className="pitch-template">
            For <em>[early adopter]</em> who struggles with <em>[urgent job or pain]</em>, our{" "}
            <em>[solution]</em> delivers <em>[single top outcome]</em> by <em>[unique edge]</em>.
          </blockquote>
        </section>

        <section className="assignment-section">
          <p className="assignment-eyebrow mono">03 · Rules</p>
          <ol className="assignment-numbered-list">
            <li>
              The early adopter must be a person or role, not an organization. Examples: ER charge
              nurse, city procurement officer, or high school physics teacher.
            </li>
            <li>Use one pain only and make it immediate or costly in time, money, or risk.</li>
            <li>Use one outcome only and make it specific or clearly observable.</li>
            <li>
              State a concrete unique edge. Name the asset—data, workflow, IP, access, or insight.
              Avoid vague words.
            </li>
            <li>Read it aloud. If someone cannot repeat it, simplify.</li>
          </ol>
        </section>

        <section className="assignment-section">
          <p className="assignment-eyebrow mono">04 · What to submit</p>
          <ol className="assignment-numbered-list">
            <li>Your one-sentence pitch that fits the template.</li>
            <li>
              One line labeling each bracketed part: early adopter, pain, solution, outcome, and
              unique edge.
            </li>
            <li>
              A three-to-five-item plan for how you will test or iterate the riskiest part over the
              next couple of weeks.
            </li>
          </ol>
          <div className="assignment-callout">
            <span className="mono">In class next time</span>
            <p>Each team will deliver the sentence aloud in 15 seconds and answer questions.</p>
          </div>
        </section>

        <section className="assignment-section assignment-example">
          <p className="assignment-eyebrow mono">05 · Example pitch</p>
          <blockquote>
            For dermatology clinicians who face biopsy backlogs, our quantum dot skin patch delivers
            under one-minute lesion triage by carbon quantum dots readable with a smartphone
            flashlight.
          </blockquote>
          <ul className="pitch-breakdown">
            <BreakdownItem label="Early adopter">Dermatology clinicians</BreakdownItem>
            <BreakdownItem label="Pain">Biopsy backlogs</BreakdownItem>
            <BreakdownItem label="Solution">Quantum dot skin patch</BreakdownItem>
            <BreakdownItem label="Outcome">Under one-minute lesion triage</BreakdownItem>
            <BreakdownItem label="Unique edge">
              Carbon quantum dots readable with a smartphone flashlight
            </BreakdownItem>
          </ul>
        </section>

        <section className="assignment-section">
          <p className="assignment-eyebrow mono">06 · Why this example works</p>
          <ul className="assignment-check-list">
            <li>Names a person who feels the pain and influences the buy.</li>
            <li>Uses a single, clear pain that is costly for the user.</li>
            <li>States one specific outcome that is easy to test.</li>
            <li>The edge is concrete and points to a capability competitors may not have.</li>
            <li>Uses triage and risk language rather than diagnosis.</li>
          </ul>
        </section>
      </main>

      <aside className="assignment-sidebar">
        <div className="assignment-checklist-card">
          <p className="assignment-eyebrow mono">Before you submit</p>
          <h2>Final checklist</h2>
          <ul className="assignment-check-list">
            <li>Early adopter is a person or role.</li>
            <li>One pain only.</li>
            <li>One outcome only, and it is specific.</li>
            <li>The edge is an asset you possess.</li>
            <li>Fewer than 30 words and speaks in 15 seconds.</li>
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
