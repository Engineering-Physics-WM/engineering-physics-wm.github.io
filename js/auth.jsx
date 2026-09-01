import * as React from "react";
import {
  getSession,
  isBackendConfigured,
  signIn as signInApi,
  signOut as signOutApi,
} from "../src/lib/apiClient";
import { YangLink } from "./links.jsx";
import { INSTRUCTOR_EMAIL } from "./config.js";

const cleanEmail = (email) => email.trim().toLowerCase();

const AuthGate = ({ children }) => {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState(INSTRUCTOR_EMAIL);
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isBackendConfigured) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    getSession()
      .then(({ user }) => {
        if (!alive) return;
        setSession(user ? { user } : null);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setSession(null);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const userEmail = cleanEmail(session?.user?.email || "");
  const isInstructor = userEmail === INSTRUCTOR_EMAIL;

  React.useEffect(() => {
    if (!session || !userEmail || isInstructor) return;
    signOutApi();
    setStatus("This account is not authorized for the instructor dashboard.");
  }, [isInstructor, session, userEmail]);

  const signIn = async (event) => {
    event.preventDefault();
    const normalizedEmail = cleanEmail(email);

    if (normalizedEmail !== INSTRUCTOR_EMAIL) {
      setStatus("Use the instructor account for this dashboard.");
      return;
    }
    if (!password) {
      setStatus("Enter the dashboard password.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    let data;
    try {
      data = await signInApi(normalizedEmail, password);
    } catch {
      setSubmitting(false);
      setStatus("Could not sign in. Check the email and password.");
      return;
    }
    setSubmitting(false);
    setSession(data);
    setPassword("");
  };

  const signOut = async () => {
    setStatus("");
    await signOutApi();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="page">
        <section className="auth-panel">
          <p className="kicker">
            <span className="dot">●</span> &nbsp; Instructor dashboard
          </p>
          <h1>Checking access</h1>
          <p>Loading the dashboard session.</p>
        </section>
      </div>
    );
  }

  if (!isBackendConfigured) {
    return (
      <div className="page">
        <section className="auth-panel">
          <p className="kicker">
            <span className="dot">●</span> &nbsp; Instructor dashboard
          </p>
          <h1>Dashboard login is not configured</h1>
          <p>
            Add the live database URL and publishable key to the Vite environment before viewing
            this page.
          </p>
        </section>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="page">
        <section className="auth-panel">
          <p className="kicker">
            <span className="dot">●</span> &nbsp; Instructor dashboard
          </p>
          <h1>Sign in to view the dashboard</h1>
          <p>
            The project catalog and student ranking poll stay public. The dashboard is limited to{" "}
            <YangLink>Ran Yang</YangLink>.
          </p>
          <form className="auth-form" onSubmit={signIn}>
            <label className="field">
              <span className="field-label">W&amp;M email</span>
              <input
                type="email"
                value={email}
                autoComplete="username"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {status && <p className="auth-status">{status}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting} data-spark>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="auth-strip">
        <span>
          Signed in as <strong>{userEmail}</strong>
        </span>
        <button className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </div>
      {children}
    </>
  );
};

export { AuthGate, INSTRUCTOR_EMAIL };
