/* Ranking page — drag-and-drop list w/ spring, mock submission. */

import * as React from "react";
import { Reveal } from "./motion.jsx";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { PersonLink, YangLink } from "./links.jsx";

const WM_EMAIL_RE = /^[^@\s]+@wm\.edu$/i;

const createReceiptCode = () => {
  if (globalThis.crypto?.randomUUID) {
    return "EP-" + globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  }
  return "EP-" + Math.random().toString(36).slice(2, 10).toUpperCase();
};

const RankItem = ({ project, idx, total, onMove, onDragStart, onDragOver, onDrop, onDragEnd, dragging }) => (
  <li
    className={"ranking-item" + (dragging ? " dragging" : "")}
    draggable
    onDragStart={(e) => onDragStart(e, idx)}
    onDragOver={(e) => onDragOver(e, idx)}
    onDrop={(e) => onDrop(e, idx)}
    onDragEnd={onDragEnd}
    data-spark="rank"
  >
    <span className="rank-num">{idx + 1}</span>
    <div className="rank-body">
      <h4 className="rank-title">{project.title}</h4>
      <span className="rank-meta"><PersonLink name={project.advisor}>{project.advisor}</PersonLink> · {project.affiliation}</span>
    </div>
    <div className="rank-controls">
      <span className="drag-handle" aria-hidden="true">⋮⋮</span>
      <button className="rank-btn" disabled={idx === 0} onClick={() => onMove(idx, idx - 1)} aria-label="Move up">↑</button>
      <button className="rank-btn" disabled={idx === total - 1} onClick={() => onMove(idx, idx + 1)} aria-label="Move down">↓</button>
    </div>
  </li>
);

