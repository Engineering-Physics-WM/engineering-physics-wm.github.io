/* Pitch Perfect II — in-class investor round (students) and live results (instructor). */

import * as React from "react";
import { createPortal } from "react-dom";
import { Reveal } from "./motion.jsx";
import { EP_DATA, resolveCohortData } from "./data.js";
import { isSupabaseConfigured } from "./supabaseClient.js";
import {
  WM_EMAIL_RE,
  isStudentAllowed,
  normalizeStudentEmail,
} from "../src/lib/rankingSubmissions";
import {
  INVESTMENT_BUDGET,
  INVESTMENT_STEP,
  PITCH_II_COHORT_YEAR,
  PITCH_II_PROJECT_IDS,
  PITCH_II_ROUND_ID,
  emptyAllocations,
  fetchInvestmentRound,
  fetchInvestments,
  formatCompactDollars,
  formatDollars,
  isMissingSetupError,
  maxForProject,
  normalizeAllocations,
  parseDollarInput,
  setAllocation,
  setInvestmentRoundOpen,
  submitInvestment,
  summarizeInvestments,
  totalInvested,
  validateAllocations,
} from "../src/lib/pitchInvestments";

const SHORT_NAMES = {
  "animal-crossing": "Animal Crossing",
  "smr-heat-load": "SMR Heat Load",
  "irays-pupillometry": "iRays",
  "usv-race-boat": "USV Race Boat",
  "laser-optics": "Laser Cooling Optics",
  "soft-bio-robot": "Soft Bio-Robot",
};

const cohortProjects = resolveCohortData(EP_DATA, PITCH_II_COHORT_YEAR).projects || [];

const PITCH_PROJECTS = PITCH_II_PROJECT_IDS.map((id) => {
  const project = cohortProjects.find((item) => item.id === id);
  return {
    id,
    num: project?.num ?? 99,
    shortName: SHORT_NAMES[id] || project?.title || id,
    title: project?.title || "",
    advisor: project?.advisor || "",
  };
}).sort((a, b) => a.num - b.num);

const PROJECTS_BY_ID = Object.fromEntries(PITCH_PROJECTS.map((project) => [project.id, project]));
const DRAFT_KEY = `ep-investor-${PITCH_II_ROUND_ID}`;
const STUDENT_LINK_PATH = "/#/invest";

const teamNumber = (num) => String(num).padStart(2, "0");

const readDraft = () => {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeDraft = (value) => {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  } catch {}
};

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

const formatPercent = (value) => `${Math.round(value * 100)}%`;

const describeSaveError = (error) => {
  if (isMissingSetupError(error)) {
    return "The investor round is not set up in the live database yet. Let Prof. Yang know.";
  }
  return error?.message || "Your investments could not be saved. Try again.";
};

