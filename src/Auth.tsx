// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase, capturedUrlHash } from "./supabaseClient";
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
  Wallet,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Check,
  X,
  ArrowLeft,
  PlayCircle,
} from "lucide-react";
import { BrandMark } from "./components/ui/BrandMark";

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
  if (m.includes("expired") || m.includes("invalid or has expired"))
    return "This link has expired or was already used. Please request a new one.";
  return msg;
}

/* ─── Reads Supabase's error hash (#error=...&error_code=...&error_description=...) ─── */
function parseHashError(hash: string): string | null {
  if (!hash || !hash.includes("error")) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const desc = params.get("error_description");
  return desc ? desc.replace(/\+/g, " ") : "This link is invalid or has expired.";
}

/* ─── Password Strength Calculations ──────────────────────────────────── */
interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function checkPasswordCriteria(pw: string): PasswordCriteria {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };
}

function getStrength(pw: string): number {
  if (!pw) return 0;
  const c = checkPasswordCriteria(pw);
  let score = 0;
  if (c.minLength) score++;
  if (pw.length >= 12) score++;
  if (c.hasUpper) score++;
  if (c.hasNumber) score++;
  if (c.hasSpecial) score++;
  return Math.min(score, 5); // 0-5
}

const STRENGTH_COLOR = ["", "#EF4444", "#F59E0B", "#EAB308", "#10B981", "#059669"];

/* ─── Mode order — used to pick slide direction on transition ────────── */
const MODE_ORDER = { login: 0, signup: 1, forgot: 2, reset: 3 } as const;