const RankingPage = ({ data, onNavigate }) => {
  const DRAFT_KEY = "ep-ranking-draft-2627";
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [order, setOrder] = React.useState(() => data.projects.map(p => p.id));
  const [dragIdx, setDragIdx] = React.useState(null);
  const [status, setStatus] = React.useState("");
  const [submitted, setSubmitted] = React.useState(null);
  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  // Restore draft
  React.useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setName(d.name || "");
      setEmail(d.email || "");
      setNotes(d.notes || "");
      if (Array.isArray(d.order)) {
        const ids = new Set(data.projects.map(p => p.id));
        const restored = d.order.filter(id => ids.has(id));
        const missing = data.projects.map(p => p.id).filter(id => !restored.includes(id));
        setOrder([...restored, ...missing]);
      }
    } catch {}
  }, [data.projects]);

  // Persist draft
  React.useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, email, notes, order }));
  }, [name, email, notes, order]);

  // Update step
  React.useEffect(() => {
    if (submitted) setStep(3);
    else if (name && email && order.length) setStep(2);
    else setStep(1);
  }, [name, email, order, submitted]);

  const projectsById = React.useMemo(() => Object.fromEntries(data.projects.map(p => [p.id, p])), [data.projects]);
  const allowedStudentEmails = React.useMemo(
    () => new Set((data.students || []).map(s => s.email.toLowerCase())),
    [data.students]
  );

  const move = (from, to) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
  };

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch {}
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null) return;
    move(dragIdx, idx);
    setDragIdx(null);
  };
  const handleDragEnd = () => setDragIdx(null);

  const reset = () => { setOrder(data.projects.map(p => p.id)); setStatus("Order reset."); };

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setStatus("Add your name and W&M email before submitting.");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!WM_EMAIL_RE.test(cleanEmail)) {
      setStatus("Use your William & Mary email address.");
      return;
    }
    if (allowedStudentEmails.size && !allowedStudentEmails.has(cleanEmail)) {
      setStatus("This email is not on the allowed student list for this cohort.");
      return;
    }
    if (submitting) return;

    const receiptCode = createReceiptCode();
    const receipt = {
      id: receiptCode,
      ts: new Date().toISOString(),
      name: name.trim(),
      email: cleanEmail,
      notes: notes.trim(),
      order,
      source: isSupabaseConfigured ? "supabase" : "local"
    };

    setSubmitting(true);
    setStatus(isSupabaseConfigured ? "Saving to Supabase…" : "Saving local mock submission…");

    if (isSupabaseConfigured) {
      const { error } = await supabase.from("ranking_submissions").insert({
        cohort_year: data.currentYear,
        student_name: receipt.name,
        student_email: receipt.email,
        notes: receipt.notes || null,
        ranking: receipt.order,
        receipt_code: receiptCode,
      });

      if (error) {
        setSubmitting(false);
        if (error.code === "23505") {
          setStatus("A response from this email already exists for this cohort.");
          return;
        }
        if (error.code === "42501") {
          setStatus("This email is not on the allowed student list for this cohort.");
          return;
        }
        setStatus("Supabase could not save yet. Check the table, allowlist, and RLS policy.");
        return;
      }

      setSubmitted(receipt);
      setStatus("");
      setSubmitting(false);
      return;
    }

    setTimeout(() => {
      setSubmitted(receipt);
      setStatus("");
      const all = JSON.parse(localStorage.getItem("ep-mock-submissions") || "[]");
      all.push(receipt);
      localStorage.setItem("ep-mock-submissions", JSON.stringify(all));
      setSubmitting(false);
    }, 900);
  };

  if (submitted) {
    return (
      <div className="page">
        <section className="ranking-hero">
          <div>
            <p className="kicker"><span className="dot">●</span> &nbsp; Submission received</p>
            <h1>Your ranking is <span className="ital">in.</span></h1>
            <p>{submitted.source === "supabase" ? "Your preferences are saved to the live poll database." : "This local mock receipt stays in your browser until the live database is enabled."} You'll hear back as teams are formed.</p>
          </div>
        </section>
        <Reveal as="div" className="submitted-card">
          <h3>Submitted to <YangLink>Prof. Ran Yang</YangLink></h3>
          <p className="receipt-mono">RECEIPT {submitted.id} · {new Date(submitted.ts).toLocaleString()}</p>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>Name: {submitted.name} · {submitted.email}</p>
          <ol>
            {submitted.order.slice(0, 3).map((id, i) => <li key={i}>{projectsById[id]?.title}</li>)}
            <li style={{ listStyle: "none", color: "var(--muted)", marginLeft: "-24px" }}>… plus {submitted.order.length - 3} more in your full ranking.</li>
          </ol>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={() => { setSubmitted(null); }}>Edit response</button>
            <button className="btn btn-primary" onClick={() => onNavigate("catalog")}>Back to catalog</button>
          </div>
        </Reveal>
        <Reveal as="div" className="submission-mock" style={{ marginTop: 32 }}>
          <h3>What happens next</h3>
          <p style={{ color: "var(--ink-soft)", margin: "0 0 12px" }}>The form writes to Supabase when the project environment variables and ranking table are present. Local fallback remains available for development.</p>
          <div className="endpoints">
            <div className="endpoint"><div><span className="ep-method">POST</span><span className="ep-path">/api/rankings</span></div><div className="ep-desc">Stores ranking + notes against a year + student.</div></div>
            <div className="endpoint"><div><span className="ep-method">GET</span><span className="ep-path">/api/cohort/2026-2027</span></div><div className="ep-desc">Returns the live response set for the instructor view.</div></div>
            <div className="endpoint"><div><span className="ep-method">POST</span><span className="ep-path">/api/teams/auto</span></div><div className="ep-desc">Runs the matching algorithm and returns a team draft.</div></div>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="ranking-hero">
        <div>
          <p className="kicker"><span className="dot">●</span> &nbsp; Step into your capstone year</p>
          <h1>Rank the projects that <span className="ital">pull&nbsp;you&nbsp;in.</span></h1>
          <p>Drag the slate into your preferred order. Top three carry the most weight. We use this to seed teams — your notes and constraints help us read between the lines.</p>
          <p className="construction-note">{isSupabaseConfigured ? "Student polling beta · under construction · saves to Supabase" : "Student polling mockup · under construction · submissions stay local for now"}</p>
        </div>
        <Reveal as="aside" className="submit-card">
          <h2>How submission works</h2>
          <p>Your ranking is sent to <YangLink style={{ color: "var(--olive-ink)" }}>Prof. Ran Yang</YangLink>{isSupabaseConfigured ? " through the Supabase-backed poll." : " via the local mock flow until Supabase is configured."} Drafts auto-save in this browser.</p>
        </Reveal>
      </section>

      <div className="ranking-steps">
        <div className={"step" + (step >= 1 ? " is-active" : "") + (step > 1 ? " is-done" : "")}>
          <span className="step-num">1</span> Identify yourself
        </div>
        <span className="step-line" />
        <div className={"step" + (step >= 2 ? " is-active" : "") + (step > 2 ? " is-done" : "")}>
          <span className="step-num">2</span> Rank the slate
        </div>
        <span className="step-line" />
        <div className={"step" + (step >= 3 ? " is-active" : "")}>
          <span className="step-num">3</span> Submit
        </div>
      </div>

      <div className="ranking-layout">
        <aside className="student-form-card">
          <h3>You</h3>
          <label className="field">
            <span className="helper">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" autoComplete="name" />
          </label>
          <label className="field">
            <span className="helper">William &amp; Mary email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username@wm.edu" autoComplete="email" />
          </label>
          <label className="field">
            <span className="helper">Notes for matching</span>
            <textarea rows="4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Schedule constraints, partners you'd like to work with, skills, project comments." />
          </label>
          <p className="status-line">{status}</p>
          <div className="button-row">
            <button className="btn btn-primary" data-spark onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit ranking"}
            </button>
            <button className="btn btn-ghost" onClick={reset}>Reset order</button>
          </div>
        </aside>

        <div>
          <p className="kicker" style={{ marginBottom: 12 }}>Drag to reorder · Top 3 are weighted</p>
          <ol className="ranking-list">
            {order.map((id, idx) => (
              <RankItem
                key={id}
                project={projectsById[id]}
                idx={idx}
                total={order.length}
                onMove={move}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                dragging={dragIdx === idx}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export { RankingPage };