/** Polls the round's open/closed state so a closed round locks every open phone. */
const useRoundStatus = (pollMs) => {
  const [round, setRound] = React.useState({
    state: isSupabaseConfigured ? "loading" : "unconfigured",
    isOpen: false,
  });

  const refresh = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { round: row, error } = await fetchInvestmentRound(PITCH_II_ROUND_ID);
    if (error) {
      setRound((current) => ({
        state: isMissingSetupError(error) ? "missing" : "error",
        isOpen: current.isOpen,
      }));
      return;
    }
    setRound(row ? { state: "ready", isOpen: row.is_open } : { state: "missing", isOpen: false });
  }, []);

  React.useEffect(() => {
    refresh();
    if (!pollMs) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  return [round, refresh, setRound];
};

// ── Student investor page ─────────────────────────────────────────────────────

const QUICK_ADDS = [50_000, 100_000];

const InvestmentCard = ({ project, allocations, disabled, onSet }) => {
  const amount = allocations[project.id] || 0;
  const cap = maxForProject(allocations, project.id);
  const [text, setText] = React.useState(null);
  const [note, setNote] = React.useState("");
  const inputId = `invest-${project.id}`;

  const apply = (requested) => {
    const next = Math.max(0, requested);
    setNote(
      next <= cap
        ? ""
        : cap === 0
          ? "Your $1M is fully invested. Lower another team first to free up money."
          : `Capped at ${formatDollars(cap)}, which is all you have left.`
    );
    onSet(project.id, next);
  };

  const commitText = () => {
    if (text === null) return;
    const parsed = parseDollarInput(text);
    setText(null);
    if (parsed === null) {
      setNote("Type a dollar amount, like 250000 or 250k.");
      return;
    }
    apply(parsed);
  };

  return (
    <li className={"invest-card" + (amount > 0 ? " has-investment" : "")}>
      <div className="invest-card-head">
        <span className="invest-card-num mono">{teamNumber(project.num)}</span>
        <div className="invest-card-title">
          <h3>{project.shortName}</h3>
          <p>{project.title}</p>
          {project.advisor && <span className="mono">Advisor · {project.advisor}</span>}
        </div>
      </div>

      <div className="invest-card-controls">
        <label className="invest-amount-field" htmlFor={inputId}>
          <span className="mono">Your investment</span>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={text ?? formatDollars(amount)}
            onFocus={() => setText(amount ? String(amount) : "")}
            onChange={(event) => setText(event.target.value)}
            onBlur={commitText}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>

        <input
          type="range"
          className="invest-slider"
          min={0}
          max={INVESTMENT_BUDGET}
          step={INVESTMENT_STEP}
          value={amount}
          disabled={disabled}
          aria-label={`Investment in ${project.shortName}`}
          aria-valuetext={formatDollars(amount)}
          style={{
            "--fill": `${(amount / INVESTMENT_BUDGET) * 100}%`,
            "--cap": `${(cap / INVESTMENT_BUDGET) * 100}%`,
          }}
          onChange={(event) => apply(Number(event.target.value))}
        />

        <div className="invest-quick">
          {QUICK_ADDS.map((step) => (
            <button
              key={step}
              type="button"
              className="invest-chip"
              disabled={disabled || amount >= cap}
              onClick={() => apply(amount + step)}
            >
              +{formatCompactDollars(step)}
            </button>
          ))}
          <button
            type="button"
            className="invest-chip"
            disabled={disabled || amount >= cap}
            onClick={() => apply(cap)}
          >
            All remaining
          </button>
          <button
            type="button"
            className="invest-chip is-clear"
            disabled={disabled || amount === 0}
            onClick={() => apply(0)}
          >
            Clear
          </button>
        </div>
        {note && (
          <p className="invest-note" role="status">
            {note}
          </p>
        )}
      </div>
    </li>
  );
};

export const PitchInvestPage = ({ onNavigate }) => {
  const [initial] = React.useState(() => readDraft() || {});
  const [name, setName] = React.useState(initial.name || "");
  const [email, setEmail] = React.useState(initial.email || "");
  const [investor, setInvestor] = React.useState(initial.investor || null);
  const [allocations, setAllocations] = React.useState(() =>
    normalizeAllocations(initial.allocations, PITCH_II_PROJECT_IDS)
  );
  const [saved, setSaved] = React.useState(initial.saved || null);
  const [identityStatus, setIdentityStatus] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState(null);
  const [round, refreshRound] = useRoundStatus(15_000);

  React.useEffect(() => {
    writeDraft({ name, email, investor, allocations, saved });
  }, [name, email, investor, allocations, saved]);

  const total = totalInvested(allocations);
  const remaining = INVESTMENT_BUDGET - total;
  const snapshot = JSON.stringify(allocations);
  const dirty = !saved || saved.snapshot !== snapshot;
  const closed = round.state === "ready" && !round.isOpen;
  const canSave = isSupabaseConfigured && !closed && !saving && Boolean(investor) && dirty;

  const statusLabel = {
    loading: "Checking…",
    ready: round.isOpen ? "Open for investing" : "Closed",
    missing: "Not open yet",
    error: "Reconnecting…",
    unconfigured: "Preview only",
  }[round.state];

  const setAmount = (projectId, requested) => {
    setSaveStatus(null);
    setAllocations((current) => setAllocation(current, projectId, requested));
  };

  const startInvesting = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = normalizeStudentEmail(email);
    if (!cleanName) {
      setIdentityStatus("Add your full name.");
      return;
    }
    if (!WM_EMAIL_RE.test(cleanEmail)) {
      setIdentityStatus("Use your William & Mary email address.");
      return;
    }
    if (!isSupabaseConfigured) {
      setIdentityStatus("Live investing is not configured on this site yet.");
      return;
    }
    setChecking(true);
    setIdentityStatus("Checking the class list…");
    const { allowed, error } = await isStudentAllowed({
      cohortYear: PITCH_II_COHORT_YEAR,
      cleanEmail,
    });
    setChecking(false);
    if (error) {
      setIdentityStatus("Could not reach the class list. Check your connection and try again.");
      return;
    }
    if (!allowed) {
      setIdentityStatus("This email is not on the class list. Use your enrolled W&M email.");
      return;
    }
    setIdentityStatus("");
    setEmail(cleanEmail);
    setInvestor({ name: cleanName, email: cleanEmail });
  };

  const switchInvestor = () => {
    if (dirty && total > 0 && !window.confirm("Discard the unsaved portfolio on this device?")) {
      return;
    }
    setInvestor(null);
    setSaved(null);
    setSaveStatus(null);
    setName("");
    setEmail("");
    setAllocations(emptyAllocations(PITCH_II_PROJECT_IDS));
  };

  const save = async () => {
    if (!investor || saving) return;
    const problem = validateAllocations(allocations, PITCH_II_PROJECT_IDS);
    if (problem) {
      setSaveStatus({ tone: "error", text: problem });
      return;
    }
    setSaving(true);
    setSaveStatus({ tone: "info", text: "Saving…" });
    const result = await submitInvestment({
      roundId: PITCH_II_ROUND_ID,
      name: investor.name,
      email: investor.email,
      allocations,
    });
    setSaving(false);
    if (result.error) {
      setSaveStatus({ tone: "error", text: describeSaveError(result.error) });
      refreshRound();
      return;
    }
    setSaved({ snapshot, savedAt: result.savedAt, mode: result.mode });
    setSaveStatus(null);
  };

  const statusLine = saveStatus
    ? saveStatus
    : closed
      ? { tone: "info", text: "Investing is closed. Your last saved portfolio is final." }
      : saved && !dirty
        ? {
            tone: "success",
            text: `Saved at ${formatTime(saved.savedAt)}. Adjust and save again anytime while investing is open.`,
          }
        : saved
          ? { tone: "info", text: "You have unsaved changes." }
          : { tone: "info", text: "Nothing saved yet." };

  const saveLabel = saving
    ? "Saving…"
    : !dirty
      ? "Saved ✓"
      : saved
        ? "Save changes"
        : "Save my investments";

  return (
    <div className={"page assignment-page invest-page" + (investor ? " has-dock" : "")}>
      <button className="assignment-back mono" type="button" onClick={() => onNavigate("syllabus")}>
        ← Back to syllabus &amp; schedule
      </button>

      <section className="assignment-hero">
        <div>
          <p className="kicker">
            <span className="dot">●</span> &nbsp; Pitch Perfect II · In-class investor round
          </p>
          <h1>
            You have $1M.
            <br /> Invest it wisely.
          </h1>
        </div>
        <Reveal as="dl" className="assignment-meta">
          <div>
            <dt>Budget</dt>
            <dd>{formatDollars(INVESTMENT_BUDGET)} per student</dd>
          </div>
          <div>
            <dt>Pitches</dt>
            <dd>{PITCH_PROJECTS.length} teams</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={round.state === "ready" && round.isOpen ? "pink" : ""}>{statusLabel}</dd>
          </div>
        </Reveal>
      </section>

      {closed && (
        <p className="invest-banner">
          <strong>Investing is closed.</strong> Your last saved portfolio is final.
        </p>
      )}
      {round.state === "missing" && (
        <p className="invest-banner">
          <strong>The investor round is not open yet.</strong> Prof. Yang will open it in class.
        </p>
      )}
      {round.state === "unconfigured" && (
        <p className="invest-banner">
          <strong>Preview only.</strong> Live saving is not configured on this build.
        </p>
      )}

      <div className="invest-layout">
        <aside className="invest-side">
          {investor ? (
            <div className="invest-panel">
              <p className="assignment-eyebrow mono">Your portfolio · {investor.name}</p>
              <dl className="invest-budget-figures">
                <div>
                  <dt>Invested</dt>
                  <dd>{formatDollars(total)}</dd>
                </div>
                <div>
                  <dt>Left to invest</dt>
                  <dd className={remaining === 0 ? "is-zero" : ""}>{formatDollars(remaining)}</dd>
                </div>
              </dl>
              <div className="invest-meter" aria-hidden="true">
                <span style={{ width: `${(total / INVESTMENT_BUDGET) * 100}%` }} />
              </div>
              <button className="btn btn-primary" type="button" disabled={!canSave} onClick={save}>
                {saveLabel}
              </button>
              <p className={`invest-panel-status is-${statusLine.tone}`} aria-live="polite">
                {statusLine.text}
              </p>
              <button className="invest-switch mono" type="button" onClick={switchInvestor}>
                Not {investor.name}? Switch investor
              </button>
            </div>
          ) : (
            <form className="invest-panel" onSubmit={startInvesting}>
              <p className="assignment-eyebrow mono">Step 1 · Investor</p>
              <h2>Who is investing?</h2>
              <label className="field">
                <span className="field-label">Full name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="First Last"
                  autoComplete="name"
                />
              </label>
              <label className="field">
                <span className="field-label">William &amp; Mary email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@wm.edu"
                  autoComplete="email"
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={checking}>
                {checking ? "Checking…" : "Start investing"}
              </button>
              {identityStatus && (
                <p className="invest-panel-status" aria-live="polite">
                  {identityStatus}
                </p>
              )}
            </form>
          )}

          <div className="invest-rules">
            <p className="assignment-eyebrow mono">How it works</p>
            <ol className="assignment-numbered-list">
              <li>Everyone starts with {formatDollars(INVESTMENT_BUDGET)} of pretend capital.</li>
              <li>
                As each team pitches, put any amount from $0 to $1M into the projects you would
                back.
              </li>
              <li>Your total across all six teams cannot go over $1M.</li>
              <li>Save anytime. Saving again replaces your portfolio until investing closes.</li>
            </ol>
          </div>
        </aside>

        <section className="invest-main" aria-label="Team pitches">
          {!investor && (
            <p className="invest-locked-note">
              Enter your name and W&amp;M email to unlock the investment controls.
            </p>
          )}
          <ul className="invest-cards">
            {PITCH_PROJECTS.map((project) => (
              <InvestmentCard
                key={project.id}
                project={project}
                allocations={allocations}
                disabled={!investor || closed}
                onSet={setAmount}
              />
            ))}
          </ul>
        </section>
      </div>

      {investor &&
        createPortal(
          <div className="invest-dock">
            <div className="invest-dock-figure">
              <span className="mono">Left to invest</span>
              <strong>{formatCompactDollars(remaining)}</strong>
            </div>
            <div className="invest-meter" aria-hidden="true">
              <span style={{ width: `${(total / INVESTMENT_BUDGET) * 100}%` }} />
            </div>
            <button className="btn btn-primary" type="button" disabled={!canSave} onClick={save}>
              {saving ? "Saving…" : !dirty ? "Saved ✓" : "Save"}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

// ── Instructor results page ───────────────────────────────────────────────────

export const PitchInvestResultsPage = ({ onNavigate }) => {
  const [rows, setRows] = React.useState([]);
  const [loadState, setLoadState] = React.useState({ state: "loading", message: "" });
  const [updatedAt, setUpdatedAt] = React.useState(null);
  const [round, refreshRound, setRound] = useRoundStatus(0);
  const [toggling, setToggling] = React.useState(false);
  const [toggleError, setToggleError] = React.useState("");

  const load = React.useCallback(async () => {
    const { rows: nextRows, error } = await fetchInvestments(PITCH_II_ROUND_ID);
    if (error) {
      setLoadState({
        state: isMissingSetupError(error) ? "missing" : "error",
        message: error.message || "",
      });
      return;
    }
    setRows(nextRows);
    setLoadState({ state: "ready", message: "" });
    setUpdatedAt(new Date());
  }, []);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load();
      refreshRound();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [load, refreshRound]);

  const toggleOpen = async () => {
    const nextOpen = !round.isOpen;
    setToggling(true);
    setToggleError("");
    const { error } = await setInvestmentRoundOpen(PITCH_II_ROUND_ID, nextOpen);
    setToggling(false);
    if (error) {
      setToggleError(error.message || "Could not update the round.");
      return;
    }
    setRound((current) => ({ ...current, state: "ready", isOpen: nextOpen }));
  };

  const summary = summarizeInvestments(rows, PITCH_II_PROJECT_IDS);
  const ranked = [...summary.projects].sort(
    (a, b) => b.total - a.total || PROJECTS_BY_ID[a.projectId].num - PROJECTS_BY_ID[b.projectId].num
  );
  const maxTotal = Math.max(...ranked.map((item) => item.total), 0);
  const leader = ranked[0]?.total > 0 ? PROJECTS_BY_ID[ranked[0].projectId] : null;
  const studentLink = `${window.location.host}${STUDENT_LINK_PATH}`;
  const missing = loadState.state === "missing" || round.state === "missing";

  return (
    <div className="page assignment-page invest-page invest-results-page">
      <button className="assignment-back mono" type="button" onClick={() => onNavigate("syllabus")}>
        ← Back to syllabus &amp; schedule
      </button>

      <section className="assignment-hero">
        <div>
          <p className="kicker">
            <span className="dot">●</span> &nbsp; Pitch Perfect II · Instructor view
          </p>
          <h1>
            Where the
            <br /> money went.
          </h1>
        </div>
        <Reveal as="dl" className="assignment-meta">
          <div>
            <dt>Status</dt>
            <dd className={round.isOpen ? "pink" : ""}>
              {round.state === "ready" ? (round.isOpen ? "Open for investing" : "Closed") : "—"}
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{updatedAt ? updatedAt.toLocaleTimeString() : "Loading…"}</dd>
          </div>
          <div>
            <dt>Refresh</dt>
            <dd>Every 5 seconds</dd>
          </div>
        </Reveal>
      </section>

      <div className="invest-results-toolbar">
        <button
          className={round.isOpen ? "btn btn-ghost" : "btn btn-primary"}
          type="button"
          disabled={toggling || round.state !== "ready"}
          onClick={toggleOpen}
        >
          {toggling ? "Updating…" : round.isOpen ? "Close investing" : "Open investing"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={load}>
          Refresh now
        </button>
        {toggleError && <span className="invest-panel-status is-error">{toggleError}</span>}
        <div className="invest-link-callout">
          <span className="mono">Students go to</span>
          <strong>{studentLink}</strong>
        </div>
      </div>

      {missing && (
        <p className="invest-banner">
          <strong>The database is not set up for this round yet.</strong> Run{" "}
          <code>supabase/pitch-investment-survey.sql</code> in the Supabase SQL Editor, then
          refresh.
        </p>
      )}
      {loadState.state === "error" && (
        <p className="invest-banner">
          <strong>Could not load responses.</strong> {loadState.message}
        </p>
      )}

      <dl className="invest-stats">
        <div>
          <dt>Investors saved</dt>
          <dd>{summary.investorCount}</dd>
        </div>
        <div>
          <dt>Capital invested</dt>
          <dd>{formatCompactDollars(summary.capitalDeployed)}</dd>
        </div>
        <div>
          <dt>Held back</dt>
          <dd>{formatCompactDollars(summary.capitalAvailable - summary.capitalDeployed)}</dd>
        </div>
        <div>
          <dt>Leading pitch</dt>
          <dd>{leader ? leader.shortName : "—"}</dd>
        </div>
      </dl>

      <ol className="invest-results-chart" aria-label="Total investment by team">
        {ranked.map((item, index) => {
          const project = PROJECTS_BY_ID[item.projectId];
          const share = summary.capitalDeployed ? item.total / summary.capitalDeployed : 0;
          const width = maxTotal ? (item.total / maxTotal) * 100 : 0;
          const average = item.investors ? Math.round(item.total / item.investors) : 0;
          const investorLabel = `${item.investors} investor${item.investors === 1 ? "" : "s"}`;
          return (
            <li
              key={item.projectId}
              className="invest-result-row"
              tabIndex={0}
              aria-label={`${project.shortName}: ${formatDollars(item.total)}, ${formatPercent(share)} of invested capital, ${investorLabel}, average check ${formatDollars(average)}`}
            >
              <span className="invest-result-rank mono">{index + 1}</span>
              <div className="invest-result-label">
                <strong>{project.shortName}</strong>
                <span className="mono">
                  Team {teamNumber(project.num)} · {project.advisor}
                </span>
              </div>
              <div className="invest-result-track" aria-hidden="true">
                <span className="invest-result-bar" style={{ width: `${width}%` }} />
                <div className="invest-result-tip">
                  {formatDollars(item.total)} total · average check {formatDollars(average)} ·{" "}
                  {item.investors} of {summary.investorCount} investors
                </div>
              </div>
              <div className="invest-result-value">
                <strong>{formatCompactDollars(item.total)}</strong>
                <span>
                  {formatPercent(share)} · {investorLabel}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <details className="invest-responses">
        <summary>Individual portfolios · instructor only, collapse before projecting</summary>
        {rows.length === 0 ? (
          <p className="invest-locked-note">No saved portfolios yet.</p>
        ) : (
          <div className="invest-table-wrap">
            <table className="invest-table">
              <thead>
                <tr>
                  <th>Student</th>
                  {PITCH_PROJECTS.map((project) => (
                    <th key={project.id}>{project.shortName}</th>
                  ))}
                  <th>Total</th>
                  <th>Saved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const allocations = normalizeAllocations(row.allocations, PITCH_II_PROJECT_IDS);
                  return (
                    <tr key={row.id}>
                      <td>
                        {row.student_name}
                        <small>{row.student_email}</small>
                      </td>
                      {PITCH_PROJECTS.map((project) => (
                        <td key={project.id} className={allocations[project.id] ? "" : "is-zero"}>
                          {formatCompactDollars(allocations[project.id])}
                        </td>
                      ))}
                      <td>{formatCompactDollars(row.total_invested)}</td>
                      <td>{formatTime(row.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
};
