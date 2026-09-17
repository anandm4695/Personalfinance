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
  Users,
  ChevronRight,
  Cpu,
  Layers,
  Award,
  Globe2,
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

function getStrength(pw: string): { score: number; label: string; color: string; badgeBg: string } {
  if (!pw) return { score: 0, label: "Enter password", color: "#94A3B8", badgeBg: "rgba(148, 163, 184, 0.1)" };
  const c = checkPasswordCriteria(pw);
  let score = 0;
  if (c.minLength) score++;
  if (pw.length >= 12) score++;
  if (c.hasUpper) score++;
  if (c.hasNumber) score++;
  if (c.hasSpecial) score++;

  if (score <= 1) return { score: 1, label: "Basic", color: "#F87171", badgeBg: "rgba(248, 113, 113, 0.15)" };
  if (score === 2) return { score: 2, label: "Fair", color: "#FBBF24", badgeBg: "rgba(251, 191, 36, 0.15)" };
  if (score === 3) return { score: 3, label: "Good", color: "#FCD34D", badgeBg: "rgba(252, 211, 77, 0.15)" };
  if (score === 4) return { score: 4, label: "Strong", color: "#34D399", badgeBg: "rgba(52, 211, 153, 0.15)" };
  return { score: 5, label: "Vault-Grade", color: "#10B981", badgeBg: "rgba(16, 185, 129, 0.2)" };
}

/* ─── Mode order for slide animations ───────────────────────────────── */
const MODE_ORDER = { login: 0, signup: 1, forgot: 2, reset: 3 } as const;

