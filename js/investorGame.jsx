/* Yang Ran Angels (classroom investor game) — student portfolio page, public team totals, and the instructor dashboard tab. */

import * as React from "react";
import { createPortal } from "react-dom";
import { Reveal } from "./motion.jsx";
import { EP_DATA, resolveCohortData } from "./data.js";
import { isSupabaseConfigured } from "./supabaseClient.js";
import { INSTRUCTOR_EMAIL } from "./config.js";
import {
  courseDay,
  groupActivity,
  fetchEvents,
  fetchFeedback,
  fetchMyResults,
  fetchAdminArchive,
  saveComment,
  updateEventWindow,
  GAME_COHORT_YEAR,
  GAME_PROJECT_IDS,
  INVESTMENT_BUDGET,
  INVESTMENT_STEP,
  INVESTOR_GAME_ID,
  PASSWORD_MAX,
  PLAYER_NAME_MAX,
  adminUpdatePlayer,
  cleanPlayerName,
  deletePlayer,
  emptyAllocations,
  fetchActivity,
  fetchGameStatus,
  fetchPlayers,
  fetchPublicTotals,
  fetchSession,
  formatCompactDollars,
  formatDollars,
  isMissingSetupError,
  isSessionEndedError,
  loginPlayer,
  maxForProject,
  normalizeAllocations,
  parseDollarInput,
  sanitizeAmount,
  saveAllocations,
  setAllocation,
  setGameSettings,
  summarizeInvestments,
  totalInvested,
  validateAllocations,
  validatePassword,
} from "../src/lib/investorGame";

const SHORT_NAMES = {
  "animal-crossing": "Animal Crossing",
  "smr-heat-load": "SMR Heat Load",
  "irays-pupillometry": "iRays",
  "usv-race-boat": "USV Race Boat",
  "laser-optics": "Laser Cooling Optics",
  "soft-bio-robot": "Soft Bio-Robot",
};

const cohortProjects = resolveCohortData(EP_DATA, GAME_COHORT_YEAR).projects || [];

const GAME_PROJECTS = GAME_PROJECT_IDS.map((id) => {
  const project = cohortProjects.find((item) => item.id === id);
  return {
    id,
    num: project?.num ?? 99,
    shortName: SHORT_NAMES[id] || project?.title || id,
    title: project?.title || "",
    advisor: project?.advisor || "",
  };
}).sort((a, b) => a.num - b.num);

const PROJECTS_BY_ID = Object.fromEntries(GAME_PROJECTS.map((project) => [project.id, project]));
const SESSION_KEY = `ep-investor-game-${INVESTOR_GAME_ID}`;
const GAME_LINK_PATH = "/#/invest";

const teamNumber = (num) => String(num).padStart(2, "0");
const teamName = (projectId) => PROJECTS_BY_ID[projectId]?.shortName || projectId || "—";

const readStoredToken = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null")?.token || null;
  } catch {
    return null;
  }
};

const writeStoredToken = (token) => {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token }));
  } catch {}
};

const clearStoredToken = () => {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}
};

const formatStamp = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const describeError = (error) =>
  isMissingSetupError(error)
    ? "The investor game is not open yet. Prof. Yang will open it in class."
    : error?.message || "Something went wrong. Try again.";

/** Polls open/closed, totals visibility, and the class session label. */
const useGameStatus = (pollMs) => {
  const [game, setGame] = React.useState({
    state: isSupabaseConfigured ? "loading" : "unconfigured",
    isOpen: false,
    totalsVisible: false,
    currentEvent: "",
  });

  const refresh = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { game: row, error } = await fetchGameStatus(INVESTOR_GAME_ID);
    if (error) {
      setGame((current) => ({
        ...current,
        state: isMissingSetupError(error) ? "missing" : "error",
      }));
      return;
    }
    setGame(
      row
        ? {
            state: "ready",
            isOpen: row.accepting === true,
            enabled: row.is_open,
            eventId: row.event_id,
            startsAt: row.starts_at,
            endsAt: row.ends_at,
            clockOffset: Date.parse(row.server_now) - Date.now(),
            totalsVisible: row.totals_visible,
            currentEvent: row.current_event || "",
          }
        : { state: "missing", isOpen: false, totalsVisible: false, currentEvent: "" }
    );
  }, []);

  React.useEffect(() => {
    refresh();
    if (!pollMs) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  const [tick, setTick] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const current = tick + (game.clockOffset || 0);
  const isOpen =
    game.state === "ready" &&
    game.enabled &&
    current >= Date.parse(game.startsAt) &&
    current < Date.parse(game.endsAt);
  return [{ ...game, isOpen }, refresh, setGame];
};

// ── Shared pieces ─────────────────────────────────────────────────────────────

const GameRules = ({ budget = INVESTMENT_BUDGET }) => (
  <section className="invest-rules" aria-label="Game rules">
    <p className="assignment-eyebrow mono">Rules</p>
    <ol className="assignment-numbered-list">
      <li>Your current budget is {formatDollars(budget)} in play money.</li>
      <li>Invest in steps of $10,000, in any team except your own.</li>
      <li>
        Your total can&apos;t go over {formatCompactDollars(budget)}. Money you don&apos;t invest
        stays in your wallet.
      </li>
      <li>
        During every class taught only by Prof. Yang, you can move money: pull it out of one team
        and put it into another.
      </li>
      <li>
        Investment changes save instantly. Each session’s closing results are saved permanently.
      </li>
      <li>Wear business casual or formal attire at every investment session.</li>
      <li>
        Investments and comments are accepted from 1–2 p.m. Eastern on session days, unless a
        different window is listed. You can log in and view anytime.
      </li>
      <li>
        Leave a short private comment for each other team and press Save comment. You can see your
        team’s received comments and the comments you left. Received feedback is anonymous. Only the
        instructor dashboard shows who said what.
      </li>
      <li>The class sees each team&apos;s total. Only Prof. Yang sees who invested what.</li>
    </ol>
  </section>
);

const GameDisclaimer = () => (
  <details className="privacy-notice invest-disclaimer">
    <summary>
      <span>
        <strong>Legal disclaimer</strong>
        <em>Classroom game · play money only</em>
      </span>
      <span className="privacy-toggle" aria-hidden="true" />
    </summary>
    <div className="privacy-notice-body">
      <h3>Play money, not investment advice</h3>
      <p>
        This is a teaching simulation for the Engineering Physics Capstone at William &amp; Mary.
        The $1,000,000 is play money with no cash value. Nothing here is an offer, solicitation, or
        recommendation to buy or sell anything, and no real money, equity, or ownership changes
        hands.
      </p>
      <h3>Not a real company or fund</h3>
      <p>
        Yang Ran Angels is the name of a classroom game. It is not a company, fund, partnership, or
        any other legal entity, and it does not offer, sell, or manage securities.
      </p>
      <h3>What is recorded</h3>
      <ul>
        <li>
          You log in with your first name and a password from Prof. Yang. The game does not ask for
          your email or student ID.
        </li>
        <li>Each change you make is recorded with the amounts, the time, and the class session.</li>
        <li>
          Passwords are stored hashed, but this is a low-security class tool. Keep your password to
          yourself.
        </li>
      </ul>
      <h3>Who sees what</h3>
      <ul>
        <li>The public totals page shows only the total raised by each team.</li>
        <li>
          Only the instructor sees all individual investments and change history. You can view your
          own archived portfolios.
        </li>
        <li>
          Comments are private to their author, the receiving team, and the instructor. Receiving
          teams never see commenter names; only the instructor dashboard identifies authors.
        </li>
      </ul>
      <p className="privacy-questions">
        Questions: <a href={`mailto:${INSTRUCTOR_EMAIL}`}>{INSTRUCTOR_EMAIL}</a>
      </p>
    </div>
  </details>
);

const formatWindow = (event) =>
  `${courseDay(event.starts_at)} · ${new Date(event.starts_at).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })}–${new Date(event.ends_at).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })} Eastern`;

const SessionTimer = ({ game }) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!game.startsAt || !game.endsAt) return null;
  const serverNow = now + (game.clockOffset || 0);
  const opening = serverNow < Date.parse(game.startsAt);
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(opening ? game.startsAt : game.endsAt) - serverNow) / 1000)
  );
  const countdown = `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`;
  return (
    <div className="invest-banner">
      <strong>{formatWindow({ starts_at: game.startsAt, ends_at: game.endsAt })}</strong>
      <p>
        {!game.enabled
          ? "Submissions paused by the instructor."
          : opening
            ? `Opens in ${countdown}`
            : seconds > 0
              ? `Investments and comments close in ${countdown}`
              : "Submissions closed. You can still log in and view."}
      </p>
    </div>
  );
};

