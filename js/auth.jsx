import * as React from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { YangLink } from "./links.jsx";

const INSTRUCTOR_EMAIL = "rxyan2@wm.edu";

const cleanEmail = (email) => email.trim().toLowerCase();

const AuthGate = ({ children }) => {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState(INSTRUCTOR_EMAIL);
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const userEmail = cleanEmail(session?.user?.email || "");
  const isInstructor = userEmail === INSTRUCTOR_EMAIL;

  React.useEffect(() => {
    if (!session || !userEmail || isInstructor) return;
    supabase.auth.signOut();
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setSubmitting(false);

    if (error) {
      setStatus("Could not sign in. Check the email and password.");
      return;
    }
    if (cleanEmail(data.user?.email || "") !== INSTRUCTOR_EMAIL) {
      await supabase.auth.signOut();
      setStatus("This account is not authorized for the instructor dashboard.");
      return;
    }
    setPassword("");
  };

  const signOut = async () => {
    setStatus("");
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="page">
        <section className="auth-panel">
          <p className="kicker"><span className="dot">●</span> &nbsp; Instructor dashboard</p>
          <h1>Checking access</h1>
          <p>Loading the dashboard session.</p>
        </section>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <section className="auth-panel">
          <p className="kicker"><span className="dot">●</span> &nbsp; Instructor dashboard</p>
          <h1>Dashboard login is not configured</h1>
          <p>Add the Supabase URL and publishable key to the Vite environment before viewing this page.</p>
        </section>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="page">
        <section className="auth-panel">
          <p className="kicker"><span className="dot">●</span> &nbsp; Instructor dashboard</p>
          <h1>Sign in to view the dashboard</h1>
          <p>The project catalog and student ranking poll stay public. The dashboard is limited to <YangLink>Ran Yang</YangLink>.</p>
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
        <span>Signed in as <strong>{userEmail}</strong></span>
        <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div>
      {children}
    </>
  );
};

export { AuthGate, INSTRUCTOR_EMAIL };
