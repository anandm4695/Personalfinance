// @ts-nocheck
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Lock,
  Loader2,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Zap,
  CreditCard,
  Calendar,
  Wallet,
  KeyRound,
  UserCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Sparkles,
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

/* ─── Feature list (outside component — not rebuilt on every render) ─── */
const FEATURES = [
  {
    icon: <IndianRupee size={15} />,
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.2)",
    title: "Bank & Transactions",
    desc: "All accounts, daily spends & budget tracking in one place",
  },
  {
    icon: <TrendingUp size={15} />,
    color: "#818CF8",
    bg: "rgba(129,140,248,0.12)",
    border: "rgba(129,140,248,0.2)",
    title: "Stocks & Mutual Funds",
    desc: "Demat holdings, SIP tracker & full investment portfolio",
  },
  {
    icon: <BarChart3 size={15} />,
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.2)",
    title: "FDs, Bonds & PPF / NPS",
    desc: "Investments portfolio, recurring deposits & long-term savings",
  },
  {
    icon: <CreditCard size={15} />,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.2)",
    title: "Credit & Liabilities",
    desc: "Card bills, limits, outstanding & prepaid wallet balances",
  },
  {
    icon: <Wallet size={15} />,
    color: "#F87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.2)",
    title: "Loans & Borrowings",
    desc: "Home, car & personal loans — track EMIs & repayments",
  },
  {
    icon: <Calendar size={15} />,
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.2)",
    title: "Goals & Subscriptions",
    desc: "Financial goals, budgets, reminders & renewal alerts",
  },
];