const CommentEditor = ({ token, eventId, project, savedBody, disabled, onSaved }) => {
  const [draft, setDraft] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const body = draft ?? savedBody ?? "";
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = await saveComment(token, eventId, project.id, body);
    setBusy(false);
    if (result.error) {
      setStatus(describeError(result.error));
      return;
    }
    setStatus("Comment saved privately.");
    await onSaved();
    setDraft(null);
  };
  return (
    <form className="invest-comment-editor" onSubmit={submit}>
      <label htmlFor={`comment-${project.id}`}>Private comment for {project.shortName}</label>
      <textarea
        id={`comment-${project.id}`}
        maxLength={500}
        rows={3}
        value={body}
        placeholder="What works well? What should the team improve?"
        disabled={disabled || busy}
        onChange={(event) => {
          setDraft(event.target.value);
          setStatus("");
        }}
      />
      <div>
        <span className="mono">{body.length}/500</span>{" "}
        <button
          className="invest-chip"
          disabled={disabled || busy || !body.trim() || body === savedBody}
        >
          {busy ? "Saving…" : "Save comment"}
        </button>
      </div>
      <p className="invest-note" role="status">
        {status ||
          "The receiving team sees an anonymous quotation. Only the instructor dashboard shows your name."}
      </p>
    </form>
  );
};

const FeedbackList = ({ title, comments, showAuthors = false }) => (
  <section className="invest-feedback">
    <h3>{title}</h3>
    {comments.length === 0 ? (
      <p>No comments yet.</p>
    ) : (
      comments.map((comment) => (
        <article key={comment.id}>
          <strong>
            {teamName(comment.project_id)}
            {showAuthors ? ` · ${comment.player_name}` : ""}
          </strong>
          <small>
            {comment.event_label} · {formatStamp(comment.updated_at)}
          </small>
          <blockquote>“{comment.body}”</blockquote>
        </article>
      ))
    )}
  </section>
);