export default function Auth({
  onLogin,
  onOffline,
  onRecoveryComplete,
}: {
  onLogin: (session: any) => void;
  onOffline?: () => void;
  onRecoveryComplete?: () => void;
}) {
  // Detect password-recovery link in the URL hash
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(() => {
    if (capturedUrlHash.includes("type=recovery")) {
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
  const [error, setError] = useState<string | null>(() => {
    const hashErr = parseHashError(capturedUrlHash);
    return hashErr ? friendlyError(hashErr) : null;
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
  const onCapsLockKey = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"));

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
  const isLogin = mode === "login";

  // Auto-clear error when user modifies fields
  const prevFieldsRef = useRef([email, password, confirmPassword, displayName, newPassword, confirmNewPassword]);
  useEffect(() => {
    const current = [email, password, confirmPassword, displayName, newPassword, confirmNewPassword];
    const changed = current.some((v, i) => v !== prevFieldsRef.current[i]);
    prevFieldsRef.current = current;
    if (!changed) return;
    if (error) setError(null);
    if (showResendLink) setShowResendLink(false);
  }, [email, password, confirmPassword, displayName, newPassword, confirmNewPassword, error, showResendLink]);

  // Auto-dismiss success message
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, [msg]);

  // Strip error hash after reading
  useEffect(() => {
    if (capturedUrlHash.includes("error") && window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Validation
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

  const criteria = isSignUp ? checkPasswordCriteria(password) : checkPasswordCriteria(newPassword);
  const strength = isSignUp ? getStrength(password) : getStrength(newPassword);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
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
    setEmail(cleanEmail);
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
        setTimeout(() => switchMode("login"), 3000);
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
        if (data.session) {
          onLogin(data.session);
        } else {
          setError("Unable to sign in right now. Please try again.");
        }
      }
    } catch (err: any) {
      const rawMsg: string = err?.message || "";
      setError(friendlyError(rawMsg));
      setShowResendLink(!isSignUp && !isForgot && rawMsg.toLowerCase().includes("email not confirmed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    setResendState("sending");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail });
      if (error) throw error;
      setResendState("sent");
      setShowResendLink(false);
      setError(null);
      setMsg("Verification email resent! Please check your inbox (and spam folder).");
    } catch (err: any) {
      setResendState("idle");
      setError(friendlyError(err.message));
    }
  };

  const handleCancelReset = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    window.history.replaceState({}, document.title, window.location.pathname);
    onRecoveryComplete?.();
    switchMode("login");
  };

  const switchMode = (m: "login" | "signup" | "forgot" | "reset") => {
    if (m === mode) return;
    setSlideDir(MODE_ORDER[m] >= MODE_ORDER[mode] ? 1 : -1);
    setError(null);
    setMsg(null);
    setShowResendLink(false);
    setResendState("idle");
    setCapsLockOn(false);
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

  const wrapCls = (focused: boolean, err: string) =>
    ["af-inp-wrap", focused ? "af-focused" : "", err ? "af-inp-err" : ""].filter(Boolean).join(" ");

  return (
    <div className="af-shell">
      {/* ── Brand & Executive Showcase Panel (Desktop) ── */}
      <div className="af-brand-panel" aria-hidden="true">
        <div className="af-brand-ambient" />
        <div className="af-brand-grid" />

        <div className="af-brand-content">
          {/* Brand header */}
          <div className="af-brand-logo">
            <div className="af-logo-glow-wrap">
              <BrandMark size={48} />
            </div>
            <div>
              <div className="af-brand-name">ArthaDrishti</div>
              <div className="af-brand-tagline">Private Wealth Operating System</div>
            </div>
          </div>

          {/* Headline */}
          <div className="af-brand-hero">
            <div className="af-hero-badge">
              <Sparkles size={13} className="af-badge-icon" />
              <span>Institutional Wealth Intelligence</span>
            </div>
            <h1 className="af-brand-headline">
              Unify your wealth.
              <br />
              <span className="af-brand-headline-accent">Master your future.</span>
            </h1>
            <p className="af-brand-sub">
              Consolidate bank accounts, mutual funds, direct stocks, EPF, real estate, and liabilities into an institutional-grade, real-time command center.
            </p>
          </div>

          {/* Live Holographic Net Worth Mockup Card */}
          <div className="af-preview-card">
            <div className="af-preview-header">
              <div className="af-preview-pill">
                <span className="af-live-dot" />
                <span>Live Portfolio Summary</span>
              </div>
              <div className="af-preview-growth">
                <TrendingUp size={13} />
                <span>+18.4% YoY</span>
              </div>
            </div>

            <div className="af-preview-amount">
              <div className="af-preview-currency">₹</div>
              <div className="af-preview-val">1,48,50,000</div>
            </div>
            <div className="af-preview-lbl">Net Worth across 14 assets &amp; 3 banks</div>

            {/* Asset distribution bar */}
            <div className="af-asset-bar">
              <div className="af-asset-seg af-seg-mf" style={{ width: "42%" }} title="Mutual Funds & Stocks (42%)" />
              <div className="af-asset-seg af-seg-re" style={{ width: "34%" }} title="Real Estate & Gold (34%)" />
              <div className="af-asset-seg af-seg-epf" style={{ width: "16%" }} title="EPF & PPF (16%)" />
              <div className="af-asset-seg af-seg-cash" style={{ width: "8%" }} title="Liquid Cash (8%)" />
            </div>

            <div className="af-preview-tags">
              <span className="af-tag"><span className="af-tag-dot af-dot-mf" />Equities ₹62.3L</span>
              <span className="af-tag"><span className="af-tag-dot af-dot-re" />Real Estate ₹50.5L</span>
              <span className="af-tag"><span className="af-tag-dot af-dot-epf" />EPF/PPF ₹23.7L</span>
              <span className="af-tag"><span className="af-tag-dot af-dot-cash" />Cash ₹12.0L</span>
            </div>
          </div>

          {/* Key pillars */}
          <ul className="af-brand-features">
            <li>
              <div className="af-feat-icon-box">
                <Wallet size={16} />
              </div>
              <div>
                <strong>Automated Multi-Account Tracking</strong>
                <p>Track cash flow, loans, and credit cards with instant reconciliation.</p>
              </div>
            </li>
            <li>
              <div className="af-feat-icon-box">
                <ShieldCheck size={16} />
              </div>
              <div>
                <strong>Zero-Telemetry Privacy</strong>
                <p>256-bit encrypted storage. Your financial data is private and never sold.</p>
              </div>
            </li>
          </ul>

          {/* Footer signature */}
          <div className="af-brand-footer">
            Designed &amp; Engineered by Anand Mohta
          </div>
        </div>
      </div>

      {/* ── Form Panel (Right) ── */}
      <div className="af-form-panel">
        <div className="af-card">
          {/* Mobile-only brand banner */}
          <div className="af-logo-mobile">
            <BrandMark size={40} />
            <div>
              <div className="af-logo-name">ArthaDrishti</div>
              <div className="af-logo-tagline">Personal Finance by Anand Mohta</div>
            </div>
          </div>

          {/* Segmented Auth Mode Switcher (only shown for login/signup) */}
          {(isLogin || isSignUp) && (
            <div className="af-segment-switch" role="tablist" aria-label="Authentication Mode">
              <button
                type="button"
                role="tab"
                aria-selected={isLogin}
                className={`af-segment-btn ${isLogin ? "af-segment-active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignUp}
                className={`af-segment-btn ${isSignUp ? "af-segment-active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Animated Mode Transition */}
          <AnimatePresence mode="wait" initial={false} custom={slideDir}>
            <motion.div
              key={mode}
              custom={slideDir}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8, scale: shouldReduceMotion ? 1 : 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8, scale: shouldReduceMotion ? 1 : 0.99 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header */}
              <div className="af-card-head">
                {isLogin && (
                  <div className="af-greeting-badge">
                    <span className="af-greeting-sun" />
                    <span>{getGreeting()}</span>
                  </div>
                )}
                <h2 className="af-card-title">
                  {isReset
                    ? "Set new password"
                    : isForgot
                      ? "Reset your password"
                      : isSignUp
                        ? "Join ArthaDrishti"
                        : "Welcome back"}
                </h2>
                <p className="af-card-sub">
                  {isReset
                    ? "Create a secure new password for your wealth account."
                    : isForgot
                      ? "Enter your verified email and we'll send an instant recovery link."
                      : isSignUp
                        ? "Start tracking your complete net worth in one unified dashboard."
                        : "Enter your credentials to access your financial dashboard."}
                </p>
              </div>

              {/* Error alert */}
              {error && (
                <div className="af-alert af-alert-err" role="alert">
                  <AlertCircle size={16} className="af-alert-icon" aria-hidden="true" />
                  <div className="af-alert-body">
                    <span>{error}</span>
                    {showResendLink && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendState === "sending"}
                        className="af-resend-link"
                      >
                        {resendState === "sending" ? "Sending…" : "Resend verification email"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Success alert */}
              {msg && (
                <div className="af-alert af-alert-ok" role="status">
                  <CheckCircle2 size={16} className="af-alert-icon" aria-hidden="true" />
                  <span>{msg}</span>
                </div>
              )}

              {/* ══ RESET MODE ══ */}
              {isReset ? (
                <form onSubmit={handleAuth} className="af-form" noValidate>
                  <div className="af-info-banner">
                    <KeyRound size={16} />
                    <span>Password reset link verified. Enter your new password below.</span>
                  </div>

                  {/* New Password */}
                  <div className="af-field">
                    <label className="af-lbl" htmlFor="af-newpass">
                      New Password
                    </label>
                    <div className={wrapCls(newPassFocused, newPassErr)}>
                      <span className="af-inp-icon">
                        <Lock size={16} />
                      </span>
                      <input
                        id="af-newpass"
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setNewPassFocused(true)}
                        onBlur={() => {
                          setNewPassFocused(false);
                          setNewPassTouched(true);
                          setCapsLockOn(false);
                        }}
                        onKeyDown={onCapsLockKey}
                        onKeyUp={onCapsLockKey}
                        className="af-inp af-inp-padded"
                        placeholder="Create strong password (8+ chars)"
                        autoComplete="new-password"
                        autoFocus={!isMobileViewport}
                        aria-invalid={!!newPassErr}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowNewPass((v) => !v)}
                        className="af-eye-btn"
                        aria-label={showNewPass ? "Hide password" : "Show password"}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {capsLockOn && newPassFocused && (
                      <div className="af-caps-msg" role="status">
                        <AlertCircle size={12} aria-hidden="true" />
                        Caps Lock is active
                      </div>
                    )}
                    {newPassErr && (
                      <div className="af-err-msg" role="alert">
                        <AlertCircle size={12} />
                        {newPassErr}
                      </div>
                    )}

                    {/* Criteria Checklist */}
                    {newPassword && (
                      <div className="af-criteria-card">
                        <div className="af-criteria-grid">
                          <span className={`af-crit-item ${criteria.minLength ? "af-crit-ok" : ""}`}>
                            {criteria.minLength ? <Check size={12} /> : <X size={12} />} 8+ characters
                          </span>
                          <span className={`af-crit-item ${criteria.hasUpper ? "af-crit-ok" : ""}`}>
                            {criteria.hasUpper ? <Check size={12} /> : <X size={12} />} Uppercase
                          </span>
                          <span className={`af-crit-item ${criteria.hasNumber ? "af-crit-ok" : ""}`}>
                            {criteria.hasNumber ? <Check size={12} /> : <X size={12} />} Number
                          </span>
                          <span className={`af-crit-item ${criteria.hasSpecial ? "af-crit-ok" : ""}`}>
                            {criteria.hasSpecial ? <Check size={12} /> : <X size={12} />} Symbol
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="af-field">
                    <label className="af-lbl" htmlFor="af-confirmnewpass">
                      Confirm New Password
                    </label>
                    <div className={wrapCls(confirmNewPassFocused, confirmNewPassErr)}>
                      <span className="af-inp-icon">
                        <Lock size={16} />
                      </span>
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
                        className="af-inp af-inp-padded"
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        aria-invalid={!!confirmNewPassErr}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowConfirmNewPass((v) => !v)}
                        className="af-eye-btn"
                        aria-label={showConfirmNewPass ? "Hide" : "Show"}
                      >
                        {showConfirmNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmNewPassErr && (
                      <div className="af-err-msg" role="alert">
                        <AlertCircle size={12} />
                        {confirmNewPassErr}
                      </div>
                    )}
                    {!confirmNewPassErr && confirmNewPassword && confirmNewPassword === newPassword && (
                      <div className="af-match-msg">
                        <CheckCircle2 size={12} />
                        Passwords match perfectly
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

                  <div className="af-switch">
                    <button type="button" onClick={handleCancelReset} className="af-back-link">
                      <ArrowLeft size={14} />
                      <span>Cancel and return to sign in</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* ══ STANDARD FORM (login / signup / forgot) ══ */
                <form onSubmit={handleAuth} className="af-form" noValidate>
                  {/* Display Name (Sign Up only) */}
                  {isSignUp && (
                    <div className="af-field">
                      <label className="af-lbl" htmlFor="af-name">
                        Full Name <span className="af-optional-tag">(optional)</span>
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
                          autoFocus={!isMobileViewport}
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
                        placeholder="name@example.com"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoFocus={!isSignUp && !isMobileViewport}
                        aria-describedby={emailErr ? "af-email-err" : undefined}
                        aria-invalid={!!emailErr}
                      />
                    </div>
                    {emailErr && (
                      <div id="af-email-err" className="af-err-msg" role="alert">
                        <AlertCircle size={12} aria-hidden="true" />
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
                            setCapsLockOn(false);
                          }}
                          onKeyDown={onCapsLockKey}
                          onKeyUp={onCapsLockKey}
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
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowPass((v) => !v)}
                          className="af-eye-btn"
                          aria-label={showPass ? "Hide password" : "Show password"}
                        >
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {capsLockOn && passFocused && (
                        <div className="af-caps-msg" role="status">
                          <AlertCircle size={12} aria-hidden="true" />
                          Caps Lock is on
                        </div>
                      )}
                      {passErr && (
                        <div id="af-pass-err" className="af-err-msg" role="alert">
                          <AlertCircle size={12} aria-hidden="true" />
                          {passErr}
                        </div>
                      )}

                      {/* Password Criteria Checklist (Sign Up only) */}
                      {isSignUp && password && (
                        <div className="af-criteria-card" aria-live="polite">
                          <div className="af-strength-bar-wrap">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="af-strength-segment"
                                style={{
                                  background:
                                    strength >= i ? STRENGTH_COLOR[strength] : "var(--af-border)",
                                }}
                              />
                            ))}
                          </div>
                          <div className="af-criteria-grid">
                            <span className={`af-crit-item ${criteria.minLength ? "af-crit-ok" : ""}`}>
                              {criteria.minLength ? <Check size={12} /> : <X size={12} />} 8+ chars
                            </span>
                            <span className={`af-crit-item ${criteria.hasUpper ? "af-crit-ok" : ""}`}>
                              {criteria.hasUpper ? <Check size={12} /> : <X size={12} />} Uppercase
                            </span>
                            <span className={`af-crit-item ${criteria.hasNumber ? "af-crit-ok" : ""}`}>
                              {criteria.hasNumber ? <Check size={12} /> : <X size={12} />} Number
                            </span>
                            <span className={`af-crit-item ${criteria.hasSpecial ? "af-crit-ok" : ""}`}>
                              {criteria.hasSpecial ? <Check size={12} /> : <X size={12} />} Symbol
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confirm Password (Sign Up only) */}
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
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowConfirmPass((v) => !v)}
                          className="af-eye-btn"
                          aria-label={showConfirmPass ? "Hide" : "Show"}
                        >
                          {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {confirmPassErr && (
                        <div className="af-err-msg" role="alert">
                          <AlertCircle size={12} />
                          {confirmPassErr}
                        </div>
                      )}
                      {!confirmPassErr && confirmPassword && confirmPassword === password && (
                        <div className="af-match-msg">
                          <CheckCircle2 size={12} />
                          Passwords match
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remember me & Forgot Password */}
                  {!isForgot && !isSignUp && (
                    <div className="af-meta-row">
                      <label className="af-remember">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="af-chk"
                        />
                        <span>Remember my email</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="af-link af-forgot-btn"
                      >
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
                          {isForgot
                            ? "Send Recovery Link"
                            : isSignUp
                              ? "Create Free Account"
                              : "Sign In to Dashboard"}
                        </span>
                        <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {/* Back to Sign In button for Forgot Mode */}
                  {isForgot && (
                    <div className="af-switch">
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="af-back-link"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Sign In</span>
                      </button>
                    </div>
                  )}
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Demo Sandbox Quick Exploration */}
          {onOffline && (
            <div className="af-demo-section">
              <div className="af-divider">
                <span>OR EXPLORE INSTANTLY</span>
              </div>
              <button onClick={onOffline} className="af-demo-btn" type="button">
                <PlayCircle size={16} className="af-demo-icon" />
                <span className="af-demo-text">Open Interactive Sandbox Demo</span>
                <span className="af-demo-badge">No Login Needed</span>
              </button>
            </div>
          )}

          {/* Privacy & Trust micro-footer */}
          <div className="af-form-footer">
            <ShieldCheck size={13} />
            <span>End-to-End Secure • 256-bit Encryption • Private Storage</span>
          </div>
        </div>
      </div>

      <style>{AF_STYLES}</style>
    </div>
  );
}

/* ─── Modern Stylesheet ────────────────────────────────────────────────── */
const AF_STYLES = `
/* ── Theme Tokens ───────────────────────── */
.af-shell {
  --af-accent: #C5A152;
  --af-accent-hover: #D9B35F;
  --af-accent-dark: #96600A;
  --af-primary-btn: linear-gradient(135deg, #C5A152 0%, #A47728 100%);
  --af-primary-btn-hover: linear-gradient(135deg, #D4B062 0%, #B88531 100%);
  --af-primary-btn-text: #FFFFFF;
  --af-text: #0F172A;
  --af-text-secondary: #475569;
  --af-text-muted: #64748B;
  --af-border: #E2E8F0;
  --af-border-focus: #C5A152;
  --af-border-hover: #CBD5E1;
  --af-card-bg: #FFFFFF;
  --af-page-bg: #F8FAFC;
  --af-input-bg: #F8FAFC;
  --af-input-bg-focus: #FFFFFF;
  --af-segment-bg: #EEF2F6;
  --af-shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.05);

  min-height: 100vh;
  display: flex;
  font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--af-page-bg);
  color: var(--af-text);
  overflow-x: hidden;
}

/* ── Brand Panel (Left Showcase) ────────── */
.af-brand-panel {
  position: relative;
  flex: 0 0 44%;
  min-width: 420px;
  max-width: 580px;
  overflow: hidden;
  background: linear-gradient(155deg, #090D16 0%, #0F1523 50%, #151D30 100%);
  color: #F8FAFC;
  padding: 60px 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.af-brand-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(circle at 85% 15%, rgba(197, 161, 82, 0.15) 0%, transparent 45%),
    radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.12) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 60%);
}

.af-brand-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}

.af-brand-content {
  position: relative;
  z-index: 2;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Brand Logo */
.af-brand-logo {
  display: flex;
  align-items: center;
  gap: 14px;
}

.af-logo-glow-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.af-logo-glow-wrap::after {
  content: '';
  position: absolute;
  inset: -6px;
  background: radial-gradient(circle, rgba(197, 161, 82, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;
}

.af-brand-name {
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  line-height: 1.1;
}

.af-brand-tagline {
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 3px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* Brand Hero */
.af-brand-hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.af-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 9999px;
  background: rgba(197, 161, 82, 0.12);
  border: 1px solid rgba(197, 161, 82, 0.28);
  font-size: 11.5px;
  font-weight: 600;
  color: #E5C378;
  width: fit-content;
}

.af-badge-icon {
  color: #FCD34D;
}

.af-brand-headline {
  font-family: 'Outfit', sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: #FFFFFF;
  margin: 0;
}

.af-brand-headline-accent {
  background: linear-gradient(135deg, #E5C378 0%, #FFFFFF 60%, #C5A152 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.af-brand-sub {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(241, 245, 249, 0.75);
  margin: 0;
  font-weight: 400;
}

/* Live Holographic Mockup Card */
.af-preview-card {
  background: rgba(21, 29, 48, 0.65);
  border: 1px solid rgba(197, 161, 82, 0.22);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 
    0 10px 30px -10px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.af-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.af-preview-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.af-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 8px #10B981;
  animation: af-pulse 2s infinite;
}

.af-preview-growth {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #34D399;
  background: rgba(16, 185, 129, 0.12);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.af-preview-amount {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 2px;
}

.af-preview-currency {
  font-size: 20px;
  font-weight: 600;
  color: #C5A152;
}

.af-preview-val {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #FFFFFF;
  font-family: 'Outfit', sans-serif;
}

.af-preview-lbl {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.af-asset-bar {
  display: flex;
  height: 6px;
  border-radius: 9999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  margin-top: 4px;
}

.af-asset-seg {
  height: 100%;
  transition: width 0.4s ease;
}

.af-seg-mf { background: #3B82F6; }
.af-seg-re { background: #C5A152; }
.af-seg-epf { background: #10B981; }
.af-seg-cash { background: #8B5CF6; }

.af-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.af-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
}

.af-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.af-dot-mf { background: #3B82F6; }
.af-dot-re { background: #C5A152; }
.af-dot-epf { background: #10B981; }
.af-dot-cash { background: #8B5CF6; }

/* Features List */
.af-brand-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.af-brand-features li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.af-feat-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(197, 161, 82, 0.12);
  border: 1px solid rgba(197, 161, 82, 0.25);
  color: #E5C378;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.af-brand-features strong {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 2px;
}

.af-brand-features p {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.af-brand-footer {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.02em;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* ── Form Panel (Right) ─────────────────── */
.af-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  min-height: 100vh;
  overflow-y: auto;
}

.af-card {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.af-logo-mobile {
  display: none;
}

/* Segmented Mode Switcher */
.af-segment-switch {
  display: flex;
  background: var(--af-segment-bg);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--af-border);
  position: relative;
  user-select: none;
}

.af-segment-btn {
  flex: 1;
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  color: var(--af-text-secondary);
  background: transparent;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}

.af-segment-btn:hover:not(.af-segment-active) {
  color: var(--af-text);
}

.af-segment-active {
  background: var(--af-card-bg);
  color: var(--af-text);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Card Header */
.af-card-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.af-greeting-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #B8720A;
  margin-bottom: 2px;
}

.af-greeting-sun {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}

.af-card-title {
  font-family: 'Outfit', sans-serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--af-text);
  margin: 0;
  line-height: 1.2;
}

.af-card-sub {
  font-size: 13.5px;
  color: var(--af-text-muted);
  line-height: 1.5;
  margin: 0;
}

/* Alerts */
.af-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  margin-bottom: 4px;
}

.af-alert-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.af-alert-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.af-alert-err {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #B91C1C;
}

.af-alert-ok {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  color: #15803D;
}

.af-info-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(197, 161, 82, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(197, 161, 82, 0.25);
  font-size: 13px;
  color: #96600A;
  font-weight: 500;
  margin-bottom: 8px;
}

/* Form Structure */
.af-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.af-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.af-lbl {
  font-size: 13px;
  font-weight: 600;
  color: var(--af-text-secondary);
  letter-spacing: -0.01em;
}

.af-optional-tag {
  font-size: 11px;
  font-weight: 400;
  color: var(--af-text-muted);
}

/* Inputs */
.af-inp-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--af-input-bg);
  border: 1.5px solid var(--af-border);
  border-radius: 12px;
  transition: all 0.15s ease;
}

.af-inp-wrap:hover:not(.af-focused):not(.af-inp-err) {
  border-color: var(--af-border-hover);
}

.af-inp-wrap.af-focused {
  border-color: var(--af-border-focus);
  background: var(--af-input-bg-focus);
  box-shadow: 0 0 0 3px rgba(197, 161, 82, 0.18);
}

.af-inp-wrap.af-inp-err {
  border-color: #EF4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.af-inp {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  padding: 12px 14px;
  font-size: 14.5px;
  font-family: inherit;
  color: var(--af-text);
  min-width: 0;
}

.af-inp-padded {
  padding-left: 8px;
}

.af-inp-icon {
  display: flex;
  align-items: center;
  padding-left: 14px;
  color: var(--af-text-muted);
  flex-shrink: 0;
  transition: color 0.15s;
}

.af-focused .af-inp-icon {
  color: var(--af-accent);
}

.af-eye-btn {
  background: none;
  border: none;
  padding: 0 14px;
  color: var(--af-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.15s;
}

.af-eye-btn:hover {
  color: var(--af-text);
}

.af-err-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #EF4444;
  font-weight: 500;
  margin-top: 2px;
}

.af-caps-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #D97706;
  font-weight: 600;
  margin-top: 2px;
}

.af-match-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #10B981;
  font-weight: 600;
  margin-top: 2px;
}

/* Criteria Checklist */
.af-criteria-card {
  background: var(--af-segment-bg);
  border: 1px solid var(--af-border);
  border-radius: 10px;
  padding: 10px 12px;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.af-strength-bar-wrap {
  display: flex;
  gap: 4px;
}

.af-strength-segment {
  flex: 1;
  height: 4px;
  border-radius: 9999px;
  transition: background 0.25s ease;
}

.af-criteria-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}

.af-crit-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--af-text-muted);
  font-weight: 500;
  transition: color 0.2s ease;
}

.af-crit-ok {
  color: #10B981;
  font-weight: 600;
}

/* Remember me & links */
.af-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -2px;
}

.af-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--af-text-secondary);
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}

.af-chk {
  width: 16px;
  height: 16px;
  accent-color: var(--af-accent);
  cursor: pointer;
  border-radius: 4px;
  margin: 0;
}

.af-link {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--af-accent-dark);
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color 0.15s;
  text-decoration: none;
}

.af-link:hover {
  text-decoration: underline;
  color: var(--af-accent);
}

.af-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--af-text-secondary);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  font-family: inherit;
  transition: all 0.15s;
}

.af-back-link:hover {
  background: var(--af-segment-bg);
  color: var(--af-text);
}

/* CTA Button */
.af-cta-btn {
  width: 100%;
  padding: 13px 20px;
  background: var(--af-primary-btn);
  color: var(--af-primary-btn-text);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(184, 114, 10, 0.25);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 4px;
}

.af-cta-btn:hover:not(:disabled) {
  background: var(--af-primary-btn-hover);
  box-shadow: 0 6px 20px rgba(184, 114, 10, 0.35);
  transform: translateY(-1px);
}

.af-cta-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(184, 114, 10, 0.2);
}

.af-cta-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

/* Demo / Sandbox Section */
.af-demo-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.af-divider {
  display: flex;
  align-items: center;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--af-text-muted);
}

.af-divider::before,
.af-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--af-border);
}

.af-divider span {
  padding: 0 12px;
}

.af-demo-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: var(--af-card-bg);
  border: 1.5px dashed var(--af-border-hover);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--af-text);
  font-family: inherit;
}

.af-demo-btn:hover {
  border-color: var(--af-accent);
  background: rgba(197, 161, 82, 0.04);
  transform: translateY(-1px);
}

.af-demo-icon {
  color: var(--af-accent);
}

.af-demo-text {
  font-size: 13.5px;
  font-weight: 600;
  flex: 1;
  text-align: left;
  margin-left: 10px;
}

.af-demo-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* Footer info */
.af-form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--af-text-muted);
  text-align: center;
  margin-top: 4px;
}

.af-switch {
  text-align: center;
  margin-top: 10px;
}

.af-resend-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

/* ── Dark Theme Overrides ───────────────── */
@media (prefers-color-scheme: dark) {
  .af-shell {
    --af-text: #F8FAFC;
    --af-text-secondary: #CBD5E1;
    --af-text-muted: #94A3B8;
    --af-border: #1E293B;
    --af-border-hover: #334155;
    --af-card-bg: #0F172A;
    --af-page-bg: #0B0F19;
    --af-input-bg: #131B2E;
    --af-input-bg-focus: #18223B;
    --af-segment-bg: #131B2E;
    --af-accent-dark: #E5C378;
    --af-shadow-card: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
  }
  .af-info-banner {
    background: rgba(197, 161, 82, 0.12);
    color: #FDE68A;
  }
  .af-alert-err {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.3);
    color: #FCA5A5;
  }
  .af-alert-ok {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
    color: #6EE7B7;
  }
}

.dark-theme .af-shell {
  --af-text: #F8FAFC;
  --af-text-secondary: #CBD5E1;
  --af-text-muted: #94A3B8;
  --af-border: #1E293B;
  --af-border-hover: #334155;
  --af-card-bg: #0F172A;
  --af-page-bg: #0B0F19;
  --af-input-bg: #131B2E;
  --af-input-bg-focus: #18223B;
  --af-segment-bg: #131B2E;
  --af-accent-dark: #E5C378;
  --af-shadow-card: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
}
.dark-theme .af-info-banner {
  background: rgba(197, 161, 82, 0.12);
  color: #FDE68A;
}
.dark-theme .af-alert-err {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #FCA5A5;
}
.dark-theme .af-alert-ok {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #6EE7B7;
}

/* ── Animations ─────────────────────────── */
@keyframes af-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.af-spin {
  animation: af-spin-anim 0.8s linear infinite;
}

@keyframes af-spin-anim {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Responsive Viewports ───────────────── */
@media (max-width: 960px) {
  .af-brand-panel {
    display: none;
  }
  .af-form-panel {
    padding: 32px 20px;
    align-items: flex-start;
    padding-top: 40px;
  }
  .af-logo-mobile {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--af-border);
  }
  .af-logo-name {
    font-family: 'Outfit', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: var(--af-text);
  }
  .af-logo-tagline {
    font-size: 11.5px;
    color: var(--af-text-muted);
  }
  .af-card {
    background: var(--af-card-bg);
    border: 1px solid var(--af-border);
    border-radius: 20px;
    padding: 28px 24px;
    box-shadow: var(--af-shadow-card);
  }
}

@media (max-width: 480px) {
  .af-form-panel {
    padding: 16px;
    padding-top: 24px;
  }
  .af-card {
    padding: 22px 18px;
    border-radius: 16px;
  }
  .af-card-title {
    font-size: 22px;
  }
}
`;