export default function Auth({
  onLogin,
  onRecoveryComplete,
}: {
  onLogin: (session: any) => void;
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
  const [activeTabFeature, setActiveTabFeature] = useState<number>(0);

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

  // Auto-cycle feature showcase
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTabFeature((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

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
  const strengthInfo = isSignUp ? getStrength(password) : getStrength(newPassword);

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
        setMsg("Password updated! You can now sign in with your new credentials.");
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
        setMsg("Password recovery link sent! Please check your inbox (and spam folder).");
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
      {/* ── Background Aurora Mesh & Starfield ── */}
      <div className="af-cosmic-bg" aria-hidden="true">
        <div className="af-aurora af-aurora-gold" />
        <div className="af-aurora af-aurora-indigo" />
        <div className="af-aurora af-aurora-emerald" />
        <div className="af-grid-overlay" />
      </div>

      {/* ── Brand & Executive Showcase Panel (Desktop) ── */}
      <div className="af-brand-panel" aria-label="ArthaDrishti Institutional Overview">
        <div className="af-brand-content">
          {/* Brand header */}
          <div className="af-brand-logo">
            <div className="af-logo-glow-wrap">
              <div className="af-logo-ring-halo" />
              <BrandMark size={46} />
            </div>
            <div>
              <div className="af-brand-name">ArthaDrishti</div>
              <div className="af-brand-tagline">Private Wealth Operating System</div>
            </div>
          </div>

          {/* Headline & Value Proposition */}
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
              Consolidate multi-currency bank accounts, mutual funds, direct equities, real estate, PPF/EPF, and family liabilities into an autonomous executive command center.
            </p>
          </div>

          {/* Live Holographic Net Worth Mockup Card */}
          <div className="af-preview-card" role="region" aria-label="Portfolio Snapshot Preview">
            <div className="af-preview-card-shine" />
            <div className="af-preview-header">
              <div className="af-preview-pill">
                <span className="af-live-dot" aria-hidden="true" />
                <span>Live Portfolio Summary</span>
              </div>
              <div className="af-preview-growth">
                <TrendingUp size={13} aria-hidden="true" />
                <span>+18.4% YoY</span>
              </div>
            </div>

            <div className="af-preview-amount">
              <div className="af-preview-currency">₹</div>
              <div className="af-preview-val">1,48,50,000</div>
            </div>
            <div className="af-preview-lbl">Consolidated Net Worth across 14 assets &amp; 3 banks</div>

            {/* Asset distribution bar */}
            <div className="af-asset-bar" title="Asset allocation distribution">
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

          {/* Interactive Feature Cards */}
          <div className="af-feature-chips-grid">
            <div className={`af-feature-item ${activeTabFeature === 0 ? "af-feat-active" : ""}`} onClick={() => setActiveTabFeature(0)}>
              <div className="af-feat-icon-box">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div className="af-feat-text-wrap">
                <strong>Automated Multi-Account Reconciliation</strong>
                <p>Track liquid cash, investment yields, and liabilities with real-time analytics.</p>
              </div>
            </div>

            <div className={`af-feature-item ${activeTabFeature === 1 ? "af-feat-active" : ""}`} onClick={() => setActiveTabFeature(1)}>
              <div className="af-feat-icon-box">
                <Users size={16} aria-hidden="true" />
              </div>
              <div className="af-feat-text-wrap">
                <strong>Family Entities &amp; Nominee Tracking</strong>
                <p>Seamlessly organize portfolios across multiple family members with full asset clarity.</p>
              </div>
            </div>

            <div className={`af-feature-item ${activeTabFeature === 2 ? "af-feat-active" : ""}`} onClick={() => setActiveTabFeature(2)}>
              <div className="af-feat-icon-box">
                <ShieldCheck size={16} aria-hidden="true" />
              </div>
              <div className="af-feat-text-wrap">
                <strong>Zero-Telemetry 256-Bit Vault Security</strong>
                <p>Client-controlled encrypted data. Your private financial ledger is never sold or mined.</p>
              </div>
            </div>
          </div>

          {/* Footer signature */}
          <div className="af-brand-footer">
            <span>Designed &amp; Engineered by Anand Mohta</span>
            <div className="af-brand-status-chip">
              <span className="af-status-dot-emerald" />
              <span>Institutional Engine 2.5 Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Panel (Right) ── */}
      <div className="af-form-panel">
        <div className="af-card-outer">
          <div className="af-card-border-glow" />
          <div className="af-card">
            {/* Mobile-only brand banner */}
            <div className="af-logo-mobile">
              <BrandMark size={38} />
              <div>
                <div className="af-logo-name">ArthaDrishti</div>
                <div className="af-logo-tagline">Private Wealth OS • by Anand Mohta</div>
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
                  {isLogin && <motion.div layoutId="activeTabBadge" className="af-segment-glow-pill" />}
                  <span className="af-segment-text">Sign In</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSignUp}
                  className={`af-segment-btn ${isSignUp ? "af-segment-active" : ""}`}
                  onClick={() => switchMode("signup")}
                >
                  {isSignUp && <motion.div layoutId="activeTabBadge" className="af-segment-glow-pill" />}
                  <span className="af-segment-text">Create Account</span>
                </button>
              </div>
            )}

            {/* Animated Mode Transition */}
            <AnimatePresence mode="wait" initial={false} custom={slideDir}>
              <motion.div
                key={mode}
                custom={slideDir}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10, scale: shouldReduceMotion ? 1 : 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10, scale: shouldReduceMotion ? 1 : 0.985 }}
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
                      ? "Create a secure new password for your wealth operating system."
                      : isForgot
                        ? "Enter your registered email and we'll dispatch an instant recovery link."
                        : isSignUp
                          ? "Start tracking your total net worth and family assets in one unified dashboard."
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
                      <span>Password recovery verified. Enter your new password below.</span>
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
                          <div className="af-criteria-head">
                            <span className="af-crit-title">Password Strength</span>
                            <span
                              className="af-strength-badge"
                              style={{ color: strengthInfo.color, background: strengthInfo.badgeBg, borderColor: strengthInfo.color }}
                            >
                              {strengthInfo.label}
                            </span>
                          </div>
                          <div className="af-strength-bar-wrap">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="af-strength-segment"
                                style={{
                                  background:
                                    strengthInfo.score >= i ? strengthInfo.color : "rgba(255, 255, 255, 0.08)",
                                }}
                              />
                            ))}
                          </div>
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
                      <div className="af-cta-shine" />
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
                              isSignUp ? "Create strong password (8+ chars)" : "Enter your password"
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
                            Caps Lock is active
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
                            <div className="af-criteria-head">
                              <span className="af-crit-title">Password Security</span>
                              <span
                                className="af-strength-badge"
                                style={{ color: strengthInfo.color, background: strengthInfo.badgeBg, borderColor: strengthInfo.color }}
                              >
                                {strengthInfo.label}
                              </span>
                            </div>
                            <div className="af-strength-bar-wrap">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                key={i}
                                className="af-strength-segment"
                                style={{
                                  background:
                                    strengthInfo.score >= i
                                      ? strengthInfo.color
                                      : "rgba(255, 255, 255, 0.08)",
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
                        <span className="af-remember-text">Remember my email</span>
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

                  {/* Primary CTA Button with Gold Ingot Polish */}
                  <button type="submit" disabled={loading} className="af-cta-btn">
                    <div className="af-cta-shine" />
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

          {/* Privacy & Trust micro-footer */}
          <div className="af-form-footer">
            <ShieldCheck size={14} className="af-footer-shield" />
            <span>256-bit Encryption • Zero-Telemetry Privacy • End-to-End Secure</span>
          </div>
        </div>
      </div>
    </div>

      <style>{AF_STYLES}</style>
    </div>
  );
}