const SessionArchive = ({ events, results = [], instructor = false }) => (
  <section className="invest-archive">
    <h3>{instructor ? "Permanent session results" : "Session results"}</h3>
    <p>Closing portfolios are preserved for each session, including unchanged investments.</p>
    {events
      .filter((event) => event.finalized_at)
      .map((event) => (
        <details key={event.id}>
          <summary>
            {courseDay(event.starts_at)} · {event.label}
          </summary>
          {event.totals && (
            <div className="invest-table-wrap">
              <table className="invest-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Raised at close</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(event.totals).map(([id, total]) => (
                    <tr key={id}>
                      <td>{teamName(id)}</td>
                      <td>{formatDollars(total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {results
            .filter((r) => r.event_id === event.id)
            .map((result) => (
              <details key={result.player_id}>
                <summary>
                  {instructor ? result.player_name : "Your closing portfolio"} ·{" "}
                  {formatDollars(result.total_invested)}
                </summary>
                <ul>
                  {Object.entries(result.allocations).map(([id, amount]) => (
                    <li key={id}>
                      {teamName(id)}: {formatDollars(amount)}
                    </li>
                  ))}
                </ul>
                <p>
                  Wallet: {formatDollars(result.budget - result.total_invested)}
                  {result.is_practice ? " · Practice (excluded from totals)" : ""}
                </p>
              </details>
            ))}
        </details>
      ))}
    {!events.some((event) => event.finalized_at) && <p>No completed session results yet.</p>}
  </section>
);

const EventWindowEditor = ({ events, onUpdated, disabled }) => {
  const [selected, setSelected] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const upcoming = events.filter(
    (event) => !event.finalized_at && Date.parse(event.ends_at) > Date.now()
  );
  const event = upcoming.find((e) => e.id === selected) || upcoming[0];
  const time = (stamp) =>
    new Date(stamp).toLocaleTimeString("en-GB", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
    });
  const submit = async (e) => {
    e.preventDefault();
    // The SQL function accepts timezone-qualified local timestamps, so ET is correct on DST dates.
    const day = courseDay(event.starts_at);
    setSaving(true);
    const result = await updateEventWindow(
      event.id,
      `${day} ${start || time(event.starts_at)} America/New_York`,
      `${day} ${end || time(event.ends_at)} America/New_York`
    );
    setSaving(false);
    setStatus(result.error ? describeError(result.error) : "Session window saved.");
    if (!result.error) {
      setStart("");
      setEnd("");
      onUpdated();
    }
  };
  return (
    <section className="invest-window-editor">
      <h3>Session schedule and time overrides</h3>
      <p>
        All Yang-only classes · default 1–2 p.m. Eastern. Completed sessions cannot be reopened.
      </p>
      {event && (
        <form onSubmit={submit}>
          <label>
            Session
            <select
              value={event.id}
              onChange={(e) => {
                setSelected(e.target.value);
                setStart("");
                setEnd("");
                setStatus("");
              }}
            >
              {upcoming.map((e) => (
                <option key={e.id} value={e.id}>
                  {courseDay(e.starts_at)} · {e.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Opens (Eastern)
            <input
              type="time"
              required
              value={start || time(event.starts_at)}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Closes (Eastern)
            <input
              type="time"
              required
              value={end || time(event.ends_at)}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button className="btn btn-ghost" disabled={disabled || saving}>
            Save window
          </button>
        </form>
      )}
      <p role="status">{status}</p>
      <details>
        <summary>Full investment calendar</summary>
        <ul>
          {events.map((e) => (
            <li key={e.id}>
              {e.label} · {formatWindow(e)}
              {e.finalized_at ? " · Archived" : ""}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
};

// ── Student page ──────────────────────────────────────────────────────────────

const QUICK_STEPS = [
  { label: "−$10K", delta: -10_000 },
  { label: "+$10K", delta: 10_000 },
  { label: "+$100K", delta: 100_000 },
];

const InvestmentCard = ({
  project,
  allocations,
  ownTeamId,
  disabled,
  onSet,
  budget = INVESTMENT_BUDGET,
  commentEditor,
}) => {
  const isOwnTeam = project.id === ownTeamId;
  const amount = allocations[project.id] || 0;
  const cap = maxForProject(allocations, project.id, ownTeamId, budget);
  const [text, setText] = React.useState(null);
  const [note, setNote] = React.useState("");
  const inputId = `invest-${project.id}`;

  const apply = (requested, typed = false) => {
    const wanted = Math.max(0, requested);
    const stepped = sanitizeAmount(wanted, budget);
    setNote(
      stepped > cap
        ? cap === 0
          ? `Your ${formatCompactDollars(budget)} is fully invested. Pull money out of another team first.`
          : `Capped at ${formatDollars(cap)}, which is all you have left.`
        : typed && stepped !== wanted
          ? `Rounded to ${formatDollars(stepped)}. Investments go in $10K steps.`
          : ""
    );
    onSet(project.id, stepped);
  };

  const commitText = () => {
    if (text === null) return;
    if (disabled) {
      setText(null);
      return;
    }
    const parsed = parseDollarInput(text);
    setText(null);
    if (parsed === null) {
      setNote("Type a dollar amount, like 250000 or 250k.");
      return;
    }
    apply(parsed, true);
  };

  return (
    <li
      className={
        "invest-card" + (amount > 0 ? " has-investment" : "") + (isOwnTeam ? " is-own-team" : "")
      }
    >
      <div className="invest-card-head">
        <span className="invest-card-num mono">{teamNumber(project.num)}</span>
        <div className="invest-card-title">
          <h3>{project.shortName}</h3>
          <p>{project.title}</p>
          {project.advisor && <span className="mono">Advisor · {project.advisor}</span>}
        </div>
      </div>

      {isOwnTeam ? (
        <p className="invest-own-note">
          <strong>Your team</strong>
          You can&apos;t invest in your own team. Cheer them on instead.
        </p>
      ) : (
        <div className="invest-card-controls">
          <label className="invest-amount-field" htmlFor={inputId}>
            <span className="mono">Your investment</span>
            <input
              id={inputId}
              inputMode="decimal"
              autoComplete="off"
              disabled={disabled}
              value={text ?? formatDollars(amount)}
              onFocus={(event) => {
                // Keep the visible amount and select all of it, so typing replaces it.
                const input = event.currentTarget;
                setText(input.value);
                window.requestAnimationFrame(() => input.setSelectionRange(0, input.value.length));
              }}
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
            max={budget}
            step={INVESTMENT_STEP}
            value={amount}
            disabled={disabled}
            aria-label={`Investment in ${project.shortName}`}
            aria-valuetext={formatDollars(amount)}
            style={{
              "--fill": `${(amount / budget) * 100}%`,
              "--cap": `${(cap / budget) * 100}%`,
            }}
            onChange={(event) => apply(Number(event.target.value))}
          />

          <div className="invest-quick">
            {(budget > INVESTMENT_BUDGET
              ? [...QUICK_STEPS, { label: "+$1M", delta: 1_000_000 }]
              : QUICK_STEPS
            ).map((step) => (
              <button
                key={step.label}
                type="button"
                className="invest-chip"
                disabled={disabled || (step.delta < 0 ? amount === 0 : amount >= cap)}
                onClick={() => apply(amount + step.delta)}
              >
                {step.label}
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
              Pull out all
            </button>
          </div>
          {note && (
            <p className="invest-note" role="status">
              {note}
            </p>
          )}
        </div>
      )}
      {!isOwnTeam && commentEditor}
    </li>
  );
};

export const InvestorGamePage = ({ onNavigate }) => {
  const [session, setSession] = React.useState(null);
  const [comments, setComments] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [results, setResults] = React.useState([]);
  const [feedbackError, setFeedbackError] = React.useState("");
  const [restoring, setRestoring] = React.useState(
    () => isSupabaseConfigured && Boolean(readStoredToken())
  );
  const [showLogin, setShowLogin] = React.useState(false);
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loginStatus, setLoginStatus] = React.useState("");
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [allocations, setAllocations] = React.useState(() => emptyAllocations(GAME_PROJECT_IDS));
  const [saved, setSaved] = React.useState(null);
  const [savedAt, setSavedAt] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const savedRef = React.useRef(null);
  const [game, refreshGame] = useGameStatus(15_000);

  const ownTeamId = session?.teamProjectId ?? null;
  const budget = session?.budget ?? INVESTMENT_BUDGET;
  const total = totalInvested(allocations);
  const wallet = budget - total;
  const snapshot = JSON.stringify(allocations);
  const pending = Boolean(session && saved) && snapshot !== JSON.stringify(saved);
  const closed = game.state !== "ready" || !game.isOpen;
  const canEdit = Boolean(session) && !closed;

  const applySession = React.useCallback((player) => {
    const clean = normalizeAllocations(
      player.allocations,
      GAME_PROJECT_IDS,
      player.teamProjectId,
      player.budget
    );
    writeStoredToken(player.token);
    savedRef.current = clean;
    setSession(player);
    setAllocations(clean);
    setSaved(clean);
    setSavedAt(player.savedAt);
    setSaveError("");
    setPassword("");
    setLoginStatus("");
  }, []);

  const endSession = React.useCallback((message = "") => {
    clearStoredToken();
    savedRef.current = null;
    setSession(null);
    setComments([]);
    setResults([]);
    setFeedbackError("");
    setSaved(null);
    setSavedAt(null);
    setSaveError("");
    setAllocations(emptyAllocations(GAME_PROJECT_IDS));
    setShowLogin(Boolean(message));
    setLoginStatus(message);
  }, []);

  const refreshFeedback = React.useCallback(async () => {
    if (!session?.token) return;
    const [feedback, archive, calendar, restored] = await Promise.all([
      fetchFeedback(session.token),
      fetchMyResults(session.token),
      fetchEvents(),
      fetchSession(INVESTOR_GAME_ID, session.token),
    ]);
    if (readStoredToken() !== session.token) return;
    if (isSessionEndedError(restored.error) || (!restored.error && !restored.player)) {
      endSession("Your session ended. Log in again.");
      return;
    }
    if (restored.player && restored.player.teamProjectId !== session.teamProjectId)
      applySession(restored.player);
    else if (restored.player && restored.player.budget !== session.budget)
      setSession(restored.player);
    const error = feedback.error || archive.error || calendar.error || restored.error;
    setFeedbackError(error ? describeError(error) : "");
    if (!error) {
      setComments(feedback.data || []);
      setResults(archive.data || []);
      setEvents(calendar.data || []);
    }
  }, [session?.token, session?.teamProjectId, session?.budget, applySession, endSession]);
  React.useEffect(() => {
    refreshFeedback();
    const timer = window.setInterval(refreshFeedback, 15000);
    return () => window.clearInterval(timer);
  }, [refreshFeedback]);

  // Stay logged in across reloads on the same device.
  React.useEffect(() => {
    const token = readStoredToken();
    if (!token || !isSupabaseConfigured) return undefined;
    let alive = true;
    fetchSession(INVESTOR_GAME_ID, token).then(({ player, error }) => {
      if (!alive) return;
      if (player) applySession(player);
      else if (!error || isSessionEndedError(error)) clearStoredToken();
      setRestoring(false);
    });
    return () => {
      alive = false;
    };
  }, [applySession]);

  const persist = React.useCallback(
    async (next) => {
      if (!session) return;
      const problem = validateAllocations(
        next,
        GAME_PROJECT_IDS,
        session.teamProjectId,
        session.budget
      );
      if (problem) {
        setSaveError(problem);
        return;
      }
      setSaving(true);
      setSaveError("");
      const result = await saveAllocations({
        gameId: INVESTOR_GAME_ID,
        token: session.token,
        allocations: next,
      });
      setSaving(false);
      if (result.error) {
        if (isSessionEndedError(result.error)) {
          endSession("Your session ended. Log in again with your first name and password.");
          return;
        }
        // The game refused the change (for example, investing just closed): show what is saved.
        if (result.error.code === "42501" && savedRef.current) setAllocations(savedRef.current);
        setSaveError(describeError(result.error));
        refreshGame();
        return;
      }
      savedRef.current = next;
      setSaved(next);
      if (result.savedAt) setSavedAt(result.savedAt);
    },
    [session, endSession, refreshGame]
  );

  // Every change saves itself a moment after the student stops adjusting, so dragging a
  // slider records one change instead of dozens.
  React.useEffect(() => {
    if (!pending || closed || saving || saveError) return undefined;
    const next = JSON.parse(snapshot);
    const timer = window.setTimeout(() => persist(next), 450);
    return () => window.clearTimeout(timer);
  }, [pending, closed, saving, saveError, snapshot, persist]);

  React.useEffect(() => {
    if (game.state === "ready" && !game.isOpen && pending && !saving && savedRef.current) {
      setAllocations(savedRef.current);
      setSaveError(
        "The window closed before your last adjustment saved. Your saved portfolio is shown."
      );
    }
  }, [game.state, game.isOpen, pending, saving]);

  React.useEffect(() => {
    if (!pending && !saving) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending, saving]);

  const login = async (event) => {
    event.preventDefault();
    if (!cleanPlayerName(name) || !password.trim()) {
      setLoginStatus("Enter your first name and password.");
      return;
    }
    if (!isSupabaseConfigured) {
      setLoginStatus("The live game is not configured on this build.");
      return;
    }
    setLoggingIn(true);
    setLoginStatus("");
    const result = await loginPlayer({ gameId: INVESTOR_GAME_ID, name, password });
    setLoggingIn(false);
    if (result.error) {
      setLoginStatus(describeError(result.error));
      return;
    }
    if (result.status === "ok" && result.player) {
      applySession(result.player);
      return;
    }
    setLoginStatus(
      result.status === "locked"
        ? "Too many wrong tries for this name. Wait 2 minutes, then try again."
        : "That first name and password don't match. Ask Prof. Yang if you're stuck."
    );
  };

  const setAmount = (projectId, requested) => {
    setSaveError("");
    setAllocations((current) => setAllocation(current, projectId, requested, ownTeamId, budget));
  };

  const retrySave = () => setSaveError("");

  const logOut = () => {
    if (
      (pending || saving) &&
      !window.confirm("Your last change is still saving. Log out anyway?")
    ) {
      return;
    }
    endSession("");
  };

  const ownTeam = ownTeamId ? PROJECTS_BY_ID[ownTeamId] : null;
  const statusLabel = {
    loading: "Checking…",
    ready: game.isOpen ? "Open for investing" : "Closed",
    missing: "Not open yet",
    error: "Reconnecting…",
    unconfigured: "Preview only",
  }[game.state];

  const canRetry = Boolean(saveError) && pending && !closed;
  const saveLine = closed
    ? {
        tone: saveError ? "error" : "info",
        text:
          saveError || "Submissions are closed. You can view your saved portfolio and feedback.",
      }
    : saveError
      ? { tone: "error", text: saveError }
      : saving || pending
        ? { tone: "info", text: "Saving…" }
        : savedAt
          ? { tone: "success", text: `All changes saved · ${formatStamp(savedAt)}` }
          : { tone: "info", text: "Changes save automatically as you invest." };
  const dockStatus = closed
    ? { tone: "info", text: "Closed" }
    : saveError
      ? { tone: "error", text: "Not saved" }
      : saving || pending
        ? { tone: "info", text: "Saving…" }
        : { tone: "success", text: "Saved ✓" };

  return (
    <div className={"page assignment-page invest-page" + (session ? " has-dock" : "")}>
      <button className="assignment-back mono" type="button" onClick={() => onNavigate("syllabus")}>
        ← Back to syllabus &amp; schedule
      </button>

      <section className="assignment-hero">
        <div>
          <p className="kicker">
            <span className="dot">●</span> &nbsp; Yang Ran Angels
            {game.currentEvent ? ` · ${game.currentEvent}` : ""}
          </p>
          <h1>
            You have {formatCompactDollars(budget)}.
            <br /> Invest it wisely.
          </h1>
        </div>
        <Reveal as="dl" className="assignment-meta">
          <div>
            <dt>Budget</dt>
            <dd>
              {session?.isInstructor
                ? `${formatDollars(budget)} instructor budget`
                : `${formatDollars(budget)} per student`}
            </dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>{game.currentEvent || "—"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={game.state === "ready" && game.isOpen ? "pink" : ""}>{statusLabel}</dd>
          </div>
        </Reveal>
      </section>

      <SessionTimer game={game} />
      {closed && (
        <p className="invest-banner">
          <strong>Investing is closed right now.</strong> You can still log in to see your
          portfolio, archived results, and private feedback.
        </p>
      )}
      {game.state === "missing" && (
        <p className="invest-banner">
          <strong>The investor game is not open yet.</strong> Prof. Yang will open it in class.
        </p>
      )}
      {game.state === "unconfigured" && (
        <p className="invest-banner">
          <strong>Preview only.</strong> The live game is not configured on this build.
        </p>
      )}

      <div className="invest-layout">
        <aside className="invest-side">
          {session ? (
            <div className="invest-panel">
              <p className="assignment-eyebrow mono">
                {session.isPractice
                  ? "Practice account"
                  : session.isInstructor
                    ? "Instructor portfolio"
                    : "Your portfolio"}
              </p>
              <h2>Hi, {session.name}.</h2>
              <p className="invest-player-team">
                {ownTeam ? (
                  <>
                    Your team: <strong>{ownTeam.shortName}</strong>
                  </>
                ) : session.isInstructor ? (
                  "Instructor account · you can invest in every team"
                ) : (
                  "Practice account · not on a team"
                )}
              </p>
              <dl className="invest-budget-figures">
                <div>
                  <dt>Invested</dt>
                  <dd>{formatDollars(total)}</dd>
                </div>
                <div>
                  <dt>In your wallet</dt>
                  <dd className={wallet === 0 ? "is-zero" : ""}>{formatDollars(wallet)}</dd>
                </div>
              </dl>
              <div className="invest-meter" aria-hidden="true">
                <span style={{ width: `${(total / budget) * 100}%` }} />
              </div>
              <p className={`invest-panel-status is-${saveLine.tone}`} aria-live="polite">
                {saveLine.text}
              </p>
              {canRetry && (
                <button className="btn btn-ghost" type="button" onClick={retrySave}>
                  Try again
                </button>
              )}
              <button className="invest-switch mono" type="button" onClick={logOut}>
                Log out
              </button>
            </div>
          ) : restoring ? (
            <div className="invest-panel">
              <p className="invest-panel-status">Loading your portfolio…</p>
            </div>
          ) : showLogin ? (
            <form className="invest-panel" onSubmit={login}>
              <p className="assignment-eyebrow mono">Angel login</p>
              <h2>Who&apos;s investing?</h2>
              <label className="field">
                <span className="field-label">First name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={PLAYER_NAME_MAX}
                  autoComplete="username"
                  spellCheck={false}
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  maxLength={PASSWORD_MAX}
                  autoComplete="current-password"
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={loggingIn}>
                {loggingIn ? "Checking…" : "Log in"}
              </button>
              {loginStatus && (
                <p className="invest-panel-status is-error" aria-live="polite">
                  {loginStatus}
                </p>
              )}
              <button
                className="invest-switch mono"
                type="button"
                onClick={() => {
                  setShowLogin(false);
                  setLoginStatus("");
                }}
              >
                ← Back
              </button>
            </form>
          ) : (
            <div className="invest-panel">
              <p className="assignment-eyebrow mono">Yang Ran Angels</p>
              <h2>Ready to back a team?</h2>
              <p className="invest-panel-hint">
                Log in with your first name and the password Prof. Yang gave you. Your portfolio
                carries over from one class session to the next.
              </p>
              <button
                className="btn btn-primary invest-roll-btn"
                type="button"
                onClick={() => {
                  setShowLogin(true);
                  setLoginStatus("");
                }}
              >
                Angel Login
              </button>
            </div>
          )}

          <GameRules budget={budget} />
          <GameDisclaimer />
        </aside>

        <section className="invest-main" aria-label="Teams">
          {!session && (
            <p className="invest-locked-note">Use Angel Login to see and change your portfolio.</p>
          )}
          <ul className="invest-cards">
            {GAME_PROJECTS.map((project) => (
              <InvestmentCard
                key={project.id}
                project={project}
                allocations={allocations}
                ownTeamId={ownTeamId}
                budget={budget}
                disabled={!canEdit}
                onSet={setAmount}
                commentEditor={
                  session && (
                    <CommentEditor
                      key={`${session.token}-${game.eventId}-${project.id}`}
                      token={session.token}
                      eventId={game.eventId}
                      project={project}
                      disabled={!canEdit}
                      savedBody={
                        comments.find(
                          (c) =>
                            c.is_mine && c.event_id === game.eventId && c.project_id === project.id
                        )?.body
                      }
                      onSaved={refreshFeedback}
                    />
                  )
                }
              />
            ))}
          </ul>
          {session && (
            <>
              {feedbackError && (
                <p role="alert" className="invest-banner">
                  Could not load feedback or session results: {feedbackError}
                </p>
              )}
              <FeedbackList
                title="Anonymous feedback received by your team"
                comments={comments.filter((c) => c.project_id === ownTeamId)}
              />
              <FeedbackList
                title="Comments you left for other teams"
                comments={comments.filter((c) => c.is_mine)}
              />
              <SessionArchive events={events} results={results} />
            </>
          )}
        </section>
      </div>

      {session &&
        createPortal(
          <div className="invest-dock">
            <div className="invest-dock-figure">
              <span className="mono">In your wallet</span>
              <strong>{formatCompactDollars(wallet)}</strong>
            </div>
            <div className="invest-meter" aria-hidden="true">
              <span style={{ width: `${(total / budget) * 100}%` }} />
            </div>
            {canRetry ? (
              <button className="btn btn-primary" type="button" onClick={retrySave}>
                Retry
              </button>
            ) : (
              <span className={`invest-dock-status mono is-${dockStatus.tone}`} aria-live="polite">
                {dockStatus.text}
              </span>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

// ── Public totals page ────────────────────────────────────────────────────────

export const InvestorTotalsPage = ({ onNavigate }) => {
  const [events, setEvents] = React.useState([]);
  React.useEffect(() => {
    const load = async () => {
      const result = await fetchEvents();
      if (!result.error) setEvents(result.data || []);
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);
  const [totals, setTotals] = React.useState([]);
  const [loadState, setLoadState] = React.useState(
    isSupabaseConfigured ? "loading" : "unconfigured"
  );
  const [updatedAt, setUpdatedAt] = React.useState(null);
  const [game, refreshGame] = useGameStatus(0);

  const load = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { totals: next, error } = await fetchPublicTotals(INVESTOR_GAME_ID);
    if (error) {
      setLoadState(isMissingSetupError(error) ? "missing" : "error");
      return;
    }
    setTotals(next);
    setLoadState("ready");
    setUpdatedAt(new Date());
  }, []);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load();
      refreshGame();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [load, refreshGame]);

  const hidden = game.state === "ready" && !game.totalsVisible;
  const byId = Object.fromEntries(totals.map((item) => [item.projectId, item.total]));
  const ranked = GAME_PROJECTS.map((project) => ({ project, total: byId[project.id] || 0 })).sort(
    (a, b) => b.total - a.total || a.project.num - b.project.num
  );
  const maxTotal = Math.max(0, ...ranked.map((item) => item.total));
  const gameLink = `${window.location.host}${GAME_LINK_PATH}`;

  return (
    <div className="page assignment-page invest-page invest-results-page">
      <button className="assignment-back mono" type="button" onClick={() => onNavigate("syllabus")}>
        ← Back to syllabus &amp; schedule
      </button>

      <section className="assignment-hero">
        <div>
          <p className="kicker">
            <span className="dot">●</span> &nbsp; Yang Ran Angels · Live totals
          </p>
          <h1>
            Capital
            <br /> raised.
          </h1>
        </div>
        <Reveal as="dl" className="assignment-meta">
          <div>
            <dt>Session</dt>
            <dd>{game.currentEvent || "—"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={game.isOpen ? "pink" : ""}>
              {game.state === "ready" ? (game.isOpen ? "Open for investing" : "Closed") : "—"}
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{updatedAt ? updatedAt.toLocaleTimeString() : "—"}</dd>
          </div>
        </Reveal>
      </section>

      <div className="invest-results-toolbar">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => onNavigate("investorGame")}
        >
          Enter the game
        </button>
        <div className="invest-link-callout">
          <span className="mono">Play at</span>
          <strong>{gameLink}</strong>
        </div>
      </div>

      {(loadState === "missing" || game.state === "missing") && (
        <p className="invest-banner">
          <strong>The investor game is not open yet.</strong> Totals appear here once it starts.
        </p>
      )}
      {loadState === "unconfigured" && (
        <p className="invest-banner">
          <strong>Preview only.</strong> The live game is not configured on this build.
        </p>
      )}
      {hidden ? (
        <p className="invest-banner">
          <strong>Totals are hidden right now.</strong> Prof. Yang will reveal them after the
          pitches.
        </p>
      ) : (
        <ol className="invest-results-chart" aria-label="Capital raised by team">
          {ranked.map(({ project, total }, index) => (
            <li
              key={project.id}
              className="invest-result-row"
              tabIndex={0}
              aria-label={`${project.shortName}: ${formatDollars(total)} raised`}
            >
              <span className="invest-result-rank mono">{index + 1}</span>
              <div className="invest-result-label">
                <strong>{project.shortName}</strong>
                <span className="mono">
                  Team {teamNumber(project.num)} · {project.advisor}
                </span>
              </div>
              <div className="invest-result-track" aria-hidden="true">
                <span
                  className="invest-result-bar"
                  style={{ width: `${maxTotal ? (total / maxTotal) * 100 : 0}%` }}
                />
                <div className="invest-result-tip">{formatDollars(total)} raised</div>
              </div>
              <div className="invest-result-value">
                <strong>{formatCompactDollars(total)}</strong>
              </div>
            </li>
          ))}
        </ol>
      )}
      <SessionArchive events={hidden ? events.map((e) => ({ ...e, totals: null })) : events} />
      <p className="invest-totals-note">
        This page shows team totals only. Individual investments stay private.
      </p>
    </div>
  );
};

// ── Instructor dashboard tab ──────────────────────────────────────────────────

export const InvestorGameDashboardView = ({ onNavigate }) => {
  const [players, setPlayers] = React.useState([]);
  const [activity, setActivity] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [archive, setArchive] = React.useState({ comments: [], results: [] });
  const [loadState, setLoadState] = React.useState({
    state: isSupabaseConfigured ? "loading" : "unconfigured",
    message: "",
  });
  const [updatedAt, setUpdatedAt] = React.useState(null);
  const [game, refreshGame, setGame] = useGameStatus(0);
  const [busy, setBusy] = React.useState("");
  const [actionStatus, setActionStatus] = React.useState(null);

  const [activityFilter, setActivityFilter] = React.useState("all");

  const load = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const [playerResult, activityResult, calendar, archiveResult] = await Promise.all([
      fetchPlayers(INVESTOR_GAME_ID),
      fetchActivity(INVESTOR_GAME_ID),
      fetchEvents(),
      fetchAdminArchive(),
    ]);
    const failure =
      playerResult.error || activityResult.error || calendar.error || archiveResult.error;
    if (failure) {
      setLoadState({
        state: isMissingSetupError(failure) ? "missing" : "error",
        message: failure.message || "",
      });
      return;
    }
    setEvents(calendar.data || []);
    setArchive(archiveResult);
    setPlayers(playerResult.rows);
    setActivity(activityResult.rows);
    setLoadState({ state: "ready", message: "" });
    setUpdatedAt(new Date());
  }, []);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load();
      refreshGame();
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [load, refreshGame]);

  const updateGame = async (settings, successText) => {
    setBusy("game");
    const { error } = await setGameSettings(INVESTOR_GAME_ID, settings);
    setBusy("");
    if (error) {
      setActionStatus({ tone: "error", text: error.message || "Could not update the game." });
      return;
    }
    setGame((current) => ({
      ...current,
      state: "ready",
      enabled: settings.is_open ?? current.enabled,
      totalsVisible: settings.totals_visible ?? current.totalsVisible,
      currentEvent: settings.current_event ?? current.currentEvent,
    }));
    setActionStatus({ tone: "success", text: successText });
  };

  const resetPassword = async (player) => {
    const next = window.prompt(
      `New password for ${player.display_name}. This signs them out on every device.`
    );
    if (next === null) return;
    const problem = validatePassword(next);
    if (problem) {
      setActionStatus({ tone: "error", text: problem });
      return;
    }
    setBusy(player.id);
    const { error } = await adminUpdatePlayer({ playerId: player.id, newPassword: next });
    setBusy("");
    setActionStatus(
      error
        ? { tone: "error", text: error.message || "Could not reset the password." }
        : { tone: "success", text: `Password reset for ${player.display_name}.` }
    );
  };

  const changeTeam = async (player, teamId) => {
    if (!teamId || teamId === player.team_project_id) return;
    const inNewTeam =
      normalizeAllocations(player.allocations, GAME_PROJECT_IDS, null, player.budget)[teamId] || 0;
    const warning = inNewTeam
      ? ` Their ${formatDollars(inNewTeam)} in that team goes back to their wallet.`
      : "";
    if (!window.confirm(`Move ${player.display_name} to ${teamName(teamId)}?${warning}`)) return;
    setBusy(player.id);
    const { error } = await adminUpdatePlayer({ playerId: player.id, teamProjectId: teamId });
    setBusy("");
    setActionStatus(
      error
        ? { tone: "error", text: error.message || "Could not change the team." }
        : { tone: "success", text: `${player.display_name} is now on ${teamName(teamId)}.` }
    );
    load();
  };

  const removePlayer = async (player) => {
    if (
      !window.confirm(
        `Archive ${player.display_name}? Their login will be disabled. Permanent results, feedback, and history will be kept.`
      )
    ) {
      return;
    }
    setBusy(player.id);
    const { error } = await deletePlayer(player.id);
    setBusy("");
    setActionStatus(
      error
        ? { tone: "error", text: error.message || "Could not remove the student." }
        : { tone: "success", text: `${player.display_name} was removed.` }
    );
    load();
  };

  // Practice money never counts. The instructor's money counts toward totals but not the student count.
  const counted = players.filter((player) => !player.is_practice);
  const students = counted.filter((player) => !player.is_instructor);
  const summary = summarizeInvestments(counted, GAME_PROJECT_IDS);
  const rankedTeams = [...summary.projects].sort((a, b) => b.total - a.total);
  const invested = students.filter((player) => player.last_saved_at).length;

  const visibleActivity =
    activityFilter === "all"
      ? activity
      : activity.filter((entry) => entry.player_id === activityFilter);

  return (
    <section className="pitch-admin" aria-label="Yang Ran Angels">
      <div className="pitch-admin-head">
        <div>
          <p className="assignment-eyebrow mono">Yang Ran Angels · Instructor only</p>
          <h2>Who invested in whom</h2>
          <p className="pitch-admin-copy">
            Students log in with their first name and the password you gave them. Every change is
            logged under the current class session. The public page shows team totals only.
          </p>
        </div>
        <div className="pitch-admin-links">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => onNavigate?.("investorGame")}
          >
            Student page ↗
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => onNavigate?.("investorTotals")}
          >
            Public totals ↗
          </button>
        </div>
      </div>

      <div className="invest-results-toolbar">
        <button
          className={game.enabled ? "btn btn-ghost" : "btn btn-primary"}
          type="button"
          disabled={Boolean(busy) || game.state !== "ready"}
          onClick={() =>
            updateGame(
              { is_open: !game.enabled },
              game.enabled ? "Submissions paused." : "Scheduled submission windows enabled."
            )
          }
        >
          {game.enabled ? "Pause submissions" : "Enable scheduled submissions"}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={Boolean(busy) || game.state !== "ready"}
          onClick={() =>
            updateGame(
              { totals_visible: !game.totalsVisible },
              game.totalsVisible ? "Public totals are hidden." : "Public totals are visible."
            )
          }
        >
          {game.totalsVisible ? "Hide public totals" : "Show public totals"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={load}>
          Refresh
        </button>
        <span className="invest-results-updated mono">
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : ""}
        </span>
      </div>

      <SessionTimer game={game} />
      <EventWindowEditor
        events={events}
        disabled={Boolean(busy)}
        onUpdated={() => {
          load();
          refreshGame();
        }}
      />
      <p className="invest-banner">
        <strong>Instructor reminder:</strong> Send a follow-up email to each team after every
        investment event, using its saved results and private feedback.
      </p>
      {actionStatus && (
        <p className={`invest-panel-status is-${actionStatus.tone}`} aria-live="polite">
          {actionStatus.text}
        </p>
      )}
      {loadState.state === "missing" && (
        <p className="invest-banner">
          <strong>The game is not set up yet.</strong> Run <code>supabase/investor-game.sql</code>{" "}
          and then the private student seed file in the Supabase SQL Editor.
        </p>
      )}
      {loadState.state === "error" && (
        <p className="invest-banner">
          <strong>Could not load the game.</strong> {loadState.message}
        </p>
      )}

      <dl className="invest-stats">
        <div>
          <dt>Students who invested</dt>
          <dd>
            {invested} / {students.length}
          </dd>
        </div>
        <div>
          <dt>Capital invested</dt>
          <dd>{formatCompactDollars(summary.capitalDeployed)}</dd>
        </div>
        <div>
          <dt>Still in wallets</dt>
          <dd>{formatCompactDollars(summary.capitalAvailable - summary.capitalDeployed)}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>{game.currentEvent || "—"}</dd>
        </div>
      </dl>

      <div className="pitch-admin-subhead">
        <h3>Team totals</h3>
      </div>
      <div className="invest-table-wrap">
        <table className="invest-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Raised</th>
              <th>Investors</th>
              <th>Students on team</th>
            </tr>
          </thead>
          <tbody>
            {rankedTeams.map((team) => {
              const project = PROJECTS_BY_ID[team.projectId];
              return (
                <tr key={team.projectId}>
                  <td>
                    {project.shortName}
                    <small>
                      Team {teamNumber(project.num)} · {project.advisor}
                    </small>
                  </td>
                  <td>{formatDollars(team.total)}</td>
                  <td>{team.investors}</td>
                  <td>{team.teamPlayers}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pitch-admin-subhead">
        <h3>Students</h3>
      </div>
      {players.length === 0 ? (
        <p className="invest-locked-note">No students loaded yet.</p>
      ) : (
        <div className="invest-table-wrap">
          <table className="invest-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Team</th>
                {GAME_PROJECTS.map((project) => (
                  <th key={project.id}>{project.shortName}</th>
                ))}
                <th>Invested</th>
                <th>Last saved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const amounts = normalizeAllocations(
                  player.allocations,
                  GAME_PROJECT_IDS,
                  player.team_project_id,
                  player.budget
                );
                return (
                  <tr key={player.id}>
                    <td>
                      {player.display_name}
                      {player.is_practice && <span className="invest-badge">Practice</span>}
                      {player.is_instructor && <span className="invest-badge">Instructor</span>}
                    </td>
                    <td>
                      <select
                        value={player.team_project_id || ""}
                        disabled={busy === player.id}
                        aria-label={`Team for ${player.display_name}`}
                        onChange={(event) => changeTeam(player, event.target.value)}
                      >
                        {!player.team_project_id && <option value="">No team</option>}
                        {GAME_PROJECTS.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.shortName}
                          </option>
                        ))}
                      </select>
                    </td>
                    {GAME_PROJECTS.map((project) =>
                      project.id === player.team_project_id ? (
                        <td key={project.id} className="is-zero">
                          own team
                        </td>
                      ) : (
                        <td key={project.id} className={amounts[project.id] ? "" : "is-zero"}>
                          {formatCompactDollars(amounts[project.id])}
                        </td>
                      )
                    )}
                    <td>
                      {formatCompactDollars(totalInvested(amounts))}
                      {player.budget !== INVESTMENT_BUDGET && (
                        <small>of {formatCompactDollars(player.budget)}</small>
                      )}
                    </td>
                    <td>{formatStamp(player.last_saved_at)}</td>
                    <td>
                      <div className="invest-row-actions">
                        <button
                          type="button"
                          className="invest-chip"
                          disabled={busy === player.id}
                          onClick={() => resetPassword(player)}
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          className="invest-chip is-clear"
                          disabled={busy === player.id}
                          onClick={() => removePlayer(player)}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="pitch-admin-subhead">
        <h3>History of every change</h3>
        <select
          value={activityFilter}
          onChange={(event) => setActivityFilter(event.target.value)}
          aria-label="Filter history by student"
        >
          <option value="all">All students</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.display_name}
            </option>
          ))}
        </select>
      </div>
      {visibleActivity.length === 0 ? (
        <p className="invest-locked-note">No changes recorded yet.</p>
      ) : (
        <div className="invest-history">
          {groupActivity(visibleActivity, GAME_PROJECT_IDS).map(({ day, teams }) => (
            <details key={day}>
              <summary>
                {day} · {teams.length} teams
              </summary>
              {teams.map(({ projectId, people }) => (
                <details key={projectId}>
                  <summary>
                    {teamName(projectId)} · {people.length} angels
                  </summary>
                  {people.map(({ id, name, entries }) => (
                    <details key={id}>
                      <summary>
                        {name} · {entries.length} changes · net{" "}
                        {formatDollars(entries.reduce((sum, e) => sum + e.delta, 0))}
                      </summary>
                      <ul>
                        {entries.map((entry) => (
                          <li key={entry.id}>
                            {formatStamp(entry.created_at)} · {entry.event_label} ·{" "}
                            {entry.delta > 0 ? "+" : ""}
                            {formatDollars(entry.delta)} · balance{" "}
                            {formatDollars(entry.allocations_after[projectId] || 0)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </details>
              ))}
            </details>
          ))}
        </div>
      )}
      <SessionArchive events={events} results={archive.results} instructor />
      <details className="invest-feedback">
        <summary>All private team comments · {archive.comments.length}</summary>
        <FeedbackList
          title="Team feedback"
          showAuthors
          comments={archive.comments.map((c) => ({
            ...c,
            event_label: events.find((e) => e.id === c.event_id)?.label || c.event_id,
          }))}
        />
      </details>
    </section>
  );
};
