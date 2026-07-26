// @ts-nocheck
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "./supabaseClient";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCircle,
  Mail,
} from "lucide-react";

/* ─── Time-of-day greeting ───────────────────────────────────────────── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── Friendly error messages ────────────────────────────────────────── */
function friendlyError(msg: string): string {
  if (!msg) return "Something went wrong. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Incorrect email or password. Please check and try again.";
  if (m.includes("email not confirmed"))
    return "Please verify your email first. Check your inbox for the confirmation link.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("password should be") || m.includes("password is too short"))
    return "Password must be at least 8 characters long.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error. Check your connection and try again.";
  if (m.includes("email address is invalid") || m.includes("unable to validate"))
    return "Please enter a valid email address.";
  if (m.includes("signup is disabled"))
    return "New sign-ups are currently disabled. Please contact the admin.";
  return msg;
}

/* ─── Password strength ───────────────────────────────────────────────── */
function getStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0–5
}
const STRENGTH_LABEL = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
const STRENGTH_COLOR = ["", "#EF4444", "#F59E0B", "#EAB308", "#10B981", "#059669"];

/* ─── Mode order — used to pick slide direction on transition ────────── */
const MODE_ORDER = { login: 0, signup: 1, forgot: 2, reset: 3 } as const;

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function Auth({
  onLogin,
  onOffline,
  onRecoveryComplete,
}: {
  onLogin: (session: any) => void;
  onOffline?: () => void;
  onRecoveryComplete?: () => void;
}) {
  // Detect password-recovery link in the URL hash (Supabase sends #access_token=...&type=recovery)
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      return "reset";
    }
    return "login";
  });

  // Remember Me: restore saved email
  const savedEmail =
    typeof window !== "undefined" ? localStorage.getItem("pf_remember_email") || "" : "";
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!savedEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState(1); // 1 = forward (slide in from right), -1 = back (from left)
  const shouldReduceMotion = useReducedMotion();

  // Field-level touched state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [confirmPassTouched, setConfirmPassTouched] = useState(false);
  const [newPassTouched, setNewPassTouched] = useState(false);
  const [confirmNewPassTouched, setConfirmNewPassTouched] = useState(false);

  // Focus state for styling
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmPassFocused, setConfirmPassFocused] = useState(false);
  const [newPassFocused, setNewPassFocused] = useState(false);
  const [confirmNewPassFocused, setConfirmNewPassFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const isForgot = mode === "forgot";
  const isSignUp = mode === "signup";
  const isReset = mode === "reset";

  // ── Auto-clear error when user starts typing ──────────────────────────
  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password, confirmPassword, displayName, newPassword, confirmNewPassword]);

  // ── Auto-dismiss success message after 6 seconds ─────────────────────
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, [msg]);

  // Inline validation messages
  const emailErr =
    emailTouched && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "Please enter a valid email address"
      : "";
  const passErr =
    passTouched && password && password.length < 8 ? "Minimum 8 characters required" : "";
  const confirmPassErr =
    confirmPassTouched && isSignUp && confirmPassword && confirmPassword !== password
      ? "Passwords do not match"
      : "";
  const newPassErr =
    newPassTouched && newPassword && newPassword.length < 8 ? "Minimum 8 characters required" : "";
  const confirmNewPassErr =
    confirmNewPassTouched && confirmNewPassword && confirmNewPassword !== newPassword
      ? "Passwords do not match"
      : "";

  const strength = isSignUp && password ? getStrength(password) : 0;

  // ── Handle submit ──────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);

    if (isReset) {
      setNewPassTouched(true);
      setConfirmNewPassTouched(true);
      if (!newPassword || newPassword.length < 8) return;
      if (newPassword !== confirmNewPassword) return;
      setLoading(true);
      setError(null);
      setMsg(null);
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setMsg("Password updated! You can now sign in with your new password.");
        window.history.replaceState({}, document.title, window.location.pathname);
        // The recovery link already established a live session — sign out so the user
        // must re-authenticate with their new password, and let App.tsx know it's safe
        // to stop force-showing this screen (see recoveryMode in App.tsx).
        await supabase.auth.signOut();
        onRecoveryComplete?.();
        setTimeout(() => switchMode("login"), 2500);
      } catch (err: any) {
        setError(friendlyError(err.message));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isForgot) setPassTouched(true);
    if (isSignUp) setConfirmPassTouched(true);

    const cleanEmail = email.trim();
    setEmail(cleanEmail); // persist trim to state
    const hasEmailErr = !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    const hasPassErr = !isForgot && (!password || password.length < 8);
    const hasConfirmErr = isSignUp && password !== confirmPassword;
    if (hasEmailErr || hasPassErr || hasConfirmErr) return;

    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMsg("Recovery link sent! Please check your inbox (and spam folder).");
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: displayName.trim()
              ? { full_name: displayName.trim(), display_name: displayName.trim() }
              : undefined,
          },
        });
        if (error) throw error;
        try {
          localStorage.setItem("pf_pending_onboarding", cleanEmail);
        } catch {}
        setMsg("Account created! Please check your inbox to verify your email before signing in.");
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (rememberMe) {
          localStorage.setItem("pf_remember_email", cleanEmail);
        } else {
          localStorage.removeItem("pf_remember_email");
        }
        if (data.session) onLogin(data.session);
      }
    } catch (err: any) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // Swaps the visible mode + resets field state. AnimatePresence around the mode panel
  // handles the exit/enter animation declaratively, so this just needs to set state once.
  const switchMode = (m: "login" | "signup" | "forgot" | "reset") => {
    if (m === mode) return;
    setSlideDir(MODE_ORDER[m] >= MODE_ORDER[mode] ? 1 : -1);
    setError(null);
    setMsg(null);
    setEmailTouched(false);
    setPassTouched(false);
    setConfirmPassTouched(false);
    setNewPassTouched(false);
    setConfirmNewPassTouched(false);
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPass(false);
    setShowConfirmPass(false);
    setShowNewPass(false);
    setShowConfirmNewPass(false);
    setMode(m);
  };

  // ── Shared input styles ────────────────────────────────────────────────
  const wrapCls = (focused: boolean, err: string) =>
    ["af-inp-wrap", focused ? "af-focused" : "", err ? "af-inp-err" : ""].filter(Boolean).join(" ");

  return (
    <div className="af-root">
      <div className="af-card">
        {/* Logo */}
        <div className="af-logo">
          <img
            src="/logo.png"
            alt="Personal Finance by Anand Mohta"
            style={{ width: 40, height: 40, objectFit: "contain" }}
          />
          <div>
            <div className="af-logo-name">Personal Finance</div>
            <div className="af-logo-tagline">by Anand Mohta</div>
          </div>
        </div>

        {/* Animated mode panel — old content slides out, new content slides in, on every mode change */}
        <AnimatePresence mode="wait" initial={false} custom={slideDir}>
          <motion.div
            key={mode}
            custom={slideDir}
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : slideDir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : slideDir * -24 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="af-card-head">
              {!isReset && !isForgot && !isSignUp && (
                <div className="af-greeting">{getGreeting()}</div>
              )}
              <h2 className="af-card-title">
                {isReset
                  ? "Set new password"
                  : isForgot
                    ? "Reset your password"
                    : isSignUp
                      ? "Create your account"
                      : "Sign in"}
              </h2>
              <p className="af-card-sub">
                {isReset
                  ? "Choose a strong new password for your account"
                  : isForgot
                    ? "Enter your email and we'll send a recovery link"
                    : isSignUp
                      ? "Set up access to your finance dashboard"
                      : "Enter your credentials to continue"}
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="af-alert af-alert-err" role="alert">
                <AlertCircle size={15} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Success alert */}
            {msg && (
              <div className="af-alert af-alert-ok" role="status">
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>{msg}</span>
              </div>
            )}

            {/* ══ RESET MODE — Set New Password ══ */}
            {isReset ? (
              <form onSubmit={handleAuth} className="af-form" noValidate>
                <div className="af-info-banner">
                  <KeyRound size={15} />
                  Password reset link verified. Enter your new password below.
                </div>

                {/* New password */}
                <div className="af-field">
                  <label className="af-lbl" htmlFor="af-newpass">
                    New Password
                  </label>
                  <div className={wrapCls(newPassFocused, newPassErr)}>
                    <input
                      id="af-newpass"
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setNewPassFocused(true)}
                      onBlur={() => {
                        setNewPassFocused(false);
                        setNewPassTouched(true);
                      }}
                      className="af-inp"
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      autoFocus
                      aria-invalid={!!newPassErr}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass((v) => !v)}
                      className="af-eye-btn"
                      aria-label={showNewPass ? "Hide password" : "Show password"}
                    >
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {newPassErr && (
                    <div className="af-err-msg" role="alert">
                      <AlertCircle size={11} />
                      {newPassErr}
                    </div>
                  )}
                  {newPassword && (
                    <div style={{ marginTop: 8 }} aria-live="polite">
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 99,
                              background:
                                getStrength(newPassword) >= i
                                  ? STRENGTH_COLOR[getStrength(newPassword)]
                                  : "#E2E8F0",
                              transition: "background 0.25s",
                            }}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: STRENGTH_COLOR[getStrength(newPassword)] || "#94A3B8",
                        }}
                      >
                        {STRENGTH_LABEL[getStrength(newPassword)] || ""}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div className="af-field">
                  <label className="af-lbl" htmlFor="af-confirmnewpass">
                    Confirm New Password
                  </label>
                  <div className={wrapCls(confirmNewPassFocused, confirmNewPassErr)}>
                    <input
                      id="af-confirmnewpass"
                      type={showConfirmNewPass ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      onFocus={() => setConfirmNewPassFocused(true)}
                      onBlur={() => {
                        setConfirmNewPassFocused(false);
                        setConfirmNewPassTouched(true);
                      }}
                      className="af-inp"
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      aria-invalid={!!confirmNewPassErr}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPass((v) => !v)}
                      className="af-eye-btn"
                      aria-label={showConfirmNewPass ? "Hide" : "Show"}
                    >
                      {showConfirmNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmNewPassErr && (
                    <div className="af-err-msg" role="alert">
                      <AlertCircle size={11} />
                      {confirmNewPassErr}
                    </div>
                  )}
                  {!confirmNewPassErr && confirmNewPassword && confirmNewPassword === newPassword && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        color: "#10B981",
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      <CheckCircle2 size={11} />
                      Passwords match
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="af-cta-btn">
                  {loading ? (
                    <Loader2 size={18} className="af-spin" />
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ══ STANDARD FORM (login / signup / forgot) ══ */
              <div className="af-form-container">
                <form onSubmit={handleAuth} className="af-form" noValidate>
                  {/* Display name — signup only */}
                  {isSignUp && (
                    <div className="af-field">
                      <label className="af-lbl" htmlFor="af-name">
                        Full Name{" "}
                        <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>
                          (optional)
                        </span>
                      </label>
                      <div className={wrapCls(nameFocused, "")}>
                        <span className="af-inp-icon">
                          <UserCircle size={16} />
                        </span>
                        <input
                          id="af-name"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onFocus={() => setNameFocused(true)}
                          onBlur={() => setNameFocused(false)}
                          className="af-inp af-inp-padded"
                          placeholder="e.g. Anand Mohta"
                          autoComplete="name"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="af-field">
                    <label className="af-lbl" htmlFor="af-email">
                      Email address
                    </label>
                    <div className={wrapCls(emailFocused, emailErr)}>
                      <span className="af-inp-icon">
                        <Mail size={16} />
                      </span>
                      <input
                        id="af-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => {
                          setEmailFocused(false);
                          setEmailTouched(true);
                          setEmail((e) => e.trim());
                        }}
                        className="af-inp af-inp-padded"
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus={!isSignUp}
                        aria-describedby={emailErr ? "af-email-err" : undefined}
                        aria-invalid={!!emailErr}
                      />
                    </div>
                    {emailErr && (
                      <div id="af-email-err" className="af-err-msg" role="alert">
                        <AlertCircle size={11} aria-hidden="true" />
                        {emailErr}
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  {!isForgot && (
                    <div className="af-field">
                      <label className="af-lbl" htmlFor="af-pass">
                        Password
                      </label>
                      <div className={wrapCls(passFocused, passErr)}>
                        <span className="af-inp-icon">
                          <Lock size={16} />
                        </span>
                        <input
                          id="af-pass"
                          type={showPass ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setPassFocused(true)}
                          onBlur={() => {
                            setPassFocused(false);
                            setPassTouched(true);
                          }}
                          className="af-inp af-inp-padded"
                          placeholder={
                            isSignUp ? "Create a strong password (8+ chars)" : "Enter your password"
                          }
                          autoComplete={isSignUp ? "new-password" : "current-password"}
                          aria-describedby={passErr ? "af-pass-err" : undefined}
                          aria-invalid={!!passErr}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass((v) => !v)}
                          className="af-eye-btn"
                          aria-label={showPass ? "Hide password" : "Show password"}
                        >
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {passErr && (
                        <div id="af-pass-err" className="af-err-msg" role="alert">
                          <AlertCircle size={11} aria-hidden="true" />
                          {passErr}
                        </div>
                      )}

                      {/* Password strength — signup only */}
                      {isSignUp && password && (
                        <div style={{ marginTop: 8 }} aria-live="polite">
                          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: 3,
                                  borderRadius: 99,
                                  background: strength >= i ? STRENGTH_COLOR[strength] : "#E2E8F0",
                                  transition: "background 0.25s",
                                }}
                              />
                            ))}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: STRENGTH_COLOR[strength] || "#94A3B8",
                            }}
                          >
                            {STRENGTH_LABEL[strength]}
                            {strength < 3 && (
                              <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                                {" "}
                                — add uppercase, numbers or symbols
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confirm password — signup only */}
                  {isSignUp && (
                    <div className="af-field">
                      <label className="af-lbl" htmlFor="af-confirmpass">
                        Confirm Password
                      </label>
                      <div className={wrapCls(confirmPassFocused, confirmPassErr)}>
                        <span className="af-inp-icon">
                          <Lock size={16} />
                        </span>
                        <input
                          id="af-confirmpass"
                          type={showConfirmPass ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setConfirmPassFocused(true)}
                          onBlur={() => {
                            setConfirmPassFocused(false);
                            setConfirmPassTouched(true);
                          }}
                          className="af-inp af-inp-padded"
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          aria-invalid={!!confirmPassErr}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass((v) => !v)}
                          className="af-eye-btn"
                          aria-label={showConfirmPass ? "Hide" : "Show"}
                        >
                          {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {confirmPassErr && (
                        <div className="af-err-msg" role="alert">
                          <AlertCircle size={11} />
                          {confirmPassErr}
                        </div>
                      )}
                      {!confirmPassErr && confirmPassword && confirmPassword === password && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            color: "#10B981",
                            fontWeight: 600,
                            marginTop: 2,
                          }}
                        >
                          <CheckCircle2 size={11} />
                          Passwords match
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remember me + Forgot password — login only */}
                  {!isForgot && !isSignUp && (
                    <div className="af-meta-row">
                      <label className="af-remember">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="af-chk"
                        />
                        <span>Remember me</span>
                      </label>
                      <button type="button" onClick={() => switchMode("forgot")} className="af-link">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Primary CTA */}
                  <button type="submit" disabled={loading} className="af-cta-btn">
                    {loading ? (
                      <Loader2 size={18} className="af-spin" aria-hidden="true" />
                    ) : (
                      <>
                        <span>
                          {isForgot ? "Send Recovery Link" : isSignUp ? "Create Account" : "Sign In"}
                        </span>
                        <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Mode switcher */}
            {!isReset && (
              <div className="af-switch">
                {isForgot ? (
                  <button onClick={() => switchMode("login")} className="af-link">
                    ← Back to sign in
                  </button>
                ) : (
                  <span className="af-switch-txt">
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <button
                      onClick={() => switchMode(isSignUp ? "login" : "signup")}
                      className="af-link af-link-bold"
                    >
                      {isSignUp ? "Sign in" : "Create one"}
                    </button>
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Demo / offline mode */}
        {onOffline && (
          <div className="af-demo-wrap">
            <button onClick={onOffline} className="af-demo-btn">
              Continue with demo account
            </button>
          </div>
        )}
      </div>

      <style>{AF_STYLES}</style>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */
const AF_STYLES = `
/* ── Root ─────────────────────────────── */
.af-root {
  --af-accent: #3F3D9E;
  --af-accent-hover: #2E2C79;
  --af-text: #0F172A;
  --af-text-secondary: #374151;
  --af-border: #E2E8F0;
  --af-border-hover: #CBD5E1;

  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #F4F5F8;
  padding: 24px;
}

.af-card {
  width: 100%;
  max-width: 400px;
  background: #FFFFFF;
  border: 1px solid var(--af-border);
  border-radius: 14px;
  padding: 32px 28px 28px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.05);
  animation: af-card-enter 0.35s cubic-bezier(0.22,1,0.36,1) both;
}

/* Logo */
.af-logo {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--af-border);
}
.af-logo-name {
  font-size: 15px; font-weight: 800;
  color: var(--af-text); letter-spacing: -0.02em; line-height: 1;
}
.af-logo-tagline {
  font-size: 11px; font-weight: 500;
  color: #94A3B8; margin-top: 3px;
}

/* Greeting label */
.af-greeting {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: #94A3B8; margin-bottom: 8px;
}

/* Card header */
.af-card-head { margin-bottom: 22px; }
.af-card-title {
  font-size: 21px; font-weight: 800;
  color: var(--af-text); letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 6px;
}
.af-card-sub { font-size: 13.5px; color: #64748B; line-height: 1.5; font-weight: 400; }

/* Alerts */
.af-alert {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: 10px;
  font-size: 13px; font-weight: 500; line-height: 1.45; margin-bottom: 18px;
  animation: af-rise 0.25s cubic-bezier(0.22,1,0.36,1);
}
.af-alert-err { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; animation: af-shake 0.4s ease-out; }
.af-alert-ok  { background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; }

/* Info banner (reset mode) */
.af-info-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; background: rgba(63,61,158,0.06);
  border-radius: 9px; border: 1px solid rgba(63,61,158,0.15);
  margin-bottom: 4px; font-size: 13px; color: var(--af-accent); font-weight: 500;
}

/* Form container */
.af-form-container { display: flex; flex-direction: column; gap: 0; }

/* Form */
.af-form { display: flex; flex-direction: column; gap: 16px; }
.af-field { display: flex; flex-direction: column; gap: 6px; }
.af-lbl { font-size: 12.5px; font-weight: 600; color: var(--af-text-secondary); letter-spacing: -0.01em; }

/* Input wrapper */
.af-inp-wrap {
  position: relative; display: flex; align-items: center;
  background: #F8FAFC; border: 1.5px solid var(--af-border); border-radius: 10px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.af-inp-wrap:hover:not(.af-focused):not(.af-inp-err) { border-color: var(--af-border-hover); }
.af-inp-wrap.af-focused {
  border-color: var(--af-accent); background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(63,61,158,0.1);
}
.af-inp-wrap.af-inp-err { border-color: #F87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.1); }
.af-inp {
  flex: 1; background: none; border: none; outline: none;
  padding: 11px 14px; font-size: 14.5px;
  font-family: 'Inter', -apple-system, sans-serif;
  color: var(--af-text); font-weight: 400; min-width: 0;
}
.af-inp-padded { padding-left: 8px; }
.af-inp-icon {
  display: flex; align-items: center; padding-left: 13px; color: #94A3B8; flex-shrink: 0;
  transition: color 0.15s;
}
.af-focused .af-inp-icon { color: var(--af-accent); }
.af-inp::placeholder { color: #B0B8C8; }
.af-eye-btn {
  background: none; border: none; padding: 0 13px; color: #94A3B8;
  cursor: pointer; display: flex; align-items: center; flex-shrink: 0; transition: color 0.15s;
}
.af-eye-btn:hover { color: var(--af-accent); }
.af-err-msg { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #EF4444; font-weight: 500; }

/* Remember + Forgot row */
.af-meta-row { display: flex; align-items: center; justify-content: space-between; margin-top: -4px; }
.af-remember {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #4B5563; cursor: pointer; font-weight: 500; user-select: none;
}
.af-chk {
  width: 15px; height: 15px; accent-color: var(--af-accent); cursor: pointer; border-radius: 4px;
  margin: 0;
}

/* Link button */
.af-link {
  background: none; border: none; font-size: 13px; font-weight: 600; color: var(--af-accent);
  cursor: pointer; padding: 0; font-family: inherit; transition: color 0.15s; text-decoration: none;
}
.af-link:hover { color: var(--af-accent-hover); text-decoration: underline; }
.af-link-bold { font-weight: 700; }

/* CTA Button */
.af-cta-btn {
  width: 100%; padding: 12px 20px;
  background: var(--af-accent);
  color: #FFFFFF; border: none; border-radius: 10px;
  font-size: 14.5px; font-weight: 700; font-family: 'Inter', sans-serif;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background 0.15s ease, transform 0.1s ease;
  margin-top: 4px; letter-spacing: -0.005em;
}
.af-cta-btn:hover:not(:disabled) { background: var(--af-accent-hover); }
.af-cta-btn:active:not(:disabled) { transform: translateY(1px); }
.af-cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Mode switcher */
.af-switch { text-align: center; margin-top: 20px; }
.af-switch-txt { font-size: 13px; color: #6B7280; font-weight: 400; }

/* Demo button */
.af-demo-wrap { text-align: center; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--af-border); }
.af-demo-btn {
  background: none; border: none; font-size: 12.5px; font-weight: 600;
  color: #94A3B8; cursor: pointer; font-family: inherit; transition: color 0.15s;
}
.af-demo-btn:hover { color: var(--af-accent); }

/* ══════════════════════════════════════
   DARK MODE
══════════════════════════════════════ */
@media (prefers-color-scheme: dark) {
  .af-root {
    --af-accent: #8583E0;
    --af-accent-hover: #A5A3F0;
    --af-text: #F9FAFB;
    --af-text-secondary: #D1D5DB;
    --af-border: #2A3140;
    --af-border-hover: #3D4556;
    background: #0B0E14;
  }
  .af-card {
    background: #12161F;
    box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
  }
  .af-card-sub { color: #9CA3AF; }
  .af-inp-wrap { background: #171C27; }
  .af-inp-wrap.af-focused { background: #1A2030; }
  .af-inp::placeholder { color: #4B5563; }
  .af-inp-icon { color: #6B7280; }
  .af-switch-txt { color: #9CA3AF; }
  .af-alert-err { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #FCA5A5; }
  .af-alert-ok  { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25); color: #6EE7B7; }
  .af-info-banner { background: rgba(133,131,224,0.1); border-color: rgba(133,131,224,0.25); }
  .af-demo-btn { color: #6B7280; }
  .af-greeting { color: #6B7280; }
  .af-logo-tagline { color: #6B7280; }
}

@media (prefers-reduced-motion: reduce) {
  .af-card { animation: none !important; }
}

/* ══════════════════════════════════════
   KEYFRAME ANIMATIONS
══════════════════════════════════════ */
@keyframes af-rise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes af-card-enter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes af-shake {
  0%,100% { transform: translateX(0); }
  15%     { transform: translateX(-6px); }
  30%     { transform: translateX(6px); }
  45%     { transform: translateX(-4px); }
  60%     { transform: translateX(4px); }
  75%     { transform: translateX(-2px); }
}
.af-spin { animation: af-spin-anim 0.75s linear infinite; }
@keyframes af-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ══════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════ */
@media (max-width: 480px) {
  .af-root { padding: 16px; align-items: flex-start; padding-top: 40px; }
  .af-card { padding: 26px 20px 22px; }
}
`;