/* ─── Ultra-Premium Stylesheet ─────────────────────────────────────────── */
const AF_STYLES = `
/* ── Global Container & Luxe Tokens ─────── */
.af-shell {
  --af-gold-primary: #D4AF37;
  --af-gold-light: #F5E5C9;
  --af-gold-glow: rgba(212, 175, 55, 0.25);
  --af-gold-border: rgba(212, 175, 55, 0.35);
  --af-gold-btn: linear-gradient(135deg, #E8C872 0%, #C5A152 50%, #9C782B 100%);
  --af-gold-btn-hover: linear-gradient(135deg, #F3D993 0%, #D4AF37 50%, #B38932 100%);
  
  --af-bg-main: #060911;
  --af-card-surface: rgba(12, 18, 32, 0.82);
  --af-card-border: rgba(255, 255, 255, 0.08);
  --af-input-surface: rgba(16, 24, 42, 0.88);
  --af-input-surface-focus: rgba(20, 30, 52, 0.98);
  
  --af-text-head: #FFFFFF;
  --af-text-body: #E2E8F0;
  --af-text-muted: #8E9BAE;

  min-height: 100vh;
  display: flex;
  font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--af-bg-main);
  color: var(--af-text-body);
  overflow-x: hidden;
  position: relative;
}

/* ── Cosmic Ambient Aurora Canvas ───────── */
.af-cosmic-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.af-aurora {
  position: absolute;
  filter: blur(120px);
  border-radius: 50%;
  opacity: 0.6;
  animation: af-float 16s ease-in-out infinite alternate;
}

.af-aurora-gold {
  top: -15%;
  right: 15%;
  width: 580px;
  height: 580px;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.16) 0%, transparent 70%);
}

.af-aurora-indigo {
  bottom: -20%;
  left: 5%;
  width: 650px;
  height: 650px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, transparent 70%);
  animation-duration: 20s;
  animation-delay: -4s;
}

.af-aurora-emerald {
  top: 40%;
  left: 30%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%);
  animation-duration: 24s;
  animation-delay: -8s;
}

.af-grid-overlay {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── Brand Panel (Left Showcase) ────────── */
.af-brand-panel {
  position: relative;
  flex: 0 0 48%;
  min-width: 460px;
  max-width: 660px;
  padding: 64px 52px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 2;
  background: linear-gradient(170deg, rgba(10, 15, 28, 0.85) 0%, rgba(6, 9, 17, 0.95) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.af-brand-content {
  position: relative;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Brand Logo */
.af-brand-logo {
  display: flex;
  align-items: center;
  gap: 16px;
}

.af-logo-glow-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.af-logo-ring-halo {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.5) 0%, transparent 70%);
  z-index: -1;
  animation: af-pulse-halo 3s ease-in-out infinite;
}

.af-brand-name {
  font-family: 'Outfit', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  line-height: 1.1;
}

.af-brand-tagline {
  font-size: 11px;
  font-weight: 600;
  color: #D4AF37;
  margin-top: 4px;
  letter-spacing: 0.06em;
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
  gap: 7px;
  padding: 5px 14px;
  border-radius: 9999px;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.35);
  font-size: 11.5px;
  font-weight: 600;
  color: #F5E5C9;
  width: fit-content;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.15);
}

.af-badge-icon {
  color: #FCD34D;
}

.af-brand-headline {
  font-family: 'Outfit', sans-serif;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.16;
  letter-spacing: -0.03em;
  color: #FFFFFF;
  margin: 0;
}

.af-brand-headline-accent {
  background: linear-gradient(135deg, #FFF1D0 0%, #E6CA85 50%, #C5A152 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.af-brand-sub {
  font-size: 14px;
  line-height: 1.65;
  color: #94A3B8;
  margin: 0;
  font-weight: 400;
}

/* Live Holographic Mockup Card */
.af-preview-card {
  position: relative;
  background: rgba(14, 21, 38, 0.75);
  border: 1px solid rgba(212, 175, 55, 0.3);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 20px;
  padding: 22px 24px;
  box-shadow: 
    0 20px 40px -10px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.af-preview-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.8),
    0 0 25px rgba(212, 175, 55, 0.15);
}

.af-preview-card-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
  transform: skewX(-25deg);
  animation: af-shine-pass 6s infinite;
  pointer-events: none;
}

.af-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.af-preview-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: #F8FAFC;
}

.af-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 12px #10B981;
  animation: af-pulse 2s infinite;
}

.af-preview-growth {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #34D399;
  background: rgba(16, 185, 129, 0.16);
  padding: 4px 9px;
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.af-preview-amount {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 2px;
}

.af-preview-currency {
  font-size: 24px;
  font-weight: 600;
  color: #D4AF37;
}

.af-preview-val {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.035em;
  color: #FFFFFF;
  font-family: 'Outfit', sans-serif;
}

.af-preview-lbl {
  font-size: 12px;
  color: #94A3B8;
}

.af-asset-bar {
  display: flex;
  height: 8px;
  border-radius: 9999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  margin-top: 4px;
}

.af-asset-seg {
  height: 100%;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.af-seg-mf { background: linear-gradient(90deg, #3B82F6, #60A5FA); }
.af-seg-re { background: linear-gradient(90deg, #D4AF37, #F5E5C9); }
.af-seg-epf { background: linear-gradient(90deg, #10B981, #34D399); }
.af-seg-cash { background: linear-gradient(90deg, #8B5CF6, #A78BFA); }

.af-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.af-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: #CBD5E1;
}

.af-tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.af-dot-mf { background: #3B82F6; box-shadow: 0 0 6px #3B82F6; }
.af-dot-re { background: #D4AF37; box-shadow: 0 0 6px #D4AF37; }
.af-dot-epf { background: #10B981; box-shadow: 0 0 6px #10B981; }
.af-dot-cash { background: #8B5CF6; box-shadow: 0 0 6px #8B5CF6; }

/* Interactive Feature List */
.af-feature-chips-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.af-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.25s ease;
}

.af-feature-item:hover, .af-feat-active {
  background: rgba(212, 175, 55, 0.08);
  border-color: rgba(212, 175, 55, 0.28);
  transform: translateX(4px);
}

.af-feat-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(212, 175, 55, 0.14);
  border: 1px solid rgba(212, 175, 55, 0.35);
  color: #E6CA85;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.af-feat-text-wrap strong {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 3px;
}

.af-feat-text-wrap p {
  margin: 0;
  font-size: 12px;
  color: #94A3B8;
  line-height: 1.45;
}

.af-brand-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: #64748B;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.af-brand-status-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #34D399;
  background: rgba(16, 185, 129, 0.1);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.af-status-dot-emerald {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10B981;
}

/* ── Form Panel (Right) ─────────────────── */
.af-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 36px;
  min-height: 100vh;
  overflow-y: auto;
  position: relative;
  z-index: 2;
}

.af-card-outer {
  position: relative;
  width: 100%;
  max-width: 450px;
}

.af-card-border-glow {
  position: absolute;
  inset: -1px;
  border-radius: 26px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(212, 175, 55, 0.4) 50%, rgba(255, 255, 255, 0.05) 100%);
  z-index: 0;
  pointer-events: none;
}

.af-card {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 22px;
  background: var(--af-card-surface);
  border-radius: 25px;
  padding: 38px 34px;
  box-shadow: 
    0 25px 60px -15px rgba(0, 0, 0, 0.75),
    inset 0 1px 1px rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
}

.af-logo-mobile {
  display: none;
}

/* Segmented Mode Switcher */
.af-segment-switch {
  display: flex;
  background: rgba(16, 24, 42, 0.75);
  padding: 5px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  user-select: none;
}

.af-segment-btn {
  flex: 1;
  position: relative;
  padding: 10px 18px;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  color: #94A3B8;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: color 0.25s ease;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.af-segment-btn:hover:not(.af-segment-active) {
  color: #FFFFFF;
}

.af-segment-active {
  color: #FFFFFF;
}

.af-segment-glow-pill {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(170, 124, 17, 0.45) 100%);
  border: 1px solid rgba(212, 175, 55, 0.5);
  border-radius: 12px;
  box-shadow: 
    0 4px 14px rgba(0, 0, 0, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  z-index: 1;
}

.af-segment-text {
  position: relative;
  z-index: 2;
}

/* Card Header */
.af-card-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.af-greeting-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #D4AF37;
  margin-bottom: 2px;
}

.af-greeting-sun {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.9);
}

.af-card-title {
  font-family: 'Outfit', sans-serif;
  font-size: 27px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #FFFFFF;
  margin: 0;
  line-height: 1.2;
}

.af-card-sub {
  font-size: 13.5px;
  color: #94A3B8;
  line-height: 1.5;
  margin: 0;
}

/* Alerts */
.af-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 16px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  margin-bottom: 2px;
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
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #FCA5A5;
}

.af-alert-ok {
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #6EE7B7;
}

.af-info-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(212, 175, 55, 0.14);
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.35);
  font-size: 13px;
  color: #FDE68A;
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
  color: #CBD5E1;
  letter-spacing: -0.01em;
}

.af-optional-tag {
  font-size: 11px;
  font-weight: 400;
  color: #64748B;
}

/* Inputs */
.af-inp-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--af-input-surface);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 13px;
  transition: all 0.2s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.af-inp-wrap:hover:not(.af-focused):not(.af-inp-err) {
  border-color: rgba(255, 255, 255, 0.2);
}

.af-inp-wrap.af-focused {
  border-color: #D4AF37;
  background: var(--af-input-surface-focus);
  box-shadow: 
    0 0 0 3px rgba(212, 175, 55, 0.25),
    0 0 20px rgba(212, 175, 55, 0.15),
    inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.af-inp-wrap.af-inp-err {
  border-color: #EF4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.af-inp {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  padding: 13px 14px;
  font-size: 14.5px;
  font-family: inherit;
  color: #FFFFFF;
  min-width: 0;
}

.af-inp::placeholder {
  color: rgba(148, 163, 184, 0.55);
}

.af-inp-padded {
  padding-left: 8px;
}

.af-inp-icon {
  display: flex;
  align-items: center;
  padding-left: 14px;
  color: #64748B;
  flex-shrink: 0;
  transition: color 0.2s;
}

.af-focused .af-inp-icon {
  color: #D4AF37;
}

.af-eye-btn {
  background: none;
  border: none;
  padding: 0 14px;
  color: #64748B;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.15s;
}

.af-eye-btn:hover {
  color: #FFFFFF;
}

.af-err-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #F87171;
  font-weight: 500;
  margin-top: 2px;
}

.af-caps-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #FBBF24;
  font-weight: 600;
  margin-top: 2px;
}

.af-match-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #34D399;
  font-weight: 600;
  margin-top: 2px;
}

/* Criteria Checklist */
.af-criteria-card {
  background: rgba(16, 24, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 14px;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.af-criteria-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.af-crit-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #CBD5E1;
}

.af-strength-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid;
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
  color: #64748B;
  font-weight: 500;
  transition: color 0.2s ease;
}

.af-crit-ok {
  color: #34D399;
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
  color: #CBD5E1;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}

.af-remember-text {
  color: #CBD5E1;
}

.af-chk {
  width: 16px;
  height: 16px;
  accent-color: #D4AF37;
  cursor: pointer;
  border-radius: 4px;
  margin: 0;
}

.af-link {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: #D4AF37;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color 0.15s;
  text-decoration: none;
}

.af-link:hover {
  text-decoration: underline;
  color: #FCD34D;
}

.af-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: #CBD5E1;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  font-family: inherit;
  transition: all 0.15s;
}

.af-back-link:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #FFFFFF;
}

/* CTA Button with Gold Ingot Finish */
.af-cta-btn {
  position: relative;
  width: 100%;
  padding: 14px 20px;
  background: var(--af-gold-btn);
  color: #060911;
  border: none;
  border-radius: 13px;
  font-size: 15px;
  font-weight: 750;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 
    0 8px 24px -4px rgba(212, 175, 55, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.4);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 4px;
  overflow: hidden;
}

.af-cta-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: skewX(-25deg);
  transition: left 0.6s ease;
}

.af-cta-btn:hover .af-cta-shine {
  left: 150%;
}

.af-cta-btn:hover:not(:disabled) {
  background: var(--af-gold-btn-hover);
  box-shadow: 
    0 12px 30px -4px rgba(212, 175, 55, 0.55),
    0 0 20px rgba(212, 175, 55, 0.25);
  transform: translateY(-1.5px);
}

.af-cta-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
  box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3);
}

.af-cta-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

/* Footer info */
.af-form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: #64748B;
  text-align: center;
  margin-top: 2px;
}

.af-footer-shield {
  color: #D4AF37;
  flex-shrink: 0;
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

/* ── Animations ─────────────────────────── */
@keyframes af-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

@keyframes af-pulse-halo {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes af-float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 40px) scale(1.08); }
}

@keyframes af-shine-pass {
  0% { left: -100%; }
  20%, 100% { left: 150%; }
}

.af-spin {
  animation: af-spin-anim 0.8s linear infinite;
}

@keyframes af-spin-anim {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Responsive Viewports ───────────────── */
@media (max-width: 1024px) {
  .af-brand-panel {
    display: none;
  }
  .af-form-panel {
    padding: 32px 20px;
    align-items: center;
  }
  .af-logo-mobile {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .af-logo-name {
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #FFFFFF;
  }
  .af-logo-tagline {
    font-size: 11.5px;
    color: #D4AF37;
  }
  .af-card {
    padding: 32px 26px;
  }
}

@media (max-width: 480px) {
  .af-form-panel {
    padding: 16px 12px;
  }
  .af-card {
    padding: 26px 20px;
    border-radius: 20px;
  }
  .af-card-title {
    font-size: 23px;
  }
}
`;