/* ─── Mode order — used to pick slide direction on transition ────────── */
const MODE_ORDER = { login: 0, signup: 1, forgot: 2, reset: 3 } as const;

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function Auth({
  onLogin,
  onOffline,
}: {
  onLogin: (session: any) => void;
  onOffline?: () => void;
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
  const [showMobileFeatures, setShowMobileFeatures] = useState(false);
  const [slideDir, setSlideDir] = useState(1); // 1 = forward (slide in from right), -1 = back (from left)

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

  const switchMode = (m: "login" | "signup" | "forgot" | "reset") => {
    setSlideDir(MODE_ORDER[m] >= MODE_ORDER[mode] ? 1 : -1);
    setError(null);
    setMsg(null);
    // Reset ALL field state when switching modes
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
      {/* ════════════════════════════════════
          LEFT PANEL — Brand & Product Story
      ════════════════════════════════════ */}
      <div className="af-left">
        <div className="af-glow-1" aria-hidden="true" />
        <div className="af-glow-2" aria-hidden="true" />

        {/* Logo */}
        <div className="af-logo">
          <img
            src="/logo.png"
            alt="Personal Finance by Anand Mohta"
            style={{
              width: 56,
              height: 56,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 12px rgba(197,161,82,0.5))",
            }}
          />
          <div>
            <div className="af-logo-name">Personal Finance</div>
            <div className="af-logo-tagline">by Anand Mohta</div>
          </div>
        </div>

        {/* Hero */}
        <div className="af-hero">
          <div className="af-badge">
            <IndianRupee size={11} aria-hidden="true" />
            <span>Every rupee matters.</span>
          </div>
          <h1 className="af-h1">
            Your Complete
            <br />
            Finance Centre.
          </h1>
          <p className="af-h1-sub">
            One platform to track every rupee — banks, investments, cards, loans, goals and more.
            Built for clarity and peace of mind.
          </p>
        </div>

        {/* Portfolio Chart Card */}
        <div className="af-chart-card">
          <div className="af-chart-top">
            <div>
              <div className="af-chart-kicker">Total Portfolio</div>
              <div className="af-chart-num">₹48,20,000</div>
              <div className="af-chart-delta">
                <TrendingUp size={11} aria-hidden="true" />
                +12.4% this year
              </div>
            </div>
            <div className="af-chart-icon-box" aria-hidden="true">
              <BarChart3 size={16} color="rgba(255,255,255,0.4)" />
            </div>
          </div>
          <svg
            viewBox="0 0 560 88"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="af-chart-svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="af-fill-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="af-line-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <path
              d="M0,86 C55,80 105,66 175,53 S280,30 350,22 S455,9 560,4 L560,88 L0,88 Z"
              fill="url(#af-fill-grad)"
              className="af-fill-anim"
            />
            <path
              d="M0,86 C55,80 105,66 175,53 S280,30 350,22 S455,9 560,4"
              stroke="url(#af-line-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="af-line-anim"
            />
            <circle cx="560" cy="4" r="3.5" fill="#10B981" className="af-dot-core" />
            <circle cx="560" cy="4" r="3.5" fill="#10B981" opacity="0.35" className="af-dot-ring" />
            {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((m, i) => (
              <text
                key={m}
                x={i * 112}
                y="87"
                fill="rgba(255,255,255,0.18)"
                fontSize="8"
                fontFamily="Inter,sans-serif"
              >
                {m}
              </text>
            ))}
          </svg>
        </div>

        {/* Feature grid */}
        <div className="af-section-label">Everything you need</div>
        <div className="af-features">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="af-feature-item"
              style={{ animationDelay: `${0.08 + i * 0.06}s` }}
            >
              <div
                className="af-feature-icon"
                style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color }}
              >
                {f.icon}
              </div>
              <div className="af-feature-text">
                <div className="af-feature-title">{f.title}</div>
                <div className="af-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="af-trust-row">
          <span className="af-trust-item">
            <Lock size={11} aria-hidden="true" />
            Bank-grade Encryption
          </span>
          <span className="af-trust-sep" aria-hidden="true" />
          <span className="af-trust-item">
            <Shield size={11} aria-hidden="true" />
            Data Encrypted
          </span>
          <span className="af-trust-sep" aria-hidden="true" />
          <span className="af-trust-item">
            <Zap size={11} aria-hidden="true" />
            Secure Cloud Sync
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════
          RIGHT PANEL — Auth Card
      ════════════════════════════════════ */}
      <div className="af-right">
        <div className="af-right-glow" aria-hidden="true" />
        <div className="af-card">
          {/* Mobile-only logo */}
          <div className="af-mobile-logo" aria-hidden="true">
            <img
              src="/logo.png"
              alt="Personal Finance by Anand Mohta"
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
            <div>
              <div className="af-mobile-brand">Personal Finance</div>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 500, marginTop: 1 }}>
                by Anand Mohta
              </div>
            </div>
          </div>

          {/* Animated mode panel — slides + fades whenever login/signup/forgot/reset changes */}
          <div key={mode} className="af-mode-panel" style={{ "--af-dir": slideDir } as React.CSSProperties}>
          {/* Header */}
          <div className="af-card-head">
            {!isReset && !isForgot && !isSignUp && (
              <div className="af-greeting-badge">
                <Sparkles size={12} />
                <span>{getGreeting()}</span>
              </div>
            )}
            <h2 className="af-card-title">
              {isReset
                ? "Set new password"
                : isForgot
                  ? "Reset your password"
                  : isSignUp
                    ? "Create your account"
                    : "Welcome back"}
            </h2>
            <p className="af-card-sub">
              {isReset
                ? "Choose a strong new password for your account"
                : isForgot
                  ? "Enter your email and we'll send a secure recovery link"
                  : isSignUp
                    ? "Start your journey to financial clarity"
                    : "Sign in to your personal finance dashboard"}
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
                    tabIndex={-1}
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
                  <div style={{ marginTop: 8 }}>
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
                    tabIndex={-1}
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
                  <div className="af-field af-field-anim" style={{ animationDelay: "0.05s" }}>
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
                <div
                  className="af-field af-field-anim"
                  style={{ animationDelay: isSignUp ? "0.1s" : "0.05s" }}
                >
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
                  <div
                    className="af-field af-field-anim"
                    style={{ animationDelay: isSignUp ? "0.15s" : "0.1s" }}
                  >
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
                        tabIndex={-1}
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
                      <div style={{ marginTop: 8 }}>
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
                  <div className="af-field af-field-anim" style={{ animationDelay: "0.2s" }}>
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
                        tabIndex={-1}
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
                  <div className="af-meta-row af-field-anim" style={{ animationDelay: "0.15s" }}>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="af-cta-btn af-field-anim"
                  style={{ animationDelay: "0.2s" }}
                >
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
          </div>

          {/* Security indicators */}
          <div className="af-sec-bar" aria-label="Security features">
            <span className="af-sec-chip">
              <Lock size={10} aria-hidden="true" />
              SSL Secured
            </span>
            <span className="af-sec-chip">
              <Shield size={10} aria-hidden="true" />
              Data Encrypted
            </span>
            <span className="af-sec-chip">
              <CheckCircle2 size={10} aria-hidden="true" />
              No Data Sharing
            </span>
          </div>

          {/* Demo / offline mode */}
          {onOffline && (
            <div className="af-demo-wrap">
              <button onClick={onOffline} className="af-demo-btn">
                Explore Demo Mode →
              </button>
            </div>
          )}

          {/* Mobile-only feature accordion */}
          <div className="af-mobile-features">
            <button
              className="af-mob-feat-toggle"
              onClick={() => setShowMobileFeatures((v) => !v)}
              aria-expanded={showMobileFeatures}
            >
              <span>What's included?</span>
              {showMobileFeatures ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMobileFeatures && (
              <div className="af-mob-feat-grid">
                {FEATURES.map((f) => (
                  <div key={f.title} className="af-mob-feat-item">
                    <span className="af-mob-feat-dot" style={{ background: f.color }} />
                    <span>{f.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{AF_STYLES}</style>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */
const AF_STYLES = `
/* ── Root ─────────────────────────────── */
.af-root {
  min-height: 100vh;
  display: flex;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #07090F;
  overflow-x: hidden;
}

/* ══════════════════════════════════════
   LEFT PANEL
══════════════════════════════════════ */
.af-left {
  width: 52%;
  min-height: 100vh;
  background: linear-gradient(160deg, #080C1B 0%, #0C1226 55%, #060910 100%);
  display: flex;
  flex-direction: column;
  padding: 44px 52px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

/* Dot-grid overlay */
.af-left::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(79,70,229,0.18) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  z-index: 0;
}
/* Right-edge gradient bleed — visual bridge to the right panel */
.af-left::after {
  content: '';
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 80px;
  background: linear-gradient(90deg, transparent, rgba(241,244,251,0.06));
  pointer-events: none; z-index: 1;
}

/* Ambient glows */
.af-glow-1 {
  position: absolute; top: -15%; right: -20%;
  width: 75%; height: 75%;
  background: radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 65%);
  filter: blur(110px); z-index: 0; pointer-events: none;
}
.af-glow-2 {
  position: absolute; bottom: 0%; left: -20%;
  width: 55%; height: 55%;
  background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%);
  filter: blur(90px); z-index: 0; pointer-events: none;
}

/* Logo */
.af-logo {
  display: flex; align-items: center; gap: 14px;
  position: relative; z-index: 1;
}
.af-logo-name {
  font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 900;
  color: #FFFFFF; letter-spacing: -0.03em; line-height: 1;
}
.af-logo-tagline {
  font-size: 10px; font-weight: 500;
  color: rgba(255,255,255,0.4); letter-spacing: 0.06em; margin-top: 4px;
}

/* Hero */
.af-hero { margin-top: 36px; position: relative; z-index: 1; }
.af-badge {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(79,70,229,0.12); border: 1px solid rgba(79,70,229,0.28);
  border-radius: 100px; padding: 6px 14px;
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.58);
  letter-spacing: 0.04em; margin-bottom: 18px;
}
.af-h1 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(32px, 2.8vw, 46px); font-weight: 900;
  color: #FFFFFF; line-height: 1.06; letter-spacing: -0.045em; margin-bottom: 16px;
}
.af-h1-sub {
  font-size: 14px; font-weight: 400;
  color: rgba(255,255,255,0.38); line-height: 1.65; max-width: 380px;
}

/* Chart card */
.af-chart-card {
  margin-top: 28px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; padding: 18px 22px 12px;
  position: relative; z-index: 1;
  animation: af-rise 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both;
}
.af-chart-top {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
}
.af-chart-kicker {
  font-size: 10px; font-weight: 700;
  color: rgba(255,255,255,0.28); text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 5px;
}
.af-chart-num {
  font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800;
  color: #FFFFFF; letter-spacing: -0.045em; line-height: 1;
}
.af-chart-delta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: #10B981; margin-top: 6px;
  background: rgba(16,185,129,0.1); padding: 3px 10px; border-radius: 100px;
}
.af-chart-icon-box {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.af-chart-svg { width: 100%; height: 64px; overflow: visible; display: block; }

/* Chart animations */
.af-line-anim { stroke-dasharray: 1100; stroke-dashoffset: 1100; animation: af-draw 2.4s cubic-bezier(0.22,1,0.36,1) 0.5s forwards; }
.af-fill-anim { opacity: 0; animation: af-fade 1.2s ease 1.5s forwards; }
.af-dot-core  { opacity: 0; animation: af-fade 0.4s ease 2.5s forwards; }
.af-dot-ring  { transform-box: fill-box; transform-origin: center; animation: af-ring-pulse 2.2s ease-out 2.8s infinite; }

/* Section label */
.af-section-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: rgba(255,255,255,0.22);
  margin-top: 22px; margin-bottom: 10px; position: relative; z-index: 1;
}

/* Feature grid */
.af-features {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  position: relative; z-index: 1;
}
.af-feature-item {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 11px 12px;
  animation: af-rise 0.7s cubic-bezier(0.22,1,0.36,1) both;
  transition: background 0.2s;
}
.af-feature-item:hover { background: rgba(255,255,255,0.055); }
.af-feature-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
}
.af-feature-text { min-width: 0; }
.af-feature-title {
  font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.82);
  line-height: 1.2; letter-spacing: -0.01em;
}
.af-feature-desc {
  font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 3px; line-height: 1.35;
}

/* Trust row */
.af-trust-row {
  display: flex; align-items: center; gap: 14px;
  margin-top: auto; padding-top: 24px;
  position: relative; z-index: 1; flex-wrap: wrap;
}
.af-trust-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 500; color: rgba(255,255,255,0.2); white-space: nowrap;
}
.af-trust-sep { width: 1px; height: 11px; background: rgba(255,255,255,0.1); flex-shrink: 0; }

/* ══════════════════════════════════════
   RIGHT PANEL
══════════════════════════════════════ */
.af-right {
  width: 48%; min-height: 100vh;
  background: linear-gradient(165deg, #F8FAFF 0%, #F1F4FB 40%, #EEF0F8 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 48px 44px;
  transition: background 0.3s;
  position: relative; overflow: hidden;
}
.af-right-glow {
  position: absolute; top: -30%; right: -25%;
  width: 60%; height: 60%;
  background: radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 65%);
  filter: blur(80px); pointer-events: none;
}
.af-card {
  width: 100%; max-width: 420px;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 24px;
  padding: 36px 32px 32px;
  box-shadow:
    0 1px 2px rgba(15,23,42,0.04),
    0 4px 12px rgba(15,23,42,0.06),
    0 16px 40px rgba(79,70,229,0.06);
  position: relative; z-index: 1;
  animation: af-card-enter 0.6s cubic-bezier(0.22,1,0.36,1) both;
}

/* Mobile-only logo */
.af-mobile-logo { display: none; align-items: center; gap: 10px; margin-bottom: 36px; }
.af-mobile-brand {
  font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 900;
  color: #0F172A; letter-spacing: -0.04em;
}

/* Greeting badge */
.af-greeting-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(124,58,237,0.06));
  border: 1px solid rgba(79,70,229,0.12);
  border-radius: 100px; padding: 5px 12px 5px 10px;
  font-size: 11.5px; font-weight: 600; color: #4F46E5;
  letter-spacing: 0.01em; margin-bottom: 14px;
  animation: af-rise 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
}

/* Card header */
.af-card-head { margin-bottom: 26px; }
.af-card-title {
  font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 900;
  color: #0F172A; letter-spacing: -0.04em; line-height: 1.12; margin-bottom: 8px;
}
.af-card-sub { font-size: 14px; color: #64748B; line-height: 1.55; font-weight: 400; }

/* Alerts */
.af-alert {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 13px 16px; border-radius: 12px;
  font-size: 13px; font-weight: 500; line-height: 1.45; margin-bottom: 20px;
  animation: af-rise 0.3s cubic-bezier(0.22,1,0.36,1);
}
.af-alert-err { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; animation: af-shake 0.45s ease-out; }
.af-alert-ok  { background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; }

/* Info banner (reset mode) */
.af-info-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; background: rgba(79,70,229,0.06);
  border-radius: 10px; border: 1px solid rgba(79,70,229,0.15);
  margin-bottom: 4px; font-size: 13px; color: #4F46E5; font-weight: 500;
}

/* Form container (for OAuth + form) */
.af-form-container { display: flex; flex-direction: column; gap: 0; }

/* Form */
.af-form { display: flex; flex-direction: column; gap: 18px; }
.af-field { display: flex; flex-direction: column; gap: 6px; }
.af-lbl { font-size: 13px; font-weight: 600; color: #374151; letter-spacing: -0.01em; }

/* Input wrapper */
.af-inp-wrap {
  position: relative; display: flex; align-items: center;
  background: rgba(255,255,255,0.7); border: 1.5px solid #E2E8F0; border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}
.af-inp-wrap:hover:not(.af-focused):not(.af-inp-err) { border-color: #CBD5E1; background: rgba(255,255,255,0.9); }
.af-inp-wrap.af-focused {
  border-color: #818CF8; background: #FFFFFF;
  box-shadow: 0 0 0 3.5px rgba(79,70,229,0.1), 0 2px 8px rgba(79,70,229,0.08);
}
.af-inp-wrap.af-inp-err { border-color: #F87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.1); }
.af-inp {
  flex: 1; background: none; border: none; outline: none;
  padding: 13px 16px; font-size: 15px;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #0F172A; font-weight: 400; min-width: 0;
}
.af-inp-padded { padding-left: 8px; }
.af-inp-icon {
  display: flex; align-items: center; padding-left: 14px; color: #94A3B8; flex-shrink: 0;
  transition: color 0.2s;
}
.af-focused .af-inp-icon { color: #4F46E5; }
.af-inp::placeholder { color: #B0B8C8; }
.af-eye-btn {
  background: none; border: none; padding: 0 14px; color: #94A3B8;
  cursor: pointer; display: flex; align-items: center; flex-shrink: 0; transition: color 0.15s;
}
.af-eye-btn:hover { color: #4F46E5; }
.af-err-msg { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #EF4444; font-weight: 500; }

/* Divider */
.af-divider {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
.af-divider-line {
  flex: 1; height: 1px; background: #E2E8F0;
}
.af-divider-text {
  font-size: 12px; font-weight: 500; color: #9CA3AF; white-space: nowrap;
  background: #F7F9FC; padding: 0 4px;
}

/* Remember + Forgot row */
.af-meta-row { display: flex; align-items: center; justify-content: space-between; margin-top: -4px; }
.af-remember {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #4B5563; cursor: pointer; font-weight: 500; user-select: none;
}
.af-chk {
  width: 16px; height: 16px; accent-color: #4F46E5; cursor: pointer; border-radius: 4px;
  margin: 0;
}

/* Link button */
.af-link {
  background: none; border: none; font-size: 13px; font-weight: 600; color: #4F46E5;
  cursor: pointer; padding: 0; font-family: inherit; transition: color 0.15s; text-decoration: none;
}
.af-link:hover { color: #3730A3; text-decoration: underline; }
.af-link-bold { font-weight: 700; }

/* CTA Button */
.af-cta-btn {
  width: 100%; padding: 14px 20px;
  background: linear-gradient(135deg, #4F46E5 0%, #6D5BF7 50%, #7C3AED 100%);
  background-size: 200% 100%; background-position: 0% 0%;
  color: #FFFFFF; border: none; border-radius: 13px;
  font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-position 0.4s ease;
  box-shadow: 0 4px 16px rgba(79,70,229,0.35), 0 1px 3px rgba(79,70,229,0.2);
  margin-top: 6px; letter-spacing: -0.01em;
  position: relative; overflow: hidden;
}
.af-cta-btn::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.af-cta-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(79,70,229,0.45), 0 2px 8px rgba(124,58,237,0.3);
  background-position: 100% 0%;
}
.af-cta-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 10px rgba(79,70,229,0.3); }
.af-cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Mode switcher */
.af-switch { text-align: center; margin-top: 22px; }
.af-switch-txt { font-size: 13.5px; color: #6B7280; font-weight: 400; }

/* Security bar */
.af-sec-bar {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(226,232,240,0.6); flex-wrap: wrap;
}
.af-sec-chip {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 600; color: #94A3B8; letter-spacing: 0.01em;
  background: rgba(241,245,249,0.7); border: 1px solid rgba(226,232,240,0.6);
  border-radius: 100px; padding: 4px 10px;
}
.af-sec-item { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 500; color: #9CA3AF; }
.af-sec-dot { width: 3px; height: 3px; border-radius: 50%; background: #D1D5DB; flex-shrink: 0; }

/* Demo button */
.af-demo-wrap { text-align: center; margin-top: 12px; }
.af-demo-btn {
  background: none; border: none; font-size: 12px; font-weight: 500;
  color: #94A3B8; cursor: pointer; font-family: inherit; transition: color 0.15s;
}
.af-demo-btn:hover { color: #4F46E5; }

/* Mobile feature accordion */
.af-mobile-features { display: none; margin-top: 24px; }
.af-mob-feat-toggle {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  background: none; border: 1px solid #E2E8F0; border-radius: 10px;
  padding: 11px 16px; font-size: 13px; font-weight: 600; color: #374151;
  cursor: pointer; font-family: inherit; transition: background 0.15s;
}
.af-mob-feat-toggle:hover { background: #F8FAFC; }
.af-mob-feat-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-top: 12px;
  animation: af-rise 0.3s cubic-bezier(0.22,1,0.36,1);
}
.af-mob-feat-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 500; color: #4B5563;
  padding: 8px 10px; border: 1px solid #F1F5F9; border-radius: 8px;
  background: #FAFAFA;
}
.af-mob-feat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* ══════════════════════════════════════
   DARK MODE — right panel
══════════════════════════════════════ */
@media (prefers-color-scheme: dark) {
  .af-right { background: linear-gradient(165deg, #0F1420 0%, #111827 40%, #131B2E 100%); }
  .af-right-glow { background: radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 65%); }
  .af-card {
    background: rgba(31,41,55,0.75);
    border-color: rgba(55,65,81,0.6);
    box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15), 0 16px 40px rgba(0,0,0,0.15);
  }
  .af-mobile-brand { color: #F9FAFB; }
  .af-card-title { color: #F9FAFB; }
  .af-card-sub { color: #9CA3AF; }
  .af-greeting-badge { background: rgba(129,140,248,0.1); border-color: rgba(129,140,248,0.2); color: #A5B4FC; }
  .af-lbl { color: #D1D5DB; }
  .af-inp-wrap { background: rgba(17,24,39,0.6); border-color: #374151; box-shadow: none; }
  .af-inp-wrap:hover:not(.af-focused):not(.af-inp-err) { border-color: #4B5563; background: rgba(17,24,39,0.8); }
  .af-inp-wrap.af-focused { border-color: #818CF8; background: rgba(17,24,39,0.9); box-shadow: 0 0 0 3px rgba(129,140,248,0.12); }
  .af-inp { color: #F9FAFB; }
  .af-inp::placeholder { color: #4B5563; }
  .af-inp-icon { color: #6B7280; }
  .af-focused .af-inp-icon { color: #818CF8; }
  .af-oauth-btn { background: #1F2937; border-color: #374151; color: #D1D5DB; }
  .af-oauth-btn:hover:not(:disabled) { background: #243143; border-color: #4B5563; }
  .af-divider-line { background: #374151; }
  .af-divider-text { background: transparent; color: #6B7280; }
  .af-switch-txt { color: #9CA3AF; }
  .af-link { color: #818CF8; }
  .af-link:hover { color: #A5B4FC; }
  .af-sec-bar { border-top-color: rgba(55,65,81,0.5); }
  .af-sec-chip { background: rgba(31,41,55,0.5); border-color: rgba(55,65,81,0.5); color: #6B7280; }
  .af-sec-item { color: #6B7280; }
  .af-sec-dot { background: #4B5563; }
  .af-remember { color: #9CA3AF; }
  .af-alert-err { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #FCA5A5; }
  .af-alert-ok  { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25); color: #6EE7B7; }
  .af-info-banner { background: rgba(129,140,248,0.08); border-color: rgba(129,140,248,0.2); color: #818CF8; }
  .af-mob-feat-toggle { border-color: #374151; color: #D1D5DB; }
  .af-mob-feat-toggle:hover { background: #1F2937; }
  .af-mob-feat-item { background: #1F2937; border-color: #374151; color: #D1D5DB; }
  .af-demo-btn { color: #6B7280; }
  .af-left::after { background: linear-gradient(90deg, transparent, rgba(15,20,32,0.1)); }
}

/* Field stagger animation */
.af-field-anim {
  opacity: 0; transform: translateY(12px);
  animation: af-field-in 0.45s cubic-bezier(0.22,1,0.36,1) both;
}

/* Mode panel — slide + fade transition on login/signup/forgot/reset switch */
.af-mode-panel {
  animation: af-mode-in 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes af-mode-in {
  from { opacity: 0; transform: translateX(calc(var(--af-dir, 1) * 22px)); }
  to   { opacity: 1; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .af-mode-panel, .af-card, .af-field-anim, .af-feature-item, .af-chart-card { animation: none !important; }
}

/* ══════════════════════════════════════
   KEYFRAME ANIMATIONS
══════════════════════════════════════ */
@keyframes af-draw   { to { stroke-dashoffset: 0; } }
@keyframes af-fade   { to { opacity: 1; } }
@keyframes af-ring-pulse {
  0%   { opacity: 0.45; transform: scale(1); }
  100% { opacity: 0;    transform: scale(4); }
}
@keyframes af-rise {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes af-card-enter {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes af-field-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes af-shake {
  0%,100% { transform: translateX(0); }
  15%     { transform: translateX(-7px); }
  30%     { transform: translateX(7px); }
  45%     { transform: translateX(-5px); }
  60%     { transform: translateX(5px); }
  75%     { transform: translateX(-2px); }
}
.af-spin { animation: af-spin-anim 0.75s linear infinite; }
@keyframes af-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ══════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════ */
@media (max-width: 800px) {
  .af-left  { display: none; }
  .af-right { width: 100%; padding: 32px 20px; align-items: flex-start; padding-top: 52px; }
  .af-card  { max-width: 100%; padding: 28px 22px 24px; border-radius: 20px; }
  .af-mobile-logo { display: flex; }
  .af-mobile-features { display: block; }
  .af-card-title { font-size: 24px; }
}

@media (min-width: 801px) and (max-width: 1100px) {
  .af-left  { width: 50%; padding: 36px 40px; }
  .af-right { width: 50%; padding: 44px 28px; }
  .af-card  { padding: 32px 26px 28px; }
  .af-h1    { font-size: 34px; }
  .af-feature-desc { display: none; }
  .af-features { gap: 6px; }
}
`;
