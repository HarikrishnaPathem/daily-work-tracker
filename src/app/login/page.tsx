"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { timedFetch } from "@/lib/client-api";

type LoginResponse = { error?: unknown };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const requestId = globalThis.crypto.randomUUID();
      const requestStartedAt = performance.now();
      const response = await timedFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }, requestId);
      const data = await response.json().catch((): LoginResponse => ({}));
      if (process.env.NODE_ENV === "development") console.info(`[timing ${requestId}] client POST /api/auth/login complete=${(performance.now() - requestStartedAt).toFixed(1)}ms`);
      if (!response.ok) {
        const message = typeof data.error === "string" ? data.error : "Unable to sign in right now. Please try again.";
        throw new Error(message);
      }
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reach the sign-in service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-decoration" aria-label="Daily Work Tracker">
        <div className="login-decoration-orb orb-one" />
        <div className="login-decoration-orb orb-two" />
        <div className="login-pitch">
          <div className="mini-brand">
            <span className="mini-brand-mark"><Image src="/logo-sm.png" alt="" width={40} height={40} priority /></span>
            <span>Daily Work Tracker</span>
          </div>
          <span className="eyebrow light-eyebrow">A CLEARER VIEW OF EVERY DAY</span>
          <h2>Good work moves forward.</h2>
          <p>A calm place to share progress, clear blockers, and keep your team aligned.</p>
          <div className="login-note"><Icon name="check" /><span>Private team workspace<br /><small>Updates visible only to your organization</small></span></div>
          <div className="login-visual" aria-hidden="true">
            <div className="visual-window">
              <div className="visual-window-head"><span /><span /><span /><i /></div>
              <div className="visual-window-body">
                <div className="visual-chart"><i /><i /><i /><i /><i /><i /><i /></div>
                <div className="visual-side-lines"><i /><i /><i /><i /></div>
              </div>
              <div className="visual-window-footer"><i /><i /><i /></div>
            </div>
            <span className="visual-float float-one"><i /><b /><small /></span>
            <span className="visual-float float-two"><i /><b /><small /></span>
          </div>
        </div>
      </section>

      <section className="login-main" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-mobile-brand"><Image src="/logo-bg.png" alt="Kernn Automations" width={380} height={120} priority /></div>
          <span className="eyebrow login-eyebrow">DAILY WORK TRACKER</span>
          <h2 id="login-title">Welcome back</h2>
          <p className="login-description">Sign in to continue to your workspace using the account details provided by your team lead.</p>

          <form onSubmit={submit} className="login-form">
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />

            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" aria-describedby={error ? "login-error" : undefined} />
              <button type="button" className="password-visibility" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.6 9.8 6.4a1.2 1.2 0 0 1 0 1.2 15 15 0 0 1-3.1 3.6M6.2 6.2A15 15 0 0 0 2.2 11.4a1.2 1.2 0 0 0 0 1.2C3.2 14.4 6.8 19 12 19c.9 0 1.8-.2 2.6-.4" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 11.4C3.2 9.6 6.8 5 12 5s8.8 4.6 9.8 6.4a1.2 1.2 0 0 1 0 1.2C20.8 14.4 17.2 19 12 19s-8.8-4.6-9.8-6.4a1.2 1.2 0 0 1 0-1.2Z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>

            {error && <div id="login-error" role="alert" aria-live="polite" className="form-error login-error"><Icon name="alert" size={17} />{error}</div>}
            <button className="button primary full login-submit" disabled={loading}>
              {loading ? <><span className="spinner" />Signing in…</> : <>Sign in <Icon name="arrow" size={17} /> </>}
            </button>
          </form>
          <p className="login-help">Need access? Ask your HEAD to create an account.</p>
          <div className="login-footer"><span className="login-secure-dot" />Secure sign-in <span>·</span> Daily Work Tracker</div>
        </div>
      </section>
    </main>
  );
}
